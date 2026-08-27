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
  {
    label: "React / React Native",
    size: "L",
    balloon: SKILL_BADGE("reactduzybalon"),
  },
  {
    label: "Next.js / TypeScript",
    size: "L",
    balloon: SKILL_BADGE("nextjssrednibalon"),
  },
  { label: "CSS", size: "M", balloon: SKILL_BADGE("csssrednibalon") },
  { label: "Tailwind CSS", size: "M", balloon: SKILL_BADGE("tailwind") },
  { label: "React Query", size: "M", balloon: SKILL_BADGE("reactquery") },
  {
    label: "Node.js / API Integrations",
    size: "M",
    balloon: SKILL_BADGE("nodejs"),
  },
  {
    label: "Three.js / WebGL",
    size: "M",
    balloon: SKILL_BADGE("threejsduzybalon"),
  },
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
    link: "https://reachlet.com/",
    panel: PROJECT_PANEL("reachlet"),
    tech: ["React Native", "Mixpanel", "Sentry"],
    description:
      "React Native advertising display app with auto-scrolling image and video campaigns and QR-linked actions.",
    bullets: [
      "Developed auto-scrolling image and video campaigns with QR-linked actions.",
      "Integrated Mixpanel product analytics and Sentry production error monitoring.",
      "Built connectivity-aware controls, including automatic hotspot activation and in-app internet status management.",
    ],
  },
  {
    name: "eZorro",
    link: "https://ezorro.app/",
    panel: PROJECT_PANEL("ezorro"),
    tech: ["React", "AI Chat", "Market Research"],
    description:
      "AI-powered market research and portfolio analysis platform with responsive React interfaces.",
    bullets: [
      "Developed responsive React interfaces for AI-powered market research and portfolio analysis.",
      "Implemented real-time AI chat with streamed responses and clear loading and response states.",
      "Built interactive reports for strategy backtesting, alternative data research, and brokerage-connected portfolio analysis.",
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
  tagline: "Software Developer | React, Next.js, React Native & TypeScript",
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
        "Software developer  focused on responsive web and mobile products.",
        "I work with React, Next.js, React Native, and TypeScript.",
      ],
      side: -1 as const, // left wall
      art: `${CORRIDOR_BASE}/profile.png`,
    },
    {
      title: "What I build",
      lines: [
        "I also focus on web performance, internationalization, and API integrations.",
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
    text: "B.Sc. Computer Science in progress at Jordan University of Science and Technology; expected graduation in 2027.",
    island: `${JOURNEY_MILESTONES_BASE}/justwyspa.webp`,
  },
  {
    year: "2023–2025",
    title: "Reachlet · Frontend Freelancer",
    text: "Developed a React Native advertising display app with auto-scrolling campaigns, QR-linked actions, Mixpanel, Sentry, and connectivity-aware controls.",
    island: `${JOURNEY_MILESTONES_BASE}/freelancewyspa.webp`,
  },
  {
    year: "Jul–Nov 2025",
    title: "eZorro · Frontend Developer Trainee",
    text: "Developed responsive React interfaces, streamed AI chat responses, and interactive research and portfolio reports at AlphaWorks.",
    island: `${JOURNEY_MILESTONES_BASE}/alphaworkswyspa.webp`,
  },
];
