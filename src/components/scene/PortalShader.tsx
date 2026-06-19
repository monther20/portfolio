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
  uniform float uScale;
  varying vec2 vUv;

  // Simplex 2D noise
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
    vec2 p = vUv - 0.5;
    
    // Correct aspect ratio for circular ripples
    vec2 aspectP = p;
    aspectP.y *= 12.0 / 8.0; 
    
    // Distort UVs to create a turbulent, fluid water surface
    vec2 distortedUv = aspectP;
    distortedUv.x += snoise(aspectP * 3.0 + uTime * 0.4) * 0.04;
    distortedUv.y += snoise(aspectP * 3.0 - uTime * 0.3) * 0.04;
    
    float dist = length(distortedUv);
    
    // Color Palette: Gritty, monochromatic, dark inky water to match the room's sketch vibe
    vec3 deepWater = vec3(0.02, 0.02, 0.03); // Very dark, grimy ink/liquid
    vec3 brightReflection = vec3(0.7, 0.7, 0.75); // Silver/White sketchy highlight
    vec3 midTone = vec3(0.15, 0.15, 0.2);
    
    // Water caustics / surface waves
    float waves = snoise(distortedUv * 15.0 - uTime * 1.0) * 0.5 + 0.5;
    float secondaryWaves = snoise(distortedUv * 8.0 + uTime * 0.8) * 0.5 + 0.5;
    
    // Swirling vortex effect towards the center
    float angle = atan(distortedUv.y, distortedUv.x);
    float vortexSpin = (1.0 - uScale) * 15.0; // Fast spin when opening
    float swirl = sin(angle * 4.0 + dist * 15.0 - uTime * 3.0 + vortexSpin) * 0.5 + 0.5;
    
    // Composite the liquid texture
    vec3 finalColor = mix(deepWater, midTone, secondaryWaves);
    finalColor = mix(finalColor, brightReflection, waves * swirl * 0.4);
    
    // Sketched glowing edge (the expanding circular ripple when it opens)
    float rimDist = length(aspectP); // Use undistorted distance for a clean outer mask
    
    // To fill the entire 8x12 rectangular plane, the circular mask must grow 
    // to cover the corners. The max distance is sqrt(0.5^2 + 0.75^2) ≈ 0.9
    float maxRadius = 1.0;
    
    // The glowing rim rides along the expanding edge of the portal
    float edgeGlow = smoothstep((maxRadius - 0.1) * uScale, (maxRadius - 0.02) * uScale, rimDist);
    // Add noise to the edge so it looks rough and drawn
    float edgeNoise = snoise(aspectP * 25.0 + uTime) * 0.5 + 0.5;
    finalColor += brightReflection * edgeGlow * edgeNoise * 0.8;
    
    // Blinding splash/flash at the center when it opens
    float core = smoothstep(0.08 * uScale, 0.0, rimDist);
    finalColor += vec3(1.0) * core * uScale * 2.5;
    
    // The main portal mask expands to maxRadius, completely uncovering the rectangular plane
    float portalEdge = smoothstep(maxRadius * uScale, (maxRadius - 0.05) * uScale, rimDist);
    
    // Add a dark vignette towards the outer bounds so it blends deeply into the door frame
    finalColor *= smoothstep(maxRadius * uScale, (maxRadius - 0.4) * uScale, rimDist);

    gl_FragColor = vec4(finalColor, portalEdge);
  }
`;

export default function PortalShader({ 
  position = [0, 0, 0], 
  isOpen = false 
}: { 
  position?: [number, number, number], 
  isOpen?: boolean 
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const scaleRef = useRef(0.001); // Start virtually invisible

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Animate scale up when door is clicked
      if (isOpen) {
        scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1.0, delta * 2.0);
      }
      
      materialRef.current.uniforms.uScale.value = scaleRef.current;
    }
  });

  return (
    <mesh position={position}>
      {/* Scaled slightly larger to completely cover the door void */}
      <planeGeometry args={[8, 12]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uScale: { value: 0.001 },
        }}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}
