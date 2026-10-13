# Episode folder

Copy `_template/` → `episodes/<code>-<short-name>/` (e.g. `B04-selections`).
Drop every raw clip into `raw/`. Claude fills in `episode.json`.

## episode.json fields

| Field | What it does |
|---|---|
| `slug` | Output file name |
| `hook` | Text in the white box for the first `hook_seconds` |
| `clips` | **A-roll, in order.** `in`/`out` trim (seconds). `fit`: `crop` (default) or `blur` for horizontal footage. `speed` optional. |
| `trim_silence` | Cut pauses + "umm/uh" from A-roll (default `true`). Per-clip override allowed. |
| `broll` | Laid over the A-roll. Place with `on_word` (first time that word is spoken) or `at` (seconds in the final cut). `dur`, `in`, `speed`, `fit` optional. Muted. |
| `text` | Pop-up text. `on_word` or `at`, plus `dur`. |
| `music` | Path in the episode folder or under `content-system/`. Ducked under voice. |
| `cta` | End card line. Falls back to `brand.json` `default_cta`. |
| `end_card` | `false` to skip the end card |
| `cover_at` | Second to grab the cover image from |
| `post.caption` / `post.hashtags` | Written to `out/<slug>-caption.txt` |

Captions come from auto-transcription (faster-whisper). No whisper? Put a `captions.srt` in the folder.
