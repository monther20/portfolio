"use client";

import React, { useState } from "react";

import { shadowPanelStyles as styles } from "./room/shadowPanelStyles";

export interface ShadowConfig {
  table: {
    x: number;
    y: number;
    z: number;
    scale: number;
    maxOpacity: number;
  };
  chair: {
    x: number;
    y: number;
    z: number;
    scale: number;
    maxOpacity: number;
  };
}

export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  table: { x: -7.15, y: -4.45, z: -18.85, scale: 4.55, maxOpacity: 0.62 },
  chair: { x: -9.35, y: -4.05, z: -15.49, scale: 4.65, maxOpacity: 0.68 },
};

// ─── Slider row ────────────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={styles.sliderRow}>
      <div style={styles.sliderLabel}>
        <span style={styles.labelText}>{label}</span>
        <span style={styles.valueText}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.input}
      />
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  title,
  color,
  cfg,
  onChange,
}: {
  title: string;
  color: string;
  cfg: ShadowConfig["table"] | ShadowConfig["chair"];
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionTitle, borderLeftColor: color }}>
        {title}
      </div>
      <Slider label="X" value={cfg.x} min={-15} max={15} step={0.05} onChange={(v) => onChange("x", v)} />
      <Slider label="Y" value={cfg.y} min={-10} max={10} step={0.05} onChange={(v) => onChange("y", v)} />
      <Slider label="Z" value={cfg.z} min={-25} max={0} step={0.05} onChange={(v) => onChange("z", v)} />
      <Slider label="Scale" value={cfg.scale} min={0.5} max={12} step={0.05} onChange={(v) => onChange("scale", v)} />
      <Slider label="Max Opacity" value={cfg.maxOpacity} min={0} max={1} step={0.01} onChange={(v) => onChange("maxOpacity", v)} />
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function ShadowDebugPanel({
  config,
  onChange,
}: {
  config: ShadowConfig;
  onChange: (cfg: ShadowConfig) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const updateTable = (key: string, value: number) =>
    onChange({ ...config, table: { ...config.table, [key]: value } });

  const updateChair = (key: string, value: number) =>
    onChange({ ...config, chair: { ...config.chair, [key]: value } });

  const resetAll = () => onChange(DEFAULT_SHADOW_CONFIG);

  const copyValues = () => {
    const t = config.table;
    const c = config.chair;
    const text = `// Table shadow\nposition={[${t.x}, ${t.y}, ${t.z}]}\nscale={${t.scale}}\nmaxOpacity={${t.maxOpacity}}\n\n// Chair shadow\nposition={[${c.x}, ${c.y}, ${c.z}]}\nscale={${c.scale}}\nmaxOpacity={${c.maxOpacity}}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={styles.wrapper}>
      {/* Toggle button */}
      <button style={styles.toggleBtn} onClick={() => setOpen((o) => !o)}>
        <span style={styles.toggleIcon}>{open ? "✕" : "🌑"}</span>
        {open ? "Close" : "Shadow Debug"}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.headerIcon}>🌑</span>
            <span style={styles.headerTitle}>Shadow Debug</span>
          </div>

          <div style={styles.body}>
            <Section
              title="Table Shadow"
              color="#f59e0b"
              cfg={config.table}
              onChange={updateTable}
            />
            <Section
              title="Chair Shadow"
              color="#818cf8"
              cfg={config.chair}
              onChange={updateChair}
            />
          </div>

          <div style={styles.footer}>
            <button style={styles.resetBtn} onClick={resetAll}>
              ↺ Reset
            </button>
            <button style={{ ...styles.copyBtn, ...(copied ? styles.copiedBtn : {}) }} onClick={copyValues}>
              {copied ? "✔ Copied!" : "⎘ Copy Props"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
