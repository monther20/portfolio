"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Float, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

import AnimatedAvatar from "../AnimatedAvatar";
import PaintSprite from "../PaintSprite";
import { CORRIDOR } from "../journeyConfig";
import { useFogFade } from "../useFogFade";
import { corridor } from "@/data/portfolio";

const HANDWRITTEN_FONT = "/fonts/Caveat-Variable.ttf";
const NAME_Y = -1.25;
const NAME_Z = -0.22;
const ROLE_Y = -2.12;
const ROLE_Z = 0.22;
const corridorGreeterMotionSettings = {
  splitStartDistance: 6,
  splitTravelDistance: 4.5,
  avatarExitX: -2.2,
  nameHalfExitX: 1.15,
  roleJoinX: 0.22,
  roleJoinGap: 0.05,
  roleHalfExitX: 1.4,
} as const;

const FLOATING_ITEMS = [
  {
    label: "Pencil",
    texture: corridor.doodles[0],
    position: [1.8037, 0.8988, 0.2453] as [number, number, number],
    height: 0.727,
    speed: 1.6127,
    rotationIntensity: 0.25,
    floatIntensity: 0.5,
    floatingRange: [-0.15, 0.15] as [number, number],
    revealNear: 7,
    revealFar: 16,
  },
  {
    label: "While True Loop",
    texture: corridor.doodles[1],
    position: [-1.29, -1.03, -0.2967] as [number, number, number],
    height: 0.6423,
    speed: 1.5422,
    rotationIntensity: 0.25,
    floatIntensity: 0.5,
    floatingRange: [-0.15, 0.15] as [number, number],
    revealNear: 7,
    revealFar: 16,
  },
] as const;

type GreeterTextHalfProps = {
  name: string;
  children: string;
  anchorX: "left" | "right";
  fontSize: number;
  color: string;
  renderOrder: number;
  letterSpacing?: number;
};

/** One independently moving half of a greeter label. */
function GreeterTextHalf({
  name,
  children,
  anchorX,
  fontSize,
  color,
  renderOrder,
  letterSpacing = 0,
}: GreeterTextHalfProps) {
  return (
    <Text
      name={name}
      font={HANDWRITTEN_FONT}
      fontSize={fontSize}
      fontWeight={700}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      textAlign={anchorX}
      letterSpacing={letterSpacing}
      sdfGlyphSize={128}
      frustumCulled={false}
      renderOrder={renderOrder}
    >
      {children}
      <meshBasicMaterial
        color={color}
        transparent
        depthTest
        depthWrite={false}
        fog
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </Text>
  );
}

/**
 * The centered corridor introduction. Scrolling toward it moves the avatar to
 * the left and parts both text lines so the camera can continue through.
 */
