# Manufacturing process diagrams (Manim)

Source for the three process-explainer videos used by the Manufacturing Process Picker
(`apps/web/components/manufacturing/process-diagram.tsx`). These are offline-rendered once and
checked into `apps/web/public/manufacturing/*.mp4` — the Next.js app has no runtime dependency on
Python or Manim.

## Setup (one-time)

```
brew install ffmpeg pkg-config pango
python3.12 -m venv tools/manim/.venv
source tools/manim/.venv/bin/activate
pip install manim
```

## Regenerate a video after editing a scene

```
source tools/manim/.venv/bin/activate
export PATH="/opt/homebrew/bin:$PATH"
cd tools/manim
manim -qh scenes/casting_scene.py CastingScene      # or MachiningScene / WeldingScene
cp media/videos/casting_scene/1080p60/CastingScene.mp4 ../../apps/web/public/manufacturing/casting.mp4
```

Use `-ql` (480p15) while iterating for fast renders, `-qh` (1080p60) for the final asset.
