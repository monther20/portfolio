import { BEACH } from "../../journeyConfig";

/** Shared by the pier and its post-mounted decorations; never lane-scaled. */
export const BOARDWALK_POSITION: [number, number, number] = [0, -0.39, -1.72];
export const BOARDWALK_END_Z = BEACH.boardwalk.endZ - 5;
export const BOARDWALK_POST_WIDTH = 0.2;
export const BOARDWALK_POST_HEIGHT = 1.75;

export function boardwalkPostRows() {
  const zPositions: number[] = [];
  for (let z = BEACH.boardwalk.startZ - 0.65; z >= BOARDWALK_END_Z; z -= 3.35) {
    zPositions.push(z);
  }
  const railX = BEACH.boardwalk.width / 2 - 0.08;
  return {
    zPositions,
    sides: [BEACH.boardwalk.x - railX, BEACH.boardwalk.x + railX],
  };
}

export function lastBoardwalkPosts() {
  const rows = boardwalkPostRows();
  return {
    leftX: rows.sides[0] + BOARDWALK_POSITION[0],
    rightX: rows.sides[1] + BOARDWALK_POSITION[0],
    topY: BEACH.boardwalk.topY - 0.34 + BOARDWALK_POST_HEIGHT / 2 + BOARDWALK_POSITION[1],
    z: rows.zPositions[rows.zPositions.length - 1] + BOARDWALK_POSITION[2],
  };
}
