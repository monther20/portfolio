const CORRIDOR_TEXTURE_BASE = "/textures/corridor";
const CONTACT_TEXTURE_BASE = "/textures/contact";
const CLOUD_TEXTURE_BASE = "/textures/journey/clouds";

const AVATAR_FRAME_COUNT = 33;
export const AVATAR_FRAME_URLS = Array.from(
  { length: AVATAR_FRAME_COUNT },
  (_, index) => `${CORRIDOR_TEXTURE_BASE}/avatar_anim_warp/${String(index + 1).padStart(3, "0")}.png`,
);

const CLOUD_TEXTURE_FILES = [
  "1131c3eb-dfae-423f-924b-ff39d8ccd6dc",
  "254b8ec8-d6f7-4275-956f-7bab65b2ce2d",
  "2cc88dd1-483c-466d-b07e-f8308c61ccbe",
  "5606fcc0-3252-447d-a58a-7bcbac73229a",
  "7882dc72-3d01-41fb-ac0e-d07b0184ebc1",
  "9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35",
  "c83293c6-d90c-4a32-8d9d-5ac9af7e2296",
  "f6e358bc-d27c-41dd-95f4-6787a835c41e",
] as const;

export const CLOUD_TEXTURE_URLS = CLOUD_TEXTURE_FILES.map((file) => `${CLOUD_TEXTURE_BASE}/${file}.webp`);

export type ContactButtonKey = "message" | "github" | "linkedin";

export const CONTACT_BUTTON_TEXTURES: Record<ContactButtonKey, string> = {
  message: `${CONTACT_TEXTURE_BASE}/maillink.webp`,
  github: `${CONTACT_TEXTURE_BASE}/githublink.webp`,
  linkedin: `${CONTACT_TEXTURE_BASE}/linkedinlink.webp`,
};

export const CONTACT_TEXTURES = {
  waves: `${CONTACT_TEXTURE_BASE}/faletopdown.webp`,
  lighthouse: `${CONTACT_TEXTURE_BASE}/latarnia.webp`,
  ship: `${CONTACT_TEXTURE_BASE}/statek.webp`,
  /** Reuse the hand-drawn floor grain as monochrome pier timber. */
  boardwalkWood: `${CORRIDOR_TEXTURE_BASE}/floor_wood.webp`,
} as const;

export const CORRIDOR_TEXTURES = {
  base: CORRIDOR_TEXTURE_BASE,
  floor: `${CORRIDOR_TEXTURE_BASE}/floor_wood.webp`,
  wall: `${CORRIDOR_TEXTURE_BASE}/wall_texture.webp`,
  ceiling: `${CORRIDOR_TEXTURE_BASE}/ceiling_texture.webp`,
} as const;
