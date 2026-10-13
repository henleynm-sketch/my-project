# Henley Content System

**Built by Henley:** one Instagram series showing what we build and how we build it.
You film. Claude edits. Adem reviews and posts.

## How it works

```
 1. PLAN       Pick the episode from the calendar           calendar.csv
 2. FILM       Follow the shot list (vertical, 4K, mic on)  02-shot-lists.md
 3. DROP       Put raw clips in the episode folder          see "Drop-off" below
 4. EDIT       Claude writes episode.json + runs the pipeline
                 → reel.mp4 + cover.jpg + caption.txt
 5. REVIEW     Nick/Adem watch it. Notes → Claude re-cuts (minutes)
 6. POST       Adem schedules. Never auto-posted.
```

## The files

| File | What it is |
|---|---|
| `01-series-plan.md` | **The 4 series + every episode**, mapped to our SOP stages |
| `02-shot-lists.md` | **What to film** for each episode + filming rules |
| `03-edit-style.md` | **How the reels look** — hook, captions, pacing, end card |
| `calendar.csv` | 12-week posting calendar (2 reels/week + stories) |
| `brand.json` | Colours, font, handle, CTA, hashtags — the pipeline reads this |
| `episodes/_template/` | Copy this for each new episode |
| `pipeline/reel.py` | **The editor.** Raw clips → finished reel |

## Drop-off (where your footage goes)

One folder per episode. Name it with the episode code from the calendar:

```
episodes/
  B04-selections/
    raw/            ← every clip from your phone goes here, untouched
    notes.txt       ← optional: "best take is the 2nd one", "use the window delivery"
```

- **Don't trim, rename or edit clips.** Dump everything. Claude picks the takes.
- **Raw footage is never committed to git** (it's in `.gitignore`).
  The shared copy lives on SharePoint: `Marketing/Content/Raw Footage/<episode code>/`.

## What the editor does automatically

- **Cuts dead air and "umm / uh"** out of talking clips
- **Word-by-word captions**, current word highlighted
- **Hook text** on screen for the first 3 seconds
- **B-roll dropped on a keyword** (e.g. show the footing pour when you say "foundation")
- Horizontal clips → vertical (crop or blurred fill)
- Music ducked under your voice, loudness set to Instagram's -14 LUFS
- **End card** with CTA + handle
- Cover frame + post caption file

## Running it

```bash
pip install -r pipeline/requirements.txt   # once; needs ffmpeg installed
python3 pipeline/reel.py episodes/B04-selections
```

Output lands in `episodes/B04-selections/out/`.

## Hard rules

- **Never auto-post.** Every reel gets a human yes before it goes out.
- **Client release signed** before their home, face or name appears.
- **No house numbers, street signs or licence plates** in frame.
- **No pricing, margin or markup on camera.** Ranges only if Nick says so.
- **No unsafe site footage.** No missing fall protection, hard hats or boots on active sites — it's an MOL/WSIB risk, not just a bad look.