export default function CorridorGreeter() {
  const avatarRef = useRef<THREE.Group>(null);
  const nameLeftRef = useRef<THREE.Group>(null);
  const nameRightRef = useRef<THREE.Group>(null);
  const roleLeftRef = useRef<THREE.Group>(null);
  const roleRightRef = useRef<THREE.Group>(null);
  const splitProgress = useRef(0);
  const { camera } = useThree();

  useFogFade(nameLeftRef, { preserveTransparency: true, visibleThreshold: 0 });
  useFogFade(nameRightRef, { preserveTransparency: true, visibleThreshold: 0 });
  useFogFade(roleLeftRef, { preserveTransparency: true, visibleThreshold: 0 });
  useFogFade(roleRightRef, { preserveTransparency: true, visibleThreshold: 0 });

  useFrame((_, delta) => {
    const settings = corridorGreeterMotionSettings;
    const distancePastStart =
      CORRIDOR.avatar.z + settings.splitStartDistance - camera.position.z;
    const targetProgress = THREE.MathUtils.smoothstep(
      distancePastStart,
      0,
      settings.splitTravelDistance,
    );
    const damping = 1 - Math.pow(0.025, delta);
    splitProgress.current = THREE.MathUtils.lerp(
      splitProgress.current,
      targetProgress,
      damping,
    );
    const progress = THREE.MathUtils.smootherstep(splitProgress.current, 0, 1);

    if (avatarRef.current) {
      avatarRef.current.position.x = settings.avatarExitX * progress;
    }
    if (nameLeftRef.current) {
      nameLeftRef.current.position.x = -settings.nameHalfExitX * progress;
    }
    if (nameRightRef.current) {
      nameRightRef.current.position.x = settings.nameHalfExitX * progress;
    }
    if (roleLeftRef.current) {
      roleLeftRef.current.position.x = THREE.MathUtils.lerp(
        settings.roleJoinX - settings.roleJoinGap / 2,
        -settings.roleHalfExitX,
        progress,
      );
    }
    if (roleRightRef.current) {
      roleRightRef.current.position.x = THREE.MathUtils.lerp(
        settings.roleJoinX + settings.roleJoinGap / 2,
        settings.roleHalfExitX,
        progress,
      );
    }
  });

  return (
    <group name="Corridor Greeter" position={[CORRIDOR.avatar.x, 0, CORRIDOR.avatar.z]}>
      {/* The large name sits behind the avatar in real WebGL depth. */}
      <group ref={nameLeftRef} name="Greeter Name Left Half" position={[0, NAME_Y, NAME_Z]}>
        <GreeterTextHalf
          name="Greeter Name MON"
          anchorX="right"
          fontSize={1.55}
          color="#2b2b2b"
          renderOrder={-1}
          letterSpacing={0.015}
        >
          MON
        </GreeterTextHalf>
      </group>
      <group ref={nameRightRef} name="Greeter Name Right Half" position={[0, NAME_Y, NAME_Z]}>
        <GreeterTextHalf
          name="Greeter Name THER"
          anchorX="left"
          fontSize={1.55}
          color="#2b2b2b"
          renderOrder={-1}
          letterSpacing={0.015}
        >
          THER
        </GreeterTextHalf>
      </group>

      <group ref={avatarRef} name="Corridor Centered Avatar">
        <AnimatedAvatar position={[0, -1.85, 0]} height={2.7} fps={28} />
      </group>

      {/* The smaller role line sits in front of the avatar. */}
      <group
        ref={roleLeftRef}
        name="Greeter Role Left Half"
        position={[
          corridorGreeterMotionSettings.roleJoinX -
            corridorGreeterMotionSettings.roleJoinGap / 2,
          ROLE_Y,
          ROLE_Z,
        ]}
      >
        <GreeterTextHalf
          name="Greeter Role Web and Mobile"
          anchorX="right"
          fontSize={0.48}
          color="#57524a"
          renderOrder={2}
        >
          web &amp; mobile
        </GreeterTextHalf>
      </group>
      <group
        ref={roleRightRef}
        name="Greeter Role Right Half"
        position={[
          corridorGreeterMotionSettings.roleJoinX +
            corridorGreeterMotionSettings.roleJoinGap / 2,
          ROLE_Y,
          ROLE_Z,
        ]}
      >
        <GreeterTextHalf
          name="Greeter Role Developer"
          anchorX="left"
          fontSize={0.48}
          color="#57524a"
          renderOrder={2}
        >
          developer
        </GreeterTextHalf>
      </group>

      {FLOATING_ITEMS.map((item) => (
        <Float
          key={item.label}
          name={`Greeter Doodle Float: ${item.label}`}
          speed={item.speed}
          rotationIntensity={item.rotationIntensity}
          floatIntensity={item.floatIntensity}
          floatingRange={item.floatingRange}
        >
          <PaintSprite
            name={`Greeter Doodle: ${item.label}`}
            sketch={item.texture}
            position={item.position}
            height={item.height}
            revealNear={item.revealNear}
            revealFar={item.revealFar}
          />
        </Float>
      ))}
    </group>
  );
}
