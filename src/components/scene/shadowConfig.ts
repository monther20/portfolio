export interface ShadowConfig {
  table: {
    x: number;
    y: number;
    z: number;
    scale: number;
    maxOpacity: number;
  };
  chair: {
    x: number;
    y: number;
    z: number;
    scale: number;
    maxOpacity: number;
  };
}

export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  table: { x: -7.15, y: -4.45, z: -18.85, scale: 4.55, maxOpacity: 0.62 },
  chair: { x: -9.35, y: -4.05, z: -15.49, scale: 4.65, maxOpacity: 0.68 },
};
