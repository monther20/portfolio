# Monther Abdelrazek Portfolio

An interactive 3D portfolio built with Next.js, React Three Fiber, Three.js, Drei, GSAP, Tailwind CSS, and TypeScript.

The experience opens at a hand-drawn entrance. After opening the door, the camera follows a responsive, scroll-driven route through the corridor, sky, and coastal boardwalk, with About, Journey, Skills, Projects, and Contact stops. A persistent day/night mode changes the lighting and atmosphere across the entire route.

## Getting started

This repository uses Bun. The deployment runtime versions are pinned in
`netlify.toml`.

```bash
bun install
bun dev
```

Open http://localhost:3000.

A plain Next.js development server does not emulate Netlify Forms. Use the
Netlify CLI (`netlify dev`) when you need to test the complete submission flow
locally, or verify it on a deploy preview.

## Controls

- Click or tap the door to enter; keyboard users can press **Enter** or **Space** while the 3D view is focused.
- Scroll, swipe, or use the arrow keys to travel. The section navigation can jump directly to each portfolio stop.
- Click or tap a lantern or corridor light, press **N**, or use the on-screen switch after entering to toggle day and night.

The experience adapts framing and rendering quality for phones, tablets, and desktops, respects reduced-motion preferences, and provides a contact fallback when WebGL 2 is unavailable.

## Deploy to Netlify

Netlify is the intentional production target because the contact letter uses
Netlify Forms. `netlify.toml` pins the Bun build and Next.js publish directory;
Netlify installs its current Next.js adapter automatically.

1. Push the repository to GitHub and import it in Netlify with **Add new
   project → Import an existing project**.
2. Confirm the detected settings are `bun run build` and `.next`, then deploy.
3. In the Netlify project UI, open **Forms**, enable form detection if needed,
   and redeploy so Netlify detects the hidden `contact` form in
   `public/__forms.html`.
4. Submit a test message from a production deploy or deploy preview. Confirm it
   appears under **Forms → contact → Verified submissions**.
5. Add a form-submission email or webhook notification in Netlify's project
   notification settings so new messages are monitored outside the dashboard.

The visible 3D form sends URL-encoded fields to `/__forms.html`. It shows
accessible submitting, accepted, and failure states; the paper-airplane send
animation starts only after Netlify returns a successful response. A successful
UI state confirms Netlify accepted the request, while the Forms dashboard is
the source of truth for stored delivery.

## Main customization points

- `src/data/portfolio.ts` — edit profile copy, milestones, skills, projects, contact links, and content texture paths.
- `src/app/layout.tsx` — edit site metadata such as title, description, author, and creator.
- `src/components/scene/journeyConfig.ts` — adjust the camera timeline, corridor layout, and section anchors.
- `src/components/scene/sectionNavigation.ts` — adjust navigation stops and labels.
- `src/components/scene/dayNight/config.ts` — tune day/night colors, lighting, stars, and transitions. See `docs/day-night.md` for the full system.
- `src/components/ResponsiveExperience.tsx` — tune responsive layouts, quality tiers, DPR limits, and reduced-motion behavior.
- `src/app/page.tsx` — controls the Canvas, entrance loader, room scene, and page-level HUD.
- `src/components/scene/journeyLoading.ts` — defines ordered background stages and safe camera limits while they prepare.
- `src/components/SketchPreloader.tsx`, `src/app/loading.tsx`, and `src/app/globals.css` — customize the sketch-style loading UI.

## Loading flow

The initial sketch loader waits for the entrance-critical scene, lightweight
corridor shell, web fonts, and the avatar's single texture atlas. Hidden corridor
details mount after the visitor opens the door. The loader exits with a short
transition and has no minimum display time. The fully colored door and
keyboard-accessible entry action are then immediately usable; door color does
not represent loading progress.

Later scenes mount in travel order behind separate `JourneyAssetStage` boundaries.
Their real components load assets on demand, avoiding a duplicate preload manifest.
Fast scrolling stops before unready content; section jumps wait in place and resume
when the route is ready. Visitors can cancel a queued jump by scrolling or choosing
another section. A small status notice appears only when loading is actually in
their way; a failed background scene leaves the ready sections usable.

## Project structure

```txt
src/app/                              Next.js route files and global CSS
src/components/scene/                 3D scene orchestration, camera, HUD, and interactions
src/components/scene/corridor/        Corridor geometry, stations, fixtures, and props
src/components/scene/dayNight/        Shared day/night state, lighting, sky, and effects
src/components/scene/sections/        Journey, Skills, Projects, and Contact scenes
src/components/scene/sections/beach/  Coastal contact scene details
src/data/portfolio.ts                  Editable portfolio data
public/models/                         GLB models in a shared flat directory
public/environments/                   HDR environment maps
public/fonts/                          Scene fonts and licenses
public/textures/                       Hand-drawn and painted assets grouped by scene
public/__forms.html                    Netlify Forms detection and submission endpoint
scripts/                               Deterministic asset-generation scripts
tests/                                 Bun unit and source-contract tests
```

Model and environment URLs are centralized in `src/components/scene/assetPaths.ts`.
`public/models/chair-table.glb` is the original furniture export; the site loads
`chair-table.meshopt.glb` instead. Keep asset filenames URL-friendly (no spaces).
The corridor light GLBs can be regenerated with
`node scripts/generate-corridor-lights.mjs`.

## Validation

Run these checks sequentially before shipping:

```bash
./node_modules/.bin/tsc --noEmit --incremental false --pretty false
bun test tests
bun run build
```

## Notes

Before working on Next.js APIs in this project, read the local Next.js docs under `node_modules/next/dist/docs/` because this project uses a newer Next.js version with breaking changes.
