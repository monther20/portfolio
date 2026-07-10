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
    "I build playful, interactive web experiences with React, Three.js and motion.",
    "I love turning ideas into things you can click, drag, scroll and explore.",
    "Currently crafting 3D, animation-rich interfaces for memorable digital products.",
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
    blurb: "A polished web project focused on clean interactions, responsive UI and product storytelling.",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/monetuneprzod.webp`, painted: `${GALLERY_BASE}/monetuneprzod_painted.webp` },
  },
  {
    name: "TimberKitty",
    blurb: "A playful interactive build combining character, motion and front-end craft.",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/timberkittyprzod.webp`, painted: `${GALLERY_BASE}/timberkittyprzod_painted.webp` },
  },
  {
    name: "YoungMulti",
    blurb: "A modern digital experience with bold visuals, smooth transitions and engaging UI.",
    link: "#",
    panel: { sketch: `${GALLERY_BASE}/youngmultiprzod.webp`, painted: `${GALLERY_BASE}/youngmultiprzod_painted.webp` },
  },
  {
    name: "Bio",
    blurb: "A personal profile-style project designed to present identity and links in a compact experience.",
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
  linkedin: "", // add your LinkedIn url — the beach crate opens this
  twitter: "", // add your X / Twitter url
};

// ── CORRIDOR ─────────────────────────────────────────────────────────────────
const CORRIDOR_BASE = "/textures/textures/corridor";
const GALLERY_LOGO = (name: string, paintedName = name): PaintPair => ({
  sketch: `${GALLERY_BASE}/${name}.webp`,
  painted: `${GALLERY_BASE}/${paintedName}_painted.webp`,
});

/**
 * Everything shown inside the entrance corridor: the avatar greeting, the
 * floating doodads around him, and the info stations along the walls.
 * All copy is PLACEHOLDER — edit freely.
 */
export const corridor = {
  greeting: about.greeting,
  tagline: about.tagline,
  /** Small hand-drawn doodles floating around the avatar. */
  doodles: [
    `${CORRIDOR_BASE}/decorations/coffee_cup.webp`,
    `${CORRIDOR_BASE}/decorations/pencil.webp`,
    `${CORRIDOR_BASE}/decorations/idea_process.webp`,
    `${CORRIDOR_BASE}/decorations/while_true_loop.webp`,
    `${CORRIDOR_BASE}/decorations/paper_ball.webp`,
  ],
  /** Tech logos floating near the avatar (sketch + painted pairs). */
  logos: [GALLERY_LOGO("reactlogo"), GALLERY_LOGO("jslogo"), GALLERY_LOGO("csslogo", "css3logo")],
  /** Info stations along the corridor walls. PLACEHOLDER text. */
  stations: [
    {
      title: "Who am I",
      lines: [
        "Placeholder — a short line about who I am.",
        "I turn ideas into playful, interactive experiences.",
      ],
      side: -1 as const, // left wall
      art: `${CORRIDOR_BASE}/rysuneknaobraz1.webp`,
    },
    {
      title: "What I do",
      lines: [
        "Placeholder — front-end, 3D and motion work.",
        "React · Three.js · GSAP · Next.js",
      ],
      side: 1 as const, // right wall
      art: `${CORRIDOR_BASE}/rysuneknaobrazek3.webp`,
    },
  ],
  /** The note beside the window at the end of the corridor. PLACEHOLDER. */
  windowNote: "…and this is where\nthe journey takes off ✈",
};

// ── JOURNEY (sky section) ────────────────────────────────────────────────────
export type JourneyMilestone = {
  year: string;
  title: string;
  text: string;
  /** optional island artwork floating beside the note */
  island?: string;
};

/** Milestones shown floating in the sky right after the window. PLACEHOLDER. */
export const journeyMilestones: JourneyMilestone[] = [
  {
    year: "20XX",
    title: "Started out",
    text: "Placeholder — where my story begins.",
    island: `${ABOUT_BASE}/uowyspa.webp`,
  },
  {
    year: "20XX",
    title: "Freelancing",
    text: "Placeholder — building for clients and learning fast.",
    island: `${ABOUT_BASE}/freelancewyspa.webp`,
  },
  {
    year: "Now",
    title: "Crafting 3D webs",
    text: "Placeholder — interactive, animation-rich interfaces.",
  },
];
