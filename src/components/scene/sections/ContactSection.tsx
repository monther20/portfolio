"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import PartingItem, { seededRange } from "../PartingItem";

import { contact } from "@/data/portfolio";

const C = "/textures/textures/contact";

type DebugSpriteItem = {
  visible?: boolean;
  x?: number;
  y?: number;
  z?: number;
  spriteX?: number;
  spriteY?: number;
  spriteZ?: number;
  scale?: number;
  height?: number;
  renderOrder?: number;
  push?: number;
  lift?: number;
  forward?: number;
  influenceDistance?: number;
  lerp?: number;
  floatSpeed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  floatMin?: number;
  floatMax?: number;
  revealNear?: number;
  revealFar?: number;
  hoverScale?: number;
};

type DebugSea = {
  visible?: boolean;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  depth?: number;
  renderOrder?: number;
  color?: string;
  opacity?: number;
};

type DebugHtml = {
  visible?: boolean;
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  width?: number;
  distanceFactor?: number;
  zIndexMax?: number;
  zIndexMin?: number;
};

type ContactSectionDebug = {
  sea?: DebugSea;
  lighthouse?: DebugSpriteItem;
  ship?: DebugSpriteItem;
  pier?: DebugSpriteItem;
  barrel?: DebugSpriteItem;
  card?: DebugSpriteItem;
  linksHtml?: DebugHtml;
  sendButton?: DebugSpriteItem;
};

function debugHome(debug: DebugSpriteItem | undefined, fallback: [number, number, number]): [number, number, number] {
  return [debug?.x ?? fallback[0], debug?.y ?? fallback[1], debug?.z ?? fallback[2]];
}

function debugSpritePosition(
  debug: DebugSpriteItem | undefined,
  fallback: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  return [debug?.spriteX ?? fallback[0], debug?.spriteY ?? fallback[1], debug?.spriteZ ?? fallback[2]];
}

function debugFloatingRange(
  debug: DebugSpriteItem | undefined,
  fallback: [number, number],
): [number, number] {
  const min = debug?.floatMin ?? fallback[0];
  const max = debug?.floatMax ?? fallback[1];
  return [Math.min(min, max), Math.max(min, max)];
}

/**
 * ContactSection — the journey ends at a little pier by the sea. A paper form
 * with a send button (opens your mail) plus clickable handwritten links.
 */
