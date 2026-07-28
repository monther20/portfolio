"use client";

import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useResponsiveExperience } from "../ResponsiveExperience";

/** Keeps the scene framed after resize and orientation changes. */
export default function ResponsiveCamera() {
  const camera = useThree((state) => state.camera);
  const { cameraFov } = useResponsiveExperience();

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    camera.fov = cameraFov;
    camera.updateProjectionMatrix();
  }, [camera, cameraFov]);

  return null;
}
