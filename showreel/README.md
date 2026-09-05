# Marken OS — showreel

Sixty seconds at 1920×1080, 30fps. Source for `out/marken-os-showreel.mp4`.

## Running

`node_modules` is a junction to the Navicane Remotion install, so there is
nothing to install here. If that folder moves, run `npm install` instead.

```bash
npm run dev      # Remotion Studio
npm run render   # full quality
npm run preview  # half scale, fast
```

Port 3000 is often taken by the app's dev server, which Remotion will bundle
against by mistake. Pass `--port=39411` if a render reports "not a valid
Remotion project".

## Structure

- `src/marken/theme.ts` — palette and scene timings, both lifted from the app's
  own token layer. Scene boundaries sum to exactly 1800 frames.
- `src/marken/fonts.ts` — loads Manrope. Naming the face in theme.ts without
  loading it here silently renders a system fallback.
- `src/marken/icons.tsx` — technology marks, hand-drawn SVG.
- `src/marken/scenes/` — one file per scene.
- `public/shots/` — captured with headless Chrome. `login.png` is from the
  deployed site; the rest are from a local harness rendering the same
  components, because those routes sit behind auth.

Shots are cropped by aspect ratio rather than height — the captures are 1600px
wide with content ending around 800px, so a ~2:1 frame lands the crop at the
end of the content.
