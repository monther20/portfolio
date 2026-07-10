"use client";

/**
 * RoomDebugGui — barrel for the room debug panel, split into focused modules:
 *   roomDebug/types.ts       — debug state types + tuple/clone helpers
 *   roomDebug/state.ts       — createRoomDebugState defaults
 *   roomDebug/guiControls.ts — shared lil-gui controller builders
 *   roomDebug/gui.ts         — the useRoomDebugGui hook
 */
export * from "./roomDebug/types";
export * from "./roomDebug/state";
export * from "./roomDebug/gui";
