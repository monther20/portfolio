"use client";

import React, { useState } from "react";

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

// ─── Styles (all inline so there's zero CSS file coupling) ────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 9999,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    fontSize: 12,
    userSelect: "none",
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    marginBottom: 6,
    padding: "6px 14px",
    background: "rgba(15,15,25,0.85)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    letterSpacing: "0.04em",
    transition: "background 0.2s",
  },
  toggleIcon: {
    fontSize: 14,
  },
  panel: {
    width: 280,
    background: "rgba(10,10,20,0.88)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  headerIcon: { fontSize: 16 },
  headerTitle: {
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.05em",
  },
  body: {
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    paddingLeft: 8,
    borderLeft: "3px solid #f59e0b",
    marginBottom: 4,
  },
  sliderRow: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelText: {
    color: "#94a3b8",
    fontWeight: 500,
    fontSize: 11,
  },
  valueText: {
    color: "#e2e8f0",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    fontSize: 11,
    background: "rgba(255,255,255,0.07)",
    padding: "1px 6px",
    borderRadius: 4,
  },
  input: {
    width: "100%",
    accentColor: "#818cf8",
    cursor: "pointer",
    height: 4,
  },
  footer: {
    display: "flex",
    gap: 8,
    padding: "10px 14px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
  },
  resetBtn: {
    flex: 1,
    padding: "6px 0",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#94a3b8",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.04em",
    transition: "background 0.2s",
  },
  copyBtn: {
    flex: 2,
    padding: "6px 0",
    background: "rgba(129,140,248,0.2)",
    border: "1px solid rgba(129,140,248,0.4)",
    borderRadius: 6,
    color: "#818cf8",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.04em",
    transition: "all 0.2s",
  },
  copiedBtn: {
    background: "rgba(52,211,153,0.2)",
    border: "1px solid rgba(52,211,153,0.4)",
    color: "#34d399",
  },
};
