# Monther Abdelrazek Portfolio

An interactive 3D portfolio built with Next.js, React Three Fiber, Three.js, Drei, GSAP, Tailwind CSS, and TypeScript.

The site opens in a hand-drawn hallway scene. After clicking the door, the camera moves into a scroll-driven 3D journey with About, Skills, Projects, and Contact sections.

## Getting started

```bash
bun dev
# or
npm run dev
```

Open http://localhost:3000.

A plain Next.js development server does not emulate Netlify Forms. Use the
Netlify CLI (`netlify dev`) when you need to test the complete submission flow
locally, or verify it on a deploy preview.

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

The visible 3D form sends URL-encoded fields to `/__forms.html`. It now shows
accessible submitting, accepted, and failure states; the paper-airplane send
animation starts only after Netlify returns a successful response. A successful
UI state confirms Netlify accepted the request, while the Forms dashboard is
the source of truth for stored delivery.

## Main customization points

- `src/data/portfolio.ts` — edit portfolio content: about text, skills, projects, contact links, and texture paths.
- `src/app/layout.tsx` — edit site metadata such as title, description, author, and creator.
- `src/components/scene/JourneyScene.tsx` — adjust section positions along the 3D scroll path.
- `src/app/page.tsx` — controls the Canvas, loader, room scene, HUD, and background asset preloader.
- `src/app/globals.css`, `src/app/loading.tsx` — customize the sketch-style loading screen.

## Project structure

```txt
src/app/                       Next.js app route files and global CSS
src/components/scene/           3D room, door, camera, sprites, HUD, and interactions
src/components/scene/sections/  About, Skills, Projects, and Contact sections
src/data/portfolio.ts           Editable portfolio data
public/models/                  GLB models (shared flat directory)
public/environments/            HDR environment maps
public/fonts/                   Scene fonts and their licenses
public/textures/                Hand-drawn and painted assets grouped by scene
public/__forms.html             Netlify Forms detection and submission endpoint
```

Model and environment URLs are centralized in `src/components/scene/assetPaths.ts`.
`public/models/chair-table.glb` is the original furniture export; the site loads
`chair-table.meshopt.glb` instead. Keep asset filenames URL-friendly (no spaces).

## Notes

Before working on Next.js APIs in this project, read the local Next.js docs under `node_modules/next/dist/docs/` because this project uses a newer Next.js version with breaking changes.
