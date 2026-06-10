"use client";

import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface RiskManagementProps {
  floatingPl: number;
  maxDrawdown: number;
  tradesCount: number;
  softStopLimit?: number;
  balance?: number;
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
  history?: PerformancePoint[];
}

/* ── Mini Sparkline SVG ──────────────────────────────────────────── */
function RiskSparkline({ data, color }: { data: number[]; color: string }) {
  let plotData = data.filter((v) => isFinite(v));
  if (plotData.length < 2) plotData = [0, 1, 0.5, 1.2, 0.8, 1.5, 1.2, 1.8];

  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;
  const W = 80;
  const H = 22;
  const pad = 1.5;

  const points = plotData
    .map((v, i) => {
      const x = (i / (plotData.length - 1)) * (W - pad * 2) + pad;
      const y = H - ((v - min) / range) * (H - pad * 2) - pad;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      style={{ position: "absolute", right: 12, bottom: 10, opacity: 0.65, pointerEvents: "none" }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{
          strokeDasharray: 250,
          strokeDashoffset: 250,
          animation: "drawSparkline 1.8s ease-out forwards",
        }}
      />
    </svg>
  );
}

/* ── Zone-banded progress bar track ─────────────────────────────── */
function ZonedBar({
  fillPct,
  fillColor,
  zone1Pct = 50,
  zone2Pct = 80,
}: {
  fillPct: number;
  fillColor: string;
  zone1Pct?: number;
  zone2Pct?: number;
}) {
  return (
    <div className={styles.riskBarTrack}>
      {/* Zone bands in background */}
      <div
        className={styles.riskBarZone}
        style={{ left: 0, width: `${zone1Pct}%`, background: "rgba(0, 230, 118, 0.06)" }}
      />
      <div
        className={styles.riskBarZone}
        style={{ left: `${zone1Pct}%`, width: `${zone2Pct - zone1Pct}%`, background: "rgba(255, 179, 0, 0.06)" }}
      />
      <div
        className={styles.riskBarZone}
        style={{ left: `${zone2Pct}%`, width: `${100 - zone2Pct}%`, background: "rgba(255, 23, 68, 0.07)" }}
      />

      {/* Zone divider lines */}
      <div className={styles.riskBarDivider} style={{ left: `${zone1Pct}%`, background: "rgba(255,179,0,0.3)" }} />
      <div className={styles.riskBarDivider} style={{ left: `${zone2Pct}%`, background: "rgba(255,23,68,0.3)" }} />

      {/* Actual fill */}
      <div
        className={styles.riskBarFill}
        style={{
          width: `${Math.max(fillPct > 0 ? 1.5 : 0, fillPct)}%`,
          background: fillColor,
          boxShadow: `0 0 8px ${fillColor}88`,
        }}
      />
    </div>
  );
}

/* ── Status Pill badge ───────────────────────────────────────────── */
function StatusPill({ label, color }: { label: string; color: string }) {
  const bg =
    label === "CRÍTICO"
      ? "rgba(255,23,68,0.12)"
      : label === "ALERTA"
      ? "rgba(255,179,0,0.12)"
      : "rgba(0,230,118,0.10)";
  const border =
    label === "CRÍTICO"
      ? "rgba(255,23,68,0.3)"
      : label === "ALERTA"
      ? "rgba(255,179,0,0.3)"
      : "rgba(0,230,118,0.25)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.2rem",
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: "0.6rem",
        fontWeight: 800,
        padding: "0.1rem 0.45rem",
        borderRadius: "20px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "0.55rem" }}>●</span> {label}
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
  balance = 0,
  currencyMode = "CENT",
  brlRate = 5.45,
  history = [],
}: RiskManagementProps) {

  /* ── Currency formatter ─────────────────────────────────────── */
  const fmt = (val: number, keepSign = false) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const sign = keepSign ? (isNeg ? "-" : val > 0 ? "+" : "") : "";
    if (currencyMode === "CENT") {
      return `${sign}${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    } else {
      const brl = (absVal / 100) * brlRate;
      return `${sign}R$ ${brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const pct = (val: number, max: number) =>
    max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;

  /* ── Bar 1: Perda Flutuante (SoftStop) ─────────────────────── */
  const plLoss    = Math.max(0, -floatingPl);
  const plPct     = floatingPl < 0 ? pct(plLoss, softStopLimit) : 0;
  const plColor   = plPct >= 80 ? "var(--neon-red)" : plPct >= 50 ? "var(--neon-gold)" : "var(--neon-green)";
  const plStatus  = plPct >= 80 ? "CRÍTICO" : plPct >= 50 ? "ALERTA" : "SEGURO";

  // Headroom SoftStop: quanto resta antes de atingir o limite
  const plHeadroom  = Math.max(0, softStopLimit - plLoss);

  /* ── Bar 2: Rebaixamento (Drawdown) ────────────────────────── */
  const ddPct     = pct(maxDrawdown, 40);
  const ddColor   = maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-gold)" : "var(--neon-green)";
  const ddStatus  = maxDrawdown >= 20 ? "CRÍTICO" : maxDrawdown >= 10 ? "ALERTA" : "SEGURO";

  // Headroom Drawdown: % antes de atingir 40%
  const ddHeadroom = Math.max(0, 40 - maxDrawdown);

  /* ── Worst state → dynamic card border ─────────────────────── */
  const isCritical = plStatus === "CRÍTICO" || ddStatus === "CRÍTICO";
  const isAlert    = plStatus === "ALERTA"   || ddStatus === "ALERTA";
  const cardBorderClass = isCritical
    ? styles.kpiCardBorderRed
    : isAlert
    ? styles.kpiCardBorderAmber
    : styles.kpiCardBorderGreen;

  const titleIconColor = isCritical
    ? "var(--neon-red)"
    : isAlert
    ? "var(--neon-gold)"
    : "var(--neon-green)";

  /* ── Sparkline data from history ────────────────────────────── */
  const sparkPl  = history.map((h) => Math.abs(h.profit));       // proxy P&L magnitude
  const sparkDd  = history.map((h) => (h.profit < 0 ? Math.abs(h.profit) : 0)); // proxy DD

  return (
    <div className={`${styles.riskManagementCard} ${cardBorderClass}`} style={{ position: "relative" }}>

      {/* ── Header with shield icon ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        {isCritical || isAlert
          ? <ShieldAlert size={16} style={{ color: titleIconColor, flexShrink: 0 }} />
          : <ShieldCheck size={16} style={{ color: titleIconColor, flexShrink: 0 }} />
        }
        <h3 className={styles.riskTitle} style={{ margin: 0, color: titleIconColor }}>
          Gestão de Risco
        </h3>
        {/* Overall status pill */}
        <div style={{ marginLeft: "auto" }}>
          <StatusPill
            label={isCritical ? "CRÍTICO" : isAlert ? "ALERTA" : "SEGURO"}
            color={titleIconColor}
          />
        </div>
      </div>

      <div className={styles.riskItemList}>

        {/* ─── Bar 1: Perda Flutuante (SoftStop) ─────────────── */}
        <div className={styles.riskItem} style={{ position: "relative" }}>

          {/* Label + pill */}
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>Perda Flutuante (SoftStop)</span>
            <StatusPill label={plStatus} color={plColor} />
          </div>

          {/* Value */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: plColor, fontFamily: "monospace" }}>
              {fmt(floatingPl, true)}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              limite {fmt(-softStopLimit)}
            </span>
          </div>

          {/* Zoned progress bar */}
          <ZonedBar fillPct={plPct} fillColor={plColor} zone1Pct={50} zone2Pct={80} />

          {/* Footer: % consumed + headroom */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>
              <strong style={{ color: plColor }}>{plPct.toFixed(1)}%</strong> consumido
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
              ↳ Margem: {fmt(plHeadroom)}
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkPl} color={plColor} />
        </div>

        {/* ─── Divider ──────────────────────────────────────── */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "0.15rem 0" }} />

        {/* ─── Bar 2: Rebaixamento (Drawdown) ─────────────── */}
        <div className={styles.riskItem} style={{ position: "relative" }}>

          {/* Label + pill */}
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>Rebaixamento (Drawdown)</span>
            <StatusPill label={ddStatus} color={ddColor} />
          </div>

          {/* Value */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ddColor, fontFamily: "monospace" }}>
              {maxDrawdown.toFixed(2)}%
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              limite 40.00%
            </span>
          </div>

          {/* Zoned progress bar: 10%=25% of bar, 20%=50% of bar */}
          <ZonedBar fillPct={ddPct} fillColor={ddColor} zone1Pct={25} zone2Pct={50} />

          {/* Footer: % consumed + headroom */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>
              <strong style={{ color: ddColor }}>{ddPct.toFixed(1)}%</strong> do limite atingido
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
              ↳ Margem: {ddHeadroom.toFixed(2)}% disponíveis
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkDd} color={ddColor} />
        </div>

      </div>
    </div>
  );
}
