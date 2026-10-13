#!/usr/bin/env python3
"""Turn a folder of raw clips + episode.json into a finished 9:16 Instagram reel.

Usage:
    python3 reel.py ../episodes/E01-custom-homes
    python3 reel.py ../episodes/E01-custom-homes --no-captions --keep-temp

Needs ffmpeg on PATH. Auto-captions and silence trimming need `pip install faster-whisper`;
without it the reel still renders, using captions.srt from the episode folder if present.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H, FPS = 1080, 1920, 30
ROOT = Path(__file__).resolve().parent.parent
FILLER = re.compile(r"^(u+h*m+|u+h+|e+r+m*|a+h+|h+m+)$")


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{' '.join(map(str, cmd))}\n\n{proc.stderr[-3000:]}")
    return proc.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)])
    data = json.loads(out)
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return float(data["format"]["duration"]), has_audio


def load_brand():
    brand = json.loads((ROOT / "brand.json").read_text())
    for key in ("font_bold", "font_black"):
        brand[key] = str((ROOT / brand[key]).resolve()) if not os.path.isabs(brand[key]) else brand[key]
    if brand.get("logo"):
        logo = ROOT / brand["logo"]
        brand["logo"] = str(logo) if logo.exists() else None
    return brand


def ass_color(hex_rgb, alpha="00"):
    h = hex_rgb.lstrip("#")
    return f"&H{alpha}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def wrap(text, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        if line and len(line) + 1 + len(w) > width:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    if line:
        lines.append(line)
    return "\n".join(lines)


# ---------- transcription ----------

_model = None


def transcribe(path):
    global _model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None
    if _model is None:
        _model = WhisperModel(os.environ.get("WHISPER_MODEL", "base.en"), device="cpu", compute_type="int8")
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    segments, _ = _model.transcribe(audio, word_timestamps=True, vad_filter=True)
    return [
        {"start": w.start, "end": w.end, "word": w.word.strip()}
        for seg in segments
        for w in (seg.words or [])
        if w.word.strip()
    ]


def is_filler(word):
    return bool(FILLER.match(re.sub(r"[^a-z]", "", word.lower())))


def speech_ranges(words, duration, pad=0.12, max_gap=0.45, drop_fillers=True):
    kept = [w for w in words if not (drop_fillers and is_filler(w["word"]))]
    ranges = []
    for w in kept:
        start, end = max(0.0, w["start"] - pad), min(duration, w["end"] + pad)
        if ranges and start - ranges[-1][1] <= max_gap:
            ranges[-1][1] = max(ranges[-1][1], end)
        else:
            ranges.append([start, end])
    return [(s, e) for s, e in ranges if e - s > 0.2]


# ---------- clip normalisation ----------

def frame_filter(fit):
    if fit == "blur":
        return (
            f"split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:2,eq=brightness=-0.08[bg];"
            f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    return f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"


def normalise(src, dst, start, end, fit="crop", mute=False, speed=1.0):
    _, has_audio = probe(src)
    vf = f"[0:v]{frame_filter(fit)},setsar=1,fps={FPS},format=yuv420p"
    if speed != 1.0:
        vf += f",setpts=PTS/{speed}"
    vf += "[v]"
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(src)]
    if has_audio and not mute:
        af = "[0:a]aresample=48000,aformat=channel_layouts=stereo"
        if speed != 1.0:
            af += f",atempo={speed}"
        graph = f"{vf};{af}[a]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        graph = f"{vf};[1:a]anull[a]"
    cmd += ["-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-t", f"{(end - start) / speed:.3f}",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(dst)]
    run(cmd)


def concat(parts, dst, tmp):
    listing = tmp / f"{dst.stem}-list.txt"
    listing.write_text("".join(f"file '{p}'\n" for p in parts))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(dst)])


# ---------- captions ----------

def caption_chunks(words, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in words:
        if is_filler(w["word"]):
            continue
        cur.append(w)
        text = " ".join(x["word"] for x in cur)
        if len(cur) >= max_words or len(text) >= max_chars or re.search(r"[.,!?;:]$", w["word"]):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def ass_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_escape(text):
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


def write_ass(words, dst, brand, uppercase=True):
    style = (
        f"Style: Cap,{Path(brand['font_black']).stem.replace('-', ' ')},{brand['caption_size']},"
        f"{ass_color(brand['caption_color'])},{ass_color(brand['caption_color'])},{ass_color('#000000')},"
        f"{ass_color('#000000', '80')},-1,0,0,0,100,100,0,0,1,7,2,2,60,60,{brand['caption_margin_bottom']},1"
    )
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
        "MarginR, MarginV, Encoding",
        style, "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    hi = ass_color(brand["accent"])
    for chunk in caption_chunks(words):
        for i, w in enumerate(chunk):
            start = w["start"]
            end = chunk[i + 1]["start"] if i + 1 < len(chunk) else w["end"] + 0.15
            parts = []
            for j, x in enumerate(chunk):
                word = ass_escape(x["word"].upper() if uppercase else x["word"])
                parts.append(f"{{\\c{hi}}}{word}{{\\r}}" if j == i else word)
            lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{' '.join(parts)}")
    dst.write_text("\n".join(lines) + "\n")


def srt_to_words(srt):
    words = []
    for block in re.split(r"\n\s*\n", srt.strip()):
        rows = block.strip().splitlines()
        if len(rows) < 3:
            continue
        m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", rows[1])
        if not m:
            continue
        g = list(map(int, m.groups()))
        start = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
        end = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
        tokens = " ".join(rows[2:]).split()
        step = (end - start) / max(1, len(tokens))
        words += [{"start": start + i * step, "end": start + (i + 1) * step, "word": t} for i, t in enumerate(tokens)]
    return words


# ---------- overlays ----------

def drawtext(textfile, brand, y, size, boxed, enable=None):
    opts = [
        f"fontfile='{brand['font_black']}'", f"textfile='{textfile}'", "expansion=none",
        f"fontsize={size}", "line_spacing=14", "text_align=C", "x=(w-text_w)/2", f"y={y}",
    ]
    if boxed:
        opts += [f"fontcolor={brand['hook_text']}", "box=1", f"boxcolor={brand['hook_box']}", "boxborderw=28"]
    else:
        opts += ["fontcolor=white", "borderw=6", "bordercolor=black"]
    if enable:
        opts.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(opts)


def find_word_time(words, needle, after=0.0):
    target = re.sub(r"[^a-z0-9]", "", needle.lower())
    for w in words:
        if w["start"] >= after and re.sub(r"[^a-z0-9]", "", w["word"].lower()) == target:
            return w["start"]
    return None


def end_card(ep, brand, dst, tmp):
    dur = ep.get("end_card_seconds", 3.0)
    cta = tmp / "cta.txt"
    cta.write_text(wrap(ep.get("cta", brand["default_cta"]), 20))
    handle = tmp / "handle.txt"
    handle.write_text(brand["handle"])
    inputs = ["-f", "lavfi", "-i", f"color=c={brand['end_card_bg']}:s={W}x{H}:r={FPS}:d={dur}",
              "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={dur}"]
    chain = "[0:v]"
    if brand.get("logo"):
        inputs += ["-loop", "1", "-t", str(dur), "-i", brand["logo"]]
        chain = f"[2:v]scale=640:-1[lg];[0:v][lg]overlay=(W-w)/2:520[bg];[bg]"
    chain += (
        f"{drawtext(cta, brand, '(h-text_h)/2+120', 72, boxed=False)},"
        f"{drawtext(handle, brand, 'h-560', 54, boxed=False)},"
        f"fade=t=in:st=0:d=0.3,format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", chain, "-map", "[v]", "-map", "1:a",
         "-t", str(dur), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(dst)])


# ---------- main ----------

def build(ep_dir, use_captions=True, keep_temp=False):
    ep_dir = Path(ep_dir).resolve()
    ep = json.loads((ep_dir / "episode.json").read_text())
    brand = load_brand()
    raw = ep_dir / ep.get("raw_dir", "raw")
    out_dir = ep_dir / "out"
    out_dir.mkdir(exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="reel-"))
    slug = ep.get("slug", ep_dir.name)

    print(f"▸ {slug}: normalising {len(ep['clips'])} A-roll clips")
    parts = []
    for i, clip in enumerate(ep["clips"]):
        src = raw / clip["file"]
        dur, _ = probe(src)
        start, end = clip.get("in", 0.0), min(clip.get("out", dur), dur)
        base = tmp / f"a{i:02d}.mp4"
        normalise(src, base, start, end, clip.get("fit", "crop"), speed=clip.get("speed", 1.0))
        if clip.get("trim_silence", ep.get("trim_silence", True)):
            words = transcribe(base)
            if words:
                ranges = speech_ranges(words, end - start)
                for k, (s, e) in enumerate(ranges):
                    seg = tmp / f"a{i:02d}-{k:03d}.mp4"
                    normalise(base, seg, s, e)
                    parts.append(seg)
                print(f"  {clip['file']}: {end - start:.1f}s → {sum(e - s for s, e in ranges):.1f}s after silence trim")
                continue
        parts.append(base)

    aroll = tmp / "aroll.mp4"
    concat(parts, aroll, tmp)
    total, _ = probe(aroll)

    words = transcribe(aroll) if use_captions else None
    srt = ep_dir / "captions.srt"
    if use_captions and not words and srt.exists():
        words = srt_to_words(srt.read_text())
    if words:
        (out_dir / "transcript.txt").write_text(" ".join(w["word"] for w in words) + "\n")

    inputs = ["-i", str(aroll)]
    graph, last = [], "[0:v]"
    for j, b in enumerate(ep.get("broll", [])):
        at = b.get("at")
        if at is None and b.get("on_word") and words:
            at = find_word_time(words, b["on_word"])
        if at is None:
            print(f"  ! skipped B-roll {b['file']} (no 'at' and word '{b.get('on_word')}' not found)")
            continue
        bdur = b.get("dur", 2.5)
        bsrc = raw / b["file"]
        bfile = tmp / f"b{j:02d}.mp4"
        src_dur, _ = probe(bsrc)
        bin_ = b.get("in", 0.0)
        normalise(bsrc, bfile, bin_, min(src_dur, bin_ + bdur * b.get("speed", 1.0)), b.get("fit", "crop"),
                  mute=True, speed=b.get("speed", 1.0))
        inputs += ["-itsoffset", f"{at:.3f}", "-i", str(bfile)]
        n = inputs.count("-i") - 1
        graph.append(f"{last}[{n}:v]overlay=eof_action=pass:enable='between(t,{at:.3f},{at + bdur:.3f})'[o{j}]")
        last = f"[o{j}]"

    vf = []
    hook = ep.get("hook")
    if hook:
        hf = tmp / "hook.txt"
        hf.write_text(wrap(hook, 18))
        vf.append(drawtext(hf, brand, brand["hook_y"], brand["hook_size"], True, f"lt(t,{ep.get('hook_seconds', 3.0)})"))
    for k, t in enumerate(ep.get("text", [])):
        tf = tmp / f"t{k}.txt"
        tf.write_text(wrap(t["text"], 20))
        at = t.get("at")
        if at is None and t.get("on_word") and words:
            at = find_word_time(words, t["on_word"])
        if at is not None:
            vf.append(drawtext(tf, brand, brand["hook_y"], 64, True, f"between(t,{at:.3f},{at + t.get('dur', 2.5):.3f})"))
    if words:
        ass = tmp / "captions.ass"
        write_ass(words, ass, brand, ep.get("caption_uppercase", True))
        fontsdir = str(Path(brand["font_black"]).parent)
        vf.append(f"ass='{ass}':fontsdir='{fontsdir}'")
    vf.append("format=yuv420p")
    graph.append(f"{last}{','.join(vf)}[v]")

    main = tmp / "main.mp4"
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(graph), "-map", "[v]", "-map", "0:a",
         "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "copy", str(main)])

    sequence = [main]
    if ep.get("end_card", True):
        card = tmp / "card.mp4"
        end_card(ep, brand, card, tmp)
        sequence.append(card)
    joined = tmp / "joined.mp4"
    concat(sequence, joined, tmp)
    length, _ = probe(joined)

    final = out_dir / f"{slug}.mp4"
    music = ep.get("music")
    if music:
        mpath = (ep_dir / music) if (ep_dir / music).exists() else ROOT / music
        vol = ep.get("music_volume", 0.18)
        audio = (
            f"[1:a]aresample=48000,volume={vol},afade=t=out:st={max(0, length - 1.5):.2f}:d=1.5[m];"
            f"[0:a]asplit[v1][v2];[m][v2]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md];"
            f"[v1][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        )
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(joined), "-stream_loop", "-1", "-i", str(mpath),
               "-filter_complex", audio, "-map", "0:v", "-map", "[a]"]
    else:
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(joined), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
    run(cmd + ["-t", f"{length:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-profile:v", "high",
               "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(final)])

    cover_at = ep.get("cover_at", 0.8)
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(cover_at), "-i", str(final), "-frames:v", "1", "-q:v", "2",
         str(out_dir / f"{slug}-cover.jpg")])

    post = ep.get("post", {})
    caption = post.get("caption", "").strip()
    tags = " ".join(post.get("hashtags", brand.get("hashtags", [])))
    (out_dir / f"{slug}-caption.txt").write_text(f"{caption}\n\n{tags}\n".lstrip())

    if keep_temp:
        print(f"  temp files kept in {tmp}")
    else:
        shutil.rmtree(tmp)
    print(f"✓ {final.relative_to(ep_dir.parent)}  ({length:.1f}s)")
    return final


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("episodes", nargs="+", help="episode folder(s) containing episode.json")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--keep-temp", action="store_true")
    args = ap.parse_args()
    for e in args.episodes:
        build(e, use_captions=not args.no_captions, keep_temp=args.keep_temp)
