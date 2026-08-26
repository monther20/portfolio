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
type PaintPair = {
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

// ── SKILLS ─────────────────────────────────────────────────────────────────
export type Skill = {
  label: string;
  balloon: PaintPair;
  size: "S" | "M" | "L";
};

/** Skill badge images from public/textures/skills. */
export const skills: Skill[] = [
  { label: "React.js / React Native", size: "L", balloon: SKILL_BADGE("reactduzybalon") },
  { label: "Next.js", size: "L", balloon: SKILL_BADGE("nextjssrednibalon") },
  { label: "TypeScript", size: "M", balloon: SKILL_BADGE("csssrednibalon") },
  { label: "Tailwind CSS", size: "M", balloon: SKILL_BADGE("tailwind") },
  { label: "React Query", size: "M", balloon: SKILL_BADGE("reactquery") },
  { label: "Node.js", size: "M", balloon: SKILL_BADGE("nodejs") },
  { label: "Three.js / WebGL", size: "M", balloon: SKILL_BADGE("threejsduzybalon") },
  {
    label: "React Three Fiber",
    size: "M",
    balloon: SKILL_BADGE("reactthreefiber"),
  },
];

// ── PROJECTS ─────────────────────────────────────────────────────────────────
export type Project = {
  name: string;
  /** LIVE url — replace "#" with the real link to enable the "open live project" button */
  link: string;
  /** front panel artwork */
  panel: PaintPair;
  tech?: string[];
  description?: string;
  bullets?: string[];
};

export const projects: Project[] = [
  {
    name: "Reachlet",
    link: "#",
    panel: PROJECT_PANEL("reachlet"),
    tech: ["React Native", "Mixpanel", "Sentry"],
    description:
      "Mobile frontend for an advertising display app that presents products through dynamic image and video content.",
    bullets: [
      "Built auto-scrolling image and video ads with QR-code integration for external links.",
      "Integrated Mixpanel analytics and Sentry production error monitoring.",
      "Implemented automatic hotspot activation and in-app internet/connectivity controls.",
    ],
  },
  {
    name: "eZorro",
    link: "#",
    panel: PROJECT_PANEL("ezorro"),
    tech: ["React", "AI Chat", "Market Research"],
    description:
      "AI-powered market research and portfolio analysis platform for self-directed investors.",
    bullets: [
      "Built responsive interfaces for AI chat, portfolio insights, and market research workflows.",
      "Implemented real-time chat with streaming AI responses.",
      "Created interactive reports for strategy backtesting, alternative data, and brokerage-connected portfolio analysis.",
    ],
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
  phone: "+962 78 086 2010",
  github: "https://github.com/monther20",
  portfolio: "https://montheraloufi-portfolio.netlify.app",
  location: "Amman, Jordan",
  linkedin: "", // not listed in the current CV
};

// ── CORRIDOR ─────────────────────────────────────────────────────────────────
/**
 * Everything shown inside the entrance corridor: the avatar greeting, the
 * floating doodads around him, and the info stations along the walls.
 */
export const corridor = {
  greeting: "Hi, I'm Monther 👋",
  tagline: "Frontend Developer | React & React Native",
  /** Small hand-drawn doodles floating around the avatar. */
  doodles: [
    `${CORRIDOR_BASE}/decorations/pencil.webp`,
    `${CORRIDOR_BASE}/decorations/while_true_loop.webp`,
  ],
  /** Info stations along the corridor walls. */
  stations: [
    {
      title: "Who am I",
      lines: [
        "Frontend developer based in Amman, Jordan.",
        "I build responsive web, mobile, and interactive applications with React, Next.js, React Native, TypeScript, and Three.js.",
      ],
      side: -1 as const, // left wall
      art: `${CORRIDOR_BASE}/profile.png`,
    },
    {
      title: "What I build",
      lines: [
        "AI-powered market tools, advertising-display mobile apps, and scroll-based 3D portfolio experiences.",
      ],
      side: 1 as const, // right wall
      art: `${CORRIDOR_BASE}/web-mobile-3d-corridor-sketch.webp`,
    },
  ],
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
    year: "2027",
    title: "B.Sc. Computer Science @ JUST",
    text: "Expected graduation from Jordan University of Science and Technology.",
    island: `${JOURNEY_MILESTONES_BASE}/justwyspa.webp`,
  },
  {
    year: "2023–2025",
    title: "Frontend Freelancer @ AlphaWorks",
    text: "Built the Reachlet React Native mobile frontend for dynamic advertising displays with QR links, analytics, monitoring, and connectivity controls.",
    island: `${JOURNEY_MILESTONES_BASE}/freelancewyspa.webp`,
  },
  {
    year: "Jul–Nov 2025",
    title: "Frontend Trainee @ AlphaWorks",
    text: "Developed eZorro React features for AI chat, portfolio insights, market research workflows, streaming responses, and interactive backtesting reports.",
    island: `${JOURNEY_MILESTONES_BASE}/alphaworkswyspa.webp`,
  },
];
