/**
 * portfolio.ts — ALL editable content for the scroll-journey lives here.
 *
 * This file has been filled from Monther Abdelrazek's CV: profile, skills,
 * experience/projects, education milestones, and contact details.
 */

const CORRIDOR_BASE = "/textures/corridor";
const JOURNEY_MILESTONES_BASE = "/textures/journey/milestones";
const PROJECTS_BASE = "/textures/projects";
const SKILLS_BASE = "/textures/skills";

/** A sprite that has a hand-drawn sketch and a coloured "painted" variant. */
export type PaintPair = {
  /** monochrome / line-art texture shown before reveal */
  sketch: string;
  /** full-colour texture cross-faded in on approach / hover (optional) */
  painted?: string;
};

const SKILL_BADGE = (fileName: string): PaintPair => ({
  sketch: `${SKILLS_BASE}/${fileName}.webp`,
  painted: `${SKILLS_BASE}/${fileName}_painted.webp`,
});

const PROJECT_PANEL = (fileName: string): PaintPair => ({
  sketch: `${PROJECTS_BASE}/${fileName}.webp`,
  painted: `${PROJECTS_BASE}/${fileName}_painted.webp`,
});

// ── ABOUT ──────────────────────────────────────────────────────────────────
export const about = {
  name: "Monther Abdelrazek",
  /** First line shown floating around the avatar when you come through the door. */
  greeting: "Hi, I'm Monther 👋",
  tagline: "Junior Front-end Engineer",
  /** Each string becomes a floating handwritten note in the About section. Edit freely. */
  blurbs: [
    "Computer Science student at Jordan University of Science and Technology (JUST).",
    "I build responsive web and mobile interfaces using React, React Native, and Next.js.",
    "Recently completed a graduate trainee program at Alphaworks after freelancing there since 2023.",
  ],
  /** Decorative "islands" already in your assets — set show:false to hide. */
  islands: [
    { tex: `${JOURNEY_MILESTONES_BASE}/uowyspa.webp`, label: "Computer Science @ JUST", show: true },
    { tex: `${JOURNEY_MILESTONES_BASE}/freelancewyspa.webp`, label: "Alphaworks Front-end", show: true },
  ],
};

// ── SKILLS ─────────────────────────────────────────────────────────────────
export type Skill = { label: string; balloon: PaintPair; size: "S" | "M" | "L" };

/** Skill badge images from public/textures/skills. */
export const skills: Skill[] = [
  { label: "React.js", size: "L", balloon: SKILL_BADGE("reactduzybalon") },
  { label: "Next.js", size: "L", balloon: SKILL_BADGE("nextjssrednibalon") },
  { label: "Tailwind CSS", size: "M", balloon: SKILL_BADGE("tailwind") },
  { label: "React Query", size: "M", balloon: SKILL_BADGE("reactquery") },
  { label: "Node.js", size: "M", balloon: SKILL_BADGE("nodejs") },
  { label: "CSS", size: "S", balloon: SKILL_BADGE("csssrednibalon") },
  { label: "Three.js", size: "M", balloon: SKILL_BADGE("threejsduzybalon") },
  { label: "React Three Fiber", size: "M", balloon: SKILL_BADGE("reactthreefiber") },
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
    name: "Reachlet",
    blurb: "React Native mobile frontend for an advertisement display app with dynamic multimedia content, auto-scrolling image/video ads, and QR-code external links.",
    link: "#",
    panel: PROJECT_PANEL("reachlet"),
  },
  {
    name: "eZorro",
    blurb: "Financial trading platform frontend using React with real-time market analysis, portfolio management, AI-powered trading assistance, streaming chat, and interactive dashboards.",
    link: "#",
    panel: PROJECT_PANEL("ezorro"),
  },
];

/** Shared gallery UI sprites for the project papers. */
export const projectUI = {
  paperTexture: `${PROJECTS_BASE}/paper-texture.webp`,
  openLive: `${PROJECTS_BASE}/openliveproject.webp`,
};

// ── CONTACT ──────────────────────────────────────────────────────────────────
export const contact = {
  email: "monther.abdelrazek@gmail.com",
  phone: "+962 780862010",
  location: "Amman, Jordan",
  github: "https://github.com/monther20",
  linkedin: "", // add your LinkedIn url when available
  twitter: "", // add your X / Twitter url when available
};

// ── CORRIDOR ─────────────────────────────────────────────────────────────────
/**
 * Everything shown inside the entrance corridor: the avatar greeting, the
 * floating doodads around him, and the info stations along the walls.
 */
export const corridor = {
  greeting: about.greeting,
  tagline: about.tagline,
  /** Small hand-drawn doodles floating around the avatar. */
  doodles: [
    `${CORRIDOR_BASE}/decorations/pencil.webp`,
    `${CORRIDOR_BASE}/decorations/while_true_loop.webp`,
  ],
  /** Optional tech logos floating near the avatar (sketch + painted pairs). */
  logos: [] as PaintPair[],
  /** Info stations along the corridor walls. */
  stations: [
    {
      title: "Who am I",
      lines: [
        "Computer Science student based in Amman, Jordan.",
        "Passionate about frontend development and intuitive user experiences.",
      ],
      side: -1 as const, // left wall
      art: `${CORRIDOR_BASE}/rysuneknaobraz1.webp`,
    },
    {
      title: "What I build",
      lines: [
        "Responsive web and mobile interfaces with React and React Native.",
        "Real-time dashboards, streaming chat, Kanban workflows, and polished UI motion.",
      ],
      side: 1 as const, // right wall
      art: `${CORRIDOR_BASE}/rysuneknaobrazek3.webp`,
    },
  ],
  /** The note beside the window at the end of the corridor. */
  windowNote: "from code to\ncollaboration ✈",
};

// ── JOURNEY (sky section) ────────────────────────────────────────────────────
export type JourneyMilestone = {
  year: string;
  title: string;
  text: string;
  /** optional island artwork floating beside the note */
  island?: string;
};

/** Milestones shown floating in the sky right after the window. */
export const journeyMilestones: JourneyMilestone[] = [
  {
    year: "2020–Present",
    title: "Computer Science @ JUST",
    text: "Studying Computer Science at Jordan University of Science and Technology.",
    island: `${JOURNEY_MILESTONES_BASE}/uowyspa.webp`,
  },
  {
    year: "2023–2025",
    title: "Alphaworks Frontend",
    text: "Frontend freelancer, then graduate trainee/intern from 07/2025 to 11/2025.",
    island: `${JOURNEY_MILESTONES_BASE}/freelancewyspa.webp`,
  },
  {
    year: "Now",
    title: "Junior Front-end Engineer",
    text: "Focused on responsive UI, mobile experiences, real-time features, and interactive 3D web work.",
  },
];