export default function ContactSection({
  zStart = -106,
  debug,
}: {
  zStart?: number;
  debug?: ContactSectionDebug;
}) {
  const waveTex = useLoader(THREE.TextureLoader, `${C}/faletopdown.webp`);
  const water = useMemo(() => {
    const t = waveTex.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.needsUpdate = true;
    return t;
  }, [waveTex]);

  useEffect(() => {
    waveTex.colorSpace = THREE.SRGBColorSpace;
    waveTex.needsUpdate = true;
  }, [waveTex]);

  const links: { label: string; href: string }[] = [
    { label: "✉  " + contact.email, href: `mailto:${contact.email}` },
    contact.github && { label: "↗  GitHub", href: contact.github },
    contact.linkedin && { label: "↗  LinkedIn", href: contact.linkedin },
    contact.twitter && { label: "↗  Twitter / X", href: contact.twitter },
  ].filter(Boolean) as { label: string; href: string }[];

  const openMail = (e: any) => {
    e.stopPropagation();
    window.location.href = `mailto:${contact.email}`;
  };

  const itemHomes = useMemo(() => ({
    lighthouse: [seededRange("contact-lighthouse-x", -6.4, -4.7), seededRange("contact-lighthouse-y", -0.25, 0.35), zStart - seededRange("contact-lighthouse-z", 7.2, 9.8)] as [number, number, number],
    ship: [seededRange("contact-ship-x", 3.5, 5.4), seededRange("contact-ship-y", -2.1, -1.4), zStart - seededRange("contact-ship-z", 5.2, 7.4)] as [number, number, number],
    pier: [seededRange("contact-pier-x", -2.1, -0.7), seededRange("contact-pier-y", -2.95, -2.45), zStart - seededRange("contact-pier-z", 1.4, 3.0)] as [number, number, number],
    barrel: [seededRange("contact-barrel-x", 1.7, 3.1), seededRange("contact-barrel-y", -2.95, -2.45), zStart - seededRange("contact-barrel-z", 0.4, 2.0)] as [number, number, number],
    card: [seededRange("contact-card-x", -0.45, 0.45), 0.3, zStart - seededRange("contact-card-z", 0.4, 1.4)] as [number, number, number],
  }), [zStart]);

  const sea = debug?.sea;
  const lighthouse = debug?.lighthouse;
  const ship = debug?.ship;
  const pier = debug?.pier;
  const barrel = debug?.barrel;
  const card = debug?.card;
  const linksHtml = debug?.linksHtml;
  const sendButton = debug?.sendButton;

  return (
    <group>
      {/* Sea */}
      {(sea?.visible ?? true) ? (
        <mesh
          position={[sea?.x ?? 0, sea?.y ?? -3.6, sea?.z ?? zStart - 8]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={sea?.renderOrder ?? 0}
        >
          <planeGeometry args={[sea?.width ?? 60, sea?.depth ?? 60]} />
          <meshBasicMaterial map={water} color={sea?.color ?? "#bcd3e0"} transparent opacity={sea?.opacity ?? 0.85} />
        </mesh>
      ) : null}

      {/* Scenery */}
      <PartingItem
        home={debugHome(lighthouse, itemHomes.lighthouse)}
        side={-1}
        push={lighthouse?.push ?? 2.9}
        lift={lighthouse?.lift ?? 0.45}
        forward={lighthouse?.forward ?? 0.45}
        influenceDistance={lighthouse?.influenceDistance ?? 9.5}
        lerp={lighthouse?.lerp ?? 0.09}
      >
        <group visible={lighthouse?.visible ?? true} scale={lighthouse?.scale ?? 1} renderOrder={lighthouse?.renderOrder ?? 0}>
          <Float
            speed={lighthouse?.floatSpeed ?? 1}
            rotationIntensity={lighthouse?.rotationIntensity ?? 0}
            floatIntensity={lighthouse?.floatIntensity ?? 0.3}
            floatingRange={debugFloatingRange(lighthouse, [-0.1, 0.15])}
          >
            <PaintSprite
              sketch={`${C}/latarnia.webp`}
              position={debugSpritePosition(lighthouse)}
              height={lighthouse?.height ?? 4.6}
              renderOrder={lighthouse?.renderOrder ?? 0}
              revealNear={lighthouse?.revealNear ?? 14}
              revealFar={lighthouse?.revealFar ?? 32}
            />
          </Float>
        </group>
      </PartingItem>

      <PartingItem
        home={debugHome(ship, itemHomes.ship)}
        side={1}
        push={ship?.push ?? 2.9}
        lift={ship?.lift ?? 0.45}
        forward={ship?.forward ?? 0.45}
        influenceDistance={ship?.influenceDistance ?? 9.5}
        lerp={ship?.lerp ?? 0.09}
      >
        <group visible={ship?.visible ?? true} scale={ship?.scale ?? 1} renderOrder={ship?.renderOrder ?? 0}>
          <Float
            speed={ship?.floatSpeed ?? 1.3}
            rotationIntensity={ship?.rotationIntensity ?? 0.1}
            floatIntensity={ship?.floatIntensity ?? 0.5}
            floatingRange={debugFloatingRange(ship, [-0.2, 0.2])}
          >
            <PaintSprite
              sketch={`${C}/statek.webp`}
              position={debugSpritePosition(ship)}
              height={ship?.height ?? 2.3}
              renderOrder={ship?.renderOrder ?? 0}
              revealNear={ship?.revealNear ?? 13}
              revealFar={ship?.revealFar ?? 28}
            />
          </Float>
        </group>
      </PartingItem>

      <PartingItem
        home={debugHome(pier, itemHomes.pier)}
        side={-1}
        push={pier?.push ?? 2.3}
        lift={pier?.lift ?? 0.35}
        forward={pier?.forward ?? 0.35}
        influenceDistance={pier?.influenceDistance ?? 9.5}
        lerp={pier?.lerp ?? 0.09}
      >
        <group visible={pier?.visible ?? true} scale={pier?.scale ?? 1} renderOrder={pier?.renderOrder ?? 0}>
          <PaintSprite
            sketch={`${C}/molo.webp`}
            position={debugSpritePosition(pier)}
            height={pier?.height ?? 1.8}
            renderOrder={pier?.renderOrder ?? 0}
            revealNear={pier?.revealNear ?? 12}
            revealFar={pier?.revealFar ?? 26}
          />
        </group>
      </PartingItem>

      <PartingItem
        home={debugHome(barrel, itemHomes.barrel)}
        side={1}
        push={barrel?.push ?? 2.3}
        lift={barrel?.lift ?? 0.35}
        forward={barrel?.forward ?? 0.35}
        influenceDistance={barrel?.influenceDistance ?? 9.5}
        lerp={barrel?.lerp ?? 0.09}
      >
        <group visible={barrel?.visible ?? true} scale={barrel?.scale ?? 1} renderOrder={barrel?.renderOrder ?? 0}>
          <PaintSprite
            sketch={`${C}/beczka.webp`}
            painted={`${C}/beczka_painted.webp`}
            position={debugSpritePosition(barrel)}
            height={barrel?.height ?? 1.2}
            renderOrder={barrel?.renderOrder ?? 0}
            revealNear={barrel?.revealNear ?? 10}
            revealFar={barrel?.revealFar ?? 22}
          />
        </group>
      </PartingItem>

      {/* Contact card */}
      <PartingItem
        home={debugHome(card, itemHomes.card)}
        push={card?.push ?? 2.6}
        lift={card?.lift ?? 0.5}
        forward={card?.forward ?? 0.4}
        influenceDistance={card?.influenceDistance ?? 9.5}
        lerp={card?.lerp ?? 0.09}
      >
        <group visible={card?.visible ?? true} scale={card?.scale ?? 1} renderOrder={card?.renderOrder ?? 0}>
          <PaintSprite
            sketch={`${C}/paper_form.webp`}
            position={debugSpritePosition(card)}
            height={card?.height ?? 2.9}
            renderOrder={card?.renderOrder ?? 0}
            revealNear={card?.revealNear ?? 13}
            revealFar={card?.revealFar ?? 26}
          />

          {/* Clickable handwritten links */}
          {(linksHtml?.visible ?? true) ? (
            <Html
              transform
              position={[linksHtml?.x ?? 0, linksHtml?.y ?? -0.05, linksHtml?.z ?? 0.1]}
              distanceFactor={linksHtml?.distanceFactor ?? 6.5}
              occlude={false}
              zIndexRange={[linksHtml?.zIndexMax ?? 30, linksHtml?.zIndexMin ?? 0]}
            >
              <div
                style={{
                  fontFamily: "var(--font-caveat), 'Caveat', cursive",
                  color: "#2b2b2b",
                  textAlign: "center",
                  userSelect: "none",
                  width: linksHtml?.width ?? 200,
                  transform: `scale(${linksHtml?.scale ?? 1})`,
                  transformOrigin: "center",
                }}
              >
                {links.map((l) => (
                  <div
                    key={l.href}
                    onClick={() => window.open(l.href, l.href.startsWith("mailto") ? "_self" : "_blank")}
                    style={{
                      fontSize: "1.0rem",
                      fontWeight: 600,
                      margin: "0.28rem 0",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      textShadow: "0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    {l.label}
                  </div>
                ))}
              </div>
            </Html>
          ) : null}

          {/* Send button → opens mail */}
          <group
            visible={sendButton?.visible ?? true}
            scale={sendButton?.scale ?? 1}
            renderOrder={sendButton?.renderOrder ?? 0}
          >
            <PaintSprite
              sketch={`${C}/send_button.webp`}
              position={[
                sendButton?.x ?? 0,
                sendButton?.y ?? -1.95,
                sendButton?.z ?? 0.1,
              ]}
              height={sendButton?.height ?? 0.65}
              renderOrder={sendButton?.renderOrder ?? 0}
              autoReveal={false}
              interactive
              hoverScale={sendButton?.hoverScale ?? 1.12}
              onClick={openMail}
            />
          </group>
        </group>
      </PartingItem>
    </group>
  );
}
