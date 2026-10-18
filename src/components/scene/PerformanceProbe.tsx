"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getJourneyState } from "./journeyState";

const WINDOW_MS = 6_000;

function distribution(samples: number[]) {
  if (!samples.length) return { samples: 0, mean: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    p50: sorted[Math.floor((sorted.length - 1) * 0.5)],
    p95: sorted[Math.floor((sorted.length - 1) * 0.95)],
    max: sorted[sorted.length - 1],
  };
}

/** Opt-in local diagnostics. No visual overlay, tracking service, or normal-mode work. */
export default function PerformanceProbe() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get("perf") === "1");
  }, []);
  return enabled ? <ActiveProbe /> : null;
}

function ActiveProbe() {
  const { gl, camera } = useThree();
  const data = useRef({
    started: performance.now(),
    entranceReadyMs: 0,
    previousFrame: 0,
    renderMs: 0,
    calls: 0,
    triangles: 0,
    rows: [] as { time: number; frameMs: number; renderMs: number; calls: number; triangles: number; z: number }[],
    longTasks: [] as { time: number; duration: number }[],
  });
  const output = useRef<HTMLOutputElement | null>(null);

  useEffect(() => {
    const element = document.createElement("output");
    element.hidden = true;
    element.dataset.testid = "performance-report";
    document.body.appendChild(element);
    output.current = element;
    performance.setResourceTimingBufferSize(500);
    const checkEntrance = () => {
      if (!data.current.entranceReadyMs && document.querySelector('.experience-root[data-entrance-ready="true"]')) {
        data.current.entranceReadyMs = performance.now();
      }
    };
    const mutation = new MutationObserver(checkEntrance);
    mutation.observe(document.querySelector(".experience-root") ?? document.body, { attributes: true, attributeFilter: ["data-entrance-ready"] });
    checkEntrance();
    const visibilityChanged = () => { data.current.previousFrame = 0; };
    document.addEventListener("visibilitychange", visibilityChanged);
    let observer: PerformanceObserver | undefined;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) data.current.longTasks.push({ time: entry.startTime, duration: entry.duration });
      });
      observer.observe({ type: "longtask", buffered: true });
    }
    const render = gl.render;
    gl.render = function (...args: Parameters<typeof render>) {
      const beforeCalls = gl.info.render.calls;
      const beforeTriangles = gl.info.render.triangles;
      const started = performance.now();
      try {
        return render.apply(this, args);
      } finally {
        data.current.renderMs += performance.now() - started;
        data.current.calls += gl.info.autoReset ? gl.info.render.calls : Math.max(0, gl.info.render.calls - beforeCalls);
        data.current.triangles += gl.info.autoReset ? gl.info.render.triangles : Math.max(0, gl.info.render.triangles - beforeTriangles);
      }
    };
    const context = gl.getContext();
    const rendererExtension = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = rendererExtension ? context.getParameter(rendererExtension.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER);
    const timer = window.setInterval(() => {
      const now = performance.now();
      const recent = data.current.rows.filter((row) => row.time >= now - WINDOW_MS);
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const longTasks = data.current.longTasks.filter((task) => task.time >= now - WINDOW_MS);
      element.textContent = JSON.stringify({
        elapsedMs: now,
        entranceReadyMs: data.current.entranceReadyMs,
        visibility: document.visibilityState,
        viewport: [window.innerWidth, window.innerHeight],
        dpr: gl.getPixelRatio(),
        renderer,
        cameraZ: camera.position.z,
        journey: getJourneyState(),
        frameMs: distribution(recent.map((row) => row.frameMs)),
        renderCpuMs: distribution(recent.map((row) => row.renderMs)),
        drawCalls: distribution(recent.map((row) => row.calls)),
        triangles: distribution(recent.map((row) => row.triangles)),
        over33Ms: recent.filter((row) => row.frameMs > 33.4).length,
        longTasks: { count: longTasks.length, totalMs: longTasks.reduce((sum, row) => sum + row.duration, 0), maxMs: Math.max(0, ...longTasks.map((row) => row.duration)) },
        memory: { ...gl.info.memory, programs: gl.info.programs?.length ?? 0 },
        navigation: navigation ? { ttfbMs: navigation.responseStart - navigation.requestStart, domReadyMs: navigation.domContentLoadedEventEnd } : null,
        resources: resources.map((entry) => ({ url: new URL(entry.name).pathname, transferBytes: entry.transferSize, encodedBytes: entry.encodedBodySize, durationMs: entry.duration })),
        frames: recent,
      });
    }, 1_000);
    return () => {
      window.clearInterval(timer);
      mutation.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      observer?.disconnect();
      gl.render = render;
      element.remove();
      output.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    const state = data.current;
    const now = performance.now();
    if (!document.hidden && state.previousFrame > 0) {
      const frameMs = now - state.previousFrame;
      state.rows.push({ time: now, frameMs, renderMs: state.renderMs, calls: state.calls, triangles: state.triangles, z: camera.position.z });
      // Keep a bounded history; visible stalls are retained, including >500ms.
      if (state.rows.length > 12_000) state.rows.splice(0, 3_000);
    }
    state.previousFrame = document.hidden ? 0 : now;
    state.renderMs = 0;
    state.calls = 0;
    state.triangles = 0;
  }, -100);
  return null;
}
