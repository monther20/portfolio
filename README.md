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

## Deploy to Render

The repository includes a production `Dockerfile` and a Render Blueprint in
`render.yaml`. The image uses the locked Bun dependencies to build a minimal
Next.js standalone server, then runs it with Node.js on Render's expected port.

1. Push the repository to GitHub.
2. In Render, select **New → Blueprint**.
3. Connect this repository and approve the `monther-portfolio` service.
4. After the first deploy passes its `/` health check, open the generated
   `onrender.com` URL or attach a custom domain in the service settings.

Subsequent pushes to the connected branch deploy automatically. No Render
build or start commands need to be entered manually because the Blueprint uses
the included Docker image.

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
public/textures/                Hand-drawn and painted scene assets
```

## Notes

Before working on Next.js APIs in this project, read the local Next.js docs under `node_modules/next/dist/docs/` because this project uses a newer Next.js version with breaking changes.
