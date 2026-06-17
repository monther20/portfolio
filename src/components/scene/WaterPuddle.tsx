"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  // Simple 2D simplex noise function
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Center the UVs
    vec2 centeredUv = vUv - 0.5;
    
    // Distance from center to create a circular base
    float dist = length(centeredUv);
    
    // Distort the circle using noise to make an organic, irregular puddle shape.
    // The uTime creates a very slow, subtle shifting edge (evaporation/flow).
    float noiseVal = snoise(centeredUv * 3.0 + uTime * 0.15);
    
    // Define the puddle edge based on the noise
    float edge = 0.35 + noiseVal * 0.12;
    
    // Smoothstep creates a soft but defined water edge
    float alpha = smoothstep(edge + 0.03, edge, dist);
    
    if(alpha < 0.01) discard; // Throw away pixels completely outside the puddle

    // Color: Dark ink/water to match the gritty black-and-white sketch style.
    // Adding subtle shimmering ripples using a faster, scaled noise.
    float shimmer = snoise(centeredUv * 15.0 - uTime * 0.4) * 0.5 + 0.5;
    
    // Base puddle color (deep, dark, dirty water/ink)
    vec3 puddleColor = vec3(0.06, 0.06, 0.08);
    
    // Highlight color (shiny, wet reflection)
    vec3 highlightColor = vec3(0.25, 0.25, 0.3);
    
    // Mix the base color with the highlight based on the shimmer and alpha mask
    vec3 finalColor = mix(puddleColor, highlightColor, shimmer * 0.4 * alpha);

    // Render with 85% opacity so the underlying floor sketch faintly shows through the water
    gl_FragColor = vec4(finalColor, alpha * 0.85);
  }
`;

export default function WaterPuddle() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Animation temporarily disabled
  /*
  useFrame((state) => {
    if (materialRef.current) {
      // Update the uniform time every frame for the shader animations
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  */

  return (
    // Pushed closer to the right wall (wall is at x=8) and near the drain
    <mesh position={[6.5, -5.99, -13.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.5, 3.5]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 42.0 }, // Fixed static time for a random shape
        }}
        transparent={true}
        depthWrite={false} // Prevents transparent sorting issues with the floor
      />
    </mesh>
  );
}
