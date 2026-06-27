/**
 * portfolio.ts — ALL editable content for the scroll-journey lives here.
 *
 * This is the one file you edit to make the portfolio yours:
 *   • `about`      — your name + bio lines (shown as floating handwritten text)
 *   • `skills`     — the floating skill balloons (texture + label)
 *   • `projects`   — the project papers (texture + blurb + LIVE LINK)
 *   • `contact`    — your email + social links (the contact pier)
 *
 * Texture keys map to files already in /public/textures/textures/…
 * Most sprites ship as a `sketch` + `_painted` pair; the scene starts as the
 * pencil sketch and "paints in" the colour version as the camera approaches.
 */

const ABOUT_BASE = "/textures/textures/about";
const GALLERY_BASE = "/textures/textures/gallery";

/** A sprite that has a hand-drawn sketch and a coloured "painted" variant. */
export type PaintPair = {
  /** monochrome / line-art texture shown before reveal */
  sketch: string;
  /** full-colour texture cross-faded in on approach / hover (optional) */
  painted?: string;
};

// ── ABOUT ──────────────────────────────────────────────────────────────────
export const about = {
  name: "Munther Aloufi",
  /** First line shown floating around the avatar when you come through the door. */
  greeting: "Hi, I'm Munther 👋",
  tagline: "Creative front-end & 3D web developer",
  /** Each string becomes a floating handwritten note in the About section. Edit freely. */
  blurbs: [
    "I build playful, interactive web experiences.",
    "I love turning ideas into things you can click, drag and explore.",
    "Currently crafting 3D & motion-rich interfaces.",
  ],
  /** Decorative "islands" already in your assets — set show:false to hide. */
  islands: [
    { tex: `${ABOUT_BASE}/uowyspa.webp`, label: "Studied @ University", show: true },
    { tex: `${ABOUT_BASE}/freelancewyspa.webp`, label: "Freelancing", show: true },
  ],
};

// ── SKILLS ─────────────────────────────────────────────────────────────────
export type Skill = { label: string; balloon: PaintPair; size: "S" | "M" | "L" };

/** Balloon sizes baked into the artwork: maly=small, sredni=medium, duzy=large. */
export const skills: Skill[] = [
  { label: "React",    size: "L", balloon: { sketch: `${ABOUT_BASE}/reactduzybalon.webp`,   painted: `${ABOUT_BASE}/reactduzybalon_painted.webp` } },
  { label: "Three.js", size: "L", balloon: { sketch: `${ABOUT_BASE}/threejsduzybalon.webp`, painted: `${ABOUT_BASE}/threejsduzybalon_painted.webp` } },
  { label: "GSAP",     size: "L", balloon: { sketch: `${ABOUT_BASE}/GSAPduzybalon.webp`,     painted: `${ABOUT_BASE}/GSAPduzybalon_painted.webp` } },
  { label: "Next.js",  size: "M", balloon: { sketch: `${ABOUT_BASE}/nextjssrednibalon.webp`, painted: `${ABOUT_BASE}/nextjssrednibalon_painted.webp` } },
  { label: "JavaScript", size: "M", balloon: { sketch: `${ABOUT_BASE}/JSSREDNIBALON.webp`,   painted: `${ABOUT_BASE}/JSSREDNIBALON_painted.webp` } },
  { label: "CSS",      size: "M", balloon: { sketch: `${ABOUT_BASE}/csssrednibalon.webp`,    painted: `${ABOUT_BASE}/csssrednibalon_painted.webp` } },
  { label: "HTML",     size: "S", balloon: { sketch: `${ABOUT_BASE}/htmlmalybalon.webp`,     painted: `${ABOUT_BASE}/htmlmalybalon_painted.webp` } },
  { label: "Git",      size: "S", balloon: { sketch: `${ABOUT_BASE}/gitmalybalon.webp`,      painted: `${ABOUT_BASE}/gitmalybalon_painted.webp` } },
  { label: "Firebase", size: "S", balloon: { sketch: `${ABOUT_BASE}/firebasemalybalon.webp`, painted: `${ABOUT_BASE}/firebasemalybalon_painted.webp` } },
  { label: "Figma",    size: "S", balloon: { sketch: `${ABOUT_BASE}/figmamalybalon.webp`,    painted: `${ABOUT_BASE}/figmamalybalon_painted.webp` } },
];

// ── PROJECTS ─────────────────────────────────────────────────────────────────
export type Project = {
  name: string;
  /** one-line description shown when the paper flies up to the camera */
  blurb: string;
  /** LIVE url — replace "#" with the real link to enable the "open live project" button */
  link: string;
  /** front panel artwork */
  panel: PaintPair;
};

export const projects: Project[] = [
  {
    name: "Monetune",
    blurb: "— replace with a one-line description of Monetune —",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/monetuneprzod.webp`, painted: `${GALLERY_BASE}/monetuneprzod_painted.webp` },
  },
  {
    name: "TimberKitty",
    blurb: "— replace with a one-line description of TimberKitty —",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/timberkittyprzod.webp`, painted: `${GALLERY_BASE}/timberkittyprzod_painted.webp` },
  },
  {
    name: "YoungMulti",
    blurb: "— replace with a one-line description of YoungMulti —",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/youngmultiprzod.webp`, painted: `${GALLERY_BASE}/youngmultiprzod_painted.webp` },
  },
  {
    name: "Bio",
    blurb: "— replace with a one-line description of this project —",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/bioprzod.webp`, painted: `${GALLERY_BASE}/bioprzod_painted.webp` },
  },
];

/** Shared gallery UI sprites for the project papers. */
export const projectUI = {
  paperTexture: "/textures/textures/paper-texture.webp",
  openLive: `${GALLERY_BASE}/openliveproject.webp`,
  clip: `${GALLERY_BASE}/klamerka.webp`,
};

// ── CONTACT ──────────────────────────────────────────────────────────────────
export const contact = {
  email: "haloufi@quratehealth.com",
  github: "https://github.com/monther20",
  linkedin: "", // add your LinkedIn url
  twitter: "", // add your X / Twitter url
};
