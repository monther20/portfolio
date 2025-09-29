'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughRectangle, drawRoughLine, getHandDrawnStyle } from '@/utils/roughUtils';
import { RoughButton } from '@/components/ui/RoughButton';
import { Project } from '@/data/projects';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { theme, colors } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const hoverSvgRef = useRef<SVGSVGElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<'right' | 'left'>('right');

  useEffect(() => {
    const svg = svgRef.current;
    const card = cardRef.current;
    if (!svg || !card) return;

    const width = card.offsetWidth;
    const height = card.offsetHeight;

    if (width <= 0 || height <= 0) return;

    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    svg.innerHTML = '';

    const rc = createRoughSVG(svg);
    const style = {
      ...getHandDrawnStyle(theme === 'dark'),
      strokeWidth: 1.5,
      roughness: 1.2,
    };

    const padding = 2;
    const rectWidth = width - (padding + 4);
    const rectHeight = height - (padding + 4);

    const rectangleNode = drawRoughRectangle(
      rc,
      padding,
      padding,
      rectWidth,
      rectHeight,
      style
    );

    if (rectangleNode) {
      svg.appendChild(rectangleNode as Node);
    }
  }, [theme, project]);

  const detectHoverPosition = () => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;

    // Show on right if there's enough space (320px for hover card), otherwise left
    setHoverPosition(spaceRight > 320 ? 'right' : 'left');
  };

  const animateHoverCard = () => {
    const svg = hoverSvgRef.current;
    const card = hoverCardRef.current;
    if (!svg || !card) return;

    const width = 300;
    const height = 200;
    const padding = 4;

    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    const rc = createRoughSVG(svg);
    const style = {
      ...getHandDrawnStyle(theme === 'dark'),
      strokeWidth: 2,
      roughness: 1.5,
    };

    // Create the complete border rectangle
    const borderRect = drawRoughRectangle(rc, padding, padding, width - (padding * 2), height - (padding * 2), style);

    // Create arrow pointing to the project card
    const arrowStartX = hoverPosition === 'right' ? padding : width - padding;
    const arrowStartY = height / 2;
    const arrowEndX = hoverPosition === 'right' ? -20 : width + 20;
    const arrowEndY = height / 2;

    const arrowLine = drawRoughLine(rc, arrowStartX, arrowStartY, arrowEndX, arrowEndY, style);

    // Arrow head
    const arrowSize = 8;
    const arrowHeadX = hoverPosition === 'right' ? -20 : width + 20;
    const arrowHead1 = drawRoughLine(rc, arrowHeadX, arrowEndY,
      arrowHeadX + (hoverPosition === 'right' ? arrowSize : -arrowSize), arrowEndY - arrowSize, style);
    const arrowHead2 = drawRoughLine(rc, arrowHeadX, arrowEndY,
      arrowHeadX + (hoverPosition === 'right' ? arrowSize : -arrowSize), arrowEndY + arrowSize, style);

    // Timeline for coordinated animations
    const timeline = gsap.timeline();

    // Start with card scaling up
    timeline.to(card, {
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.7)'
    });

    if (borderRect) {
      svg.appendChild(borderRect as Node);

      // Get all path elements within the border
      const paths = borderRect.querySelectorAll('path');

      if (paths.length > 0) {
        // Animate border drawing
        paths.forEach((path, index) => {
          const pathLength = path.getTotalLength();

          gsap.set(path, {
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength
          });

          timeline.to(path, {
            strokeDashoffset: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power2.out'
          }, 0.2);
        });
      }
    }

    // Animate arrow after border is drawn
    if (arrowLine) {
      svg.appendChild(arrowLine as Node);
      const arrowPath = arrowLine.querySelector('path');
      if (arrowPath) {
        const arrowLength = arrowPath.getTotalLength();
        gsap.set(arrowPath, {
          strokeDasharray: arrowLength,
          strokeDashoffset: arrowLength
        });

        timeline.to(arrowPath, {
          strokeDashoffset: 0,
          duration: 0.3,
          ease: 'power2.out'
        }, 0.8);
      }
    }

    // Animate arrow heads
    [arrowHead1, arrowHead2].forEach((head, index) => {
      if (head) {
        svg.appendChild(head as Node);
        const headPath = head.querySelector('path');
        if (headPath) {
          const headLength = headPath.getTotalLength();
          gsap.set(headPath, {
            strokeDasharray: headLength,
            strokeDashoffset: headLength
          });

          timeline.to(headPath, {
            strokeDashoffset: 0,
            duration: 0.2,
            ease: 'power2.out'
          }, 1.0 + index * 0.1);
        }
      }
    });
  };

  const handleMouseEnter = () => {
    detectHoverPosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Trigger animation when hover state changes
  useEffect(() => {
    if (isHovered && hoverSvgRef.current && hoverCardRef.current) {
      // Small delay to ensure the SVG is rendered
      setTimeout(() => {
        animateHoverCard();
      }, 50);
    }
  }, [isHovered, theme, hoverPosition]);

  return (
    <div
      ref={cardRef}
      className="relative mb-6 p-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {project.featured && (
          <div className="mb-2">
            <span
              className="text-xs px-2 py-1"
              style={{
                color: colors.accent,
                fontWeight: 'bold'
              }}
            >
              ★ featured
            </span>
          </div>
        )}

        <h3
          className="text-lg font-bold mb-2"
          style={{
            color: colors.text,
          }}
        >
          {project.title}
        </h3>

        <p
          className="text-lg mb-3 leading-relaxed"
          style={{
            color: colors.textSecondary,
            lineHeight: '1.5'
          }}
        >
          {project.description}
        </p>

        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech, index) => (
              <RoughButton key={index}>
                <span
                  style={{
                    fontSize: '12px'
                  }}
                >
                  {tech}
                </span>
              </RoughButton>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:opacity-70"
              style={{
                color: colors.accent,
              }}
            >
              github
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:opacity-70"
              style={{
                color: colors.accent,
              }}
            >
              live demo
            </a>
          )}
        </div>
      </div>

      {/* Hover Image Card */}
      {isHovered && project.imageUrl && (
        <div
          ref={hoverCardRef}
          className={`absolute top-1/2 transform -translate-y-1/2 z-50 pointer-events-none ${hoverPosition === 'right' ? 'left-full ml-4' : 'right-full mr-4'
            }`}
          style={{
            width: '300px',
            height: '200px',
            opacity: 1,
            transform: 'scale(0)',
            transformOrigin: hoverPosition === 'right' ? 'left center' : 'right center'
          }}
        >
          {/* Background */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: colors.background,
              zIndex: 0
            }}
          />

          <svg
            ref={hoverSvgRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 1 }}
          />

          <div
            className="relative w-full h-full p-3"
            style={{ zIndex: 2 }}
          >
            <div className="relative w-full h-full overflow-hidden rounded-lg">
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};