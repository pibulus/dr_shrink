# PNG → mascot art pipeline

Turn a subject-on-plain-background PNG (like `drshrink.png`) into a
`mascot-paths.svg` for the portable mascot system. We trace only the **outer
silhouette** and reuse the engine's eyes + animated gradient.

Requires: `imagemagick` (`magick`), `potrace`, `node`.

## Steps

```bash
SRC=~/Desktop/drshrink.png
T=/tmp/mascot-art

mkdir -p $T

# 1. Flood-fill the (plain) background to white, make the subject solid black.
#    Border trick floods from all edges; tune -fuzz to the bg separation.
magick "$SRC" \
  -bordercolor "srgb(252,254,243)" -border 2 \
  -fuzz 20% -fill magenta -draw "color 0,0 floodfill" \
  -shave 2x2 \
  -fuzz 5% -fill white -opaque magenta \
  -fill black +opaque white \
  $T/mask.png

# 2. Crop to the subject, scale to ~940px inside a centered 1024 canvas.
magick $T/mask.png -alpha off \
  -crop $(magick $T/mask.png -negate -format "%@" info:) +repage \
  -resize 940x940 -background white -gravity center -extent 1024x1024 \
  -threshold 50% $T/outer.pbm

# 3. Eroded copy for the inner contour → chunky outline (Disk radius = thickness).
magick $T/outer.pbm -negate -morphology Erode Disk:22 -negate $T/inner.pbm

# 4. Trace both. --turdsize drops tiny speckles (interior detail).
potrace $T/outer.pbm -s -o $T/outer.svg --turdsize 150 --alphamax 1 --opttolerance 0.4
potrace $T/inner.pbm -s -o $T/inner.svg --turdsize 150 --alphamax 1 --opttolerance 0.4

# 5. Flatten potrace's transform into 1024-space coords + assemble mascot-paths.svg
#    (body = outer+inner even-odd ring; background = outer solid; eyes = ellipses)
node tools/flatten-potrace-path.mjs $T/outer.svg $T/inner.svg > src/lib/components/mascot/mascot-paths.svg
```

## Tuning

- **Outline thickness**: bigger `Erode Disk:N` = chunkier black outline.
- **Eye position/size**: edit the ellipse coords at the bottom of the generated
  `mascot-paths.svg` (viewBox 0 0 1024 1024; brain center ≈ 512,512). Eyes must
  stay separate paths for tracking + blink.
- **Interior detail** (e.g. the brain's head-mirror lens): lower `--turdsize` to
  keep it, raise to drop it. It rides along as extra subpaths in the body ring.
- **Accessory** (head-mirror as its own layer): trace it separately into
  `#mascot-accessory-path` and add an `{#if}` layer in `Mascot.svelte`.

The mascot engine supplies eyes, blink, eye-tracking, the animated gradient, and
personality — this pipeline only provides the silhouette shape.
