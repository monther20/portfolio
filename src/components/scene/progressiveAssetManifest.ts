import type { JourneyLoadStageId } from "./journeyLoading";
import type { JourneySectionId } from "./sectionNavigation";

export type ProgressiveArtworkAsset = {
  src: string;
  preview: string;
  width: number;
  height: number;
  section: JourneySectionId;
  stage: JourneyLoadStageId;
};

function artwork(
  src: string,
  width: number,
  height: number,
  section: JourneySectionId,
  stage: JourneyLoadStageId,
): ProgressiveArtworkAsset {
  return {
    src,
    preview: src.replace("/textures/", "/textures/previews/"),
    width,
    height,
    section,
    stage,
  };
}

/**
 * Large WebGL illustrations with generated 256px previews. Dimensions belong
 * to the final source and keep mesh geometry stable while quality changes.
 */
export const PROGRESSIVE_ARTWORK_ASSETS: readonly ProgressiveArtworkAsset[] = [
  artwork("/textures/corridor/profile.webp", 1254, 1254, "about", "corridor-far"),
  artwork("/textures/corridor/web-mobile-3d-corridor-sketch.webp", 1079, 816, "about", "corridor-far"),
  artwork("/textures/corridor/drzewkowdoniczce.webp", 800, 1600, "about", "corridor-far"),
  artwork("/textures/corridor/kratkawentylacyjna.webp", 1600, 800, "about", "corridor-far"),
  artwork("/textures/shared/table.webp", 1536, 1024, "about", "corridor-far"),
  artwork("/textures/corridor/ramkanazdjecieduza.webp", 1600, 800, "about", "corridor-far"),
  artwork("/textures/corridor/ramkanazdjecieduza_painted.webp", 1600, 800, "about", "corridor-far"),
  artwork("/textures/corridor/window/window_frame.webp", 611, 730, "about", "window"),
  artwork("/textures/corridor/window/window_left_side.webp", 370, 690, "about", "window"),
  artwork("/textures/corridor/window/window_right_side.webp", 370, 690, "about", "window"),

  artwork("/textures/journey/milestones/justwyspa.webp", 1448, 1086, "journey", "journey"),
  artwork("/textures/journey/milestones/freelancewyspa.webp", 1694, 928, "journey", "journey"),
  artwork("/textures/journey/milestones/alphaworkswyspa.webp", 1672, 941, "journey", "journey"),

  artwork("/textures/skills/reactduzybalon.webp", 512, 1024, "skills", "skills"),
  artwork("/textures/skills/reactduzybalon_painted.webp", 860, 1720, "skills", "skills"),
  artwork("/textures/skills/nextjssrednibalon.webp", 512, 1024, "skills", "skills"),
  artwork("/textures/skills/nextjssrednibalon_painted.webp", 839, 1679, "skills", "skills"),
  artwork("/textures/skills/csssrednibalon.webp", 512, 1024, "skills", "skills"),
  artwork("/textures/skills/csssrednibalon_painted.webp", 675, 1351, "skills", "skills"),
  artwork("/textures/skills/tailwind.webp", 880, 1788, "skills", "skills"),
  artwork("/textures/skills/tailwind_painted.webp", 880, 1788, "skills", "skills"),
  artwork("/textures/skills/reactquery.webp", 879, 1790, "skills", "skills"),
  artwork("/textures/skills/reactquery_painted.webp", 879, 1790, "skills", "skills"),
  artwork("/textures/skills/nodejs.webp", 880, 1788, "skills", "skills"),
  artwork("/textures/skills/nodejs_painted.webp", 880, 1787, "skills", "skills"),
  artwork("/textures/skills/threejsduzybalon.webp", 1024, 1024, "skills", "skills"),
  artwork("/textures/skills/threejsduzybalon_painted.webp", 512, 1024, "skills", "skills"),
  artwork("/textures/skills/reactthreefiber.webp", 880, 1788, "skills", "skills"),
  artwork("/textures/skills/reactthreefiber_painted.webp", 880, 1788, "skills", "skills"),

  artwork("/textures/projects/reachlet.webp", 1024, 2048, "projects", "projects"),
  artwork("/textures/projects/reachlet_painted.webp", 1024, 2048, "projects", "projects"),
  artwork("/textures/projects/ezorro.webp", 1024, 2048, "projects", "projects"),
  artwork("/textures/projects/ezorro_painted.webp", 1024, 2048, "projects", "projects"),
  artwork("/textures/projects/openliveproject.webp", 800, 267, "projects", "projects"),

  artwork("/textures/contact/maillink.webp", 1391, 1495, "contact", "contact"),
  artwork("/textures/contact/githublink.webp", 1393, 1494, "contact", "contact"),
];

const artworkBySource = new Map(
  PROGRESSIVE_ARTWORK_ASSETS.map((asset) => [asset.src, asset]),
);

export function getProgressiveArtworkAsset(
  src: string,
): ProgressiveArtworkAsset | undefined {
  return artworkBySource.get(src);
}

export function progressiveAssetsForSection(section: JourneySectionId) {
  return PROGRESSIVE_ARTWORK_ASSETS.filter((asset) => asset.section === section);
}

export function progressiveAssetsForStage(stage: JourneyLoadStageId) {
  return PROGRESSIVE_ARTWORK_ASSETS.filter((asset) => asset.stage === stage);
}
