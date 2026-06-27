"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import FloatingNote from "../FloatingNote";
import { contact } from "@/data/portfolio";

const C = "/textures/textures/contact";

/**
 * ContactSection — the journey ends at a little pier by the sea. A paper form
 * with a send button (opens your mail) plus clickable handwritten links.
 */
export default function ContactSection({ zStart = -106 }: { zStart?: number }) {
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

  return (
    <group>
      {/* Sea */}
      <mesh position={[0, -3.6, zStart - 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial map={water} color="#bcd3e0" transparent opacity={0.85} />
      </mesh>

      {/* Heading */}
      <FloatingNote position={[0, 3.2, zStart + 3]} fontSize={1.5} rotation={-2}>
        {"Let's build something"}
      </FloatingNote>

      {/* Scenery */}
      <Float speed={1} floatIntensity={0.3} floatingRange={[-0.1, 0.15]}>
        <PaintSprite sketch={`${C}/latarnia.webp`} position={[-5.5, 0.0, zStart - 8]} height={4.6} revealNear={14} revealFar={32} />
      </Float>
      <Float speed={1.3} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[-0.2, 0.2]}>
        <PaintSprite sketch={`${C}/statek.webp`} position={[4.6, -1.8, zStart - 6]} height={2.3} revealNear={13} revealFar={28} />
      </Float>
      <PaintSprite sketch={`${C}/molo.webp`} position={[-1.4, -2.7, zStart - 2]} height={1.8} revealNear={12} revealFar={26} />
      <PaintSprite sketch={`${C}/beczka.webp`} painted={`${C}/beczka_painted.webp`} position={[2.4, -2.7, zStart - 1]} height={1.2} revealNear={10} revealFar={22} />

      {/* Contact card */}
      <group position={[0, 0.3, zStart - 1]}>
        <PaintSprite sketch={`${C}/paper_form.webp`} position={[0, 0, 0]} height={2.9} revealNear={13} revealFar={26} />

        {/* Clickable handwritten links */}
        <Html
          transform
          position={[0, -0.05, 0.1]}
          distanceFactor={6.5}
          occlude={false}
          zIndexRange={[30, 0]}
        >
          <div
            style={{
              fontFamily: "var(--font-caveat), 'Caveat', cursive",
              color: "#2b2b2b",
              textAlign: "center",
              userSelect: "none",
              width: 200,
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

        {/* Send button → opens mail */}
        <PaintSprite
          sketch={`${C}/send_button.webp`}
          position={[0, -1.95, 0.1]}
          height={0.65}
          autoReveal={false}
          interactive
          hoverScale={1.12}
          onClick={openMail}
        />
      </group>

      {/* Closing note */}
      <FloatingNote position={[0, -3.0, zStart - 1]} fontSize={0.8} color="#6a6a6a" rotation={1}>
        {"thanks for scrolling all the way here ♥"}
      </FloatingNote>
    </group>
  );
}
