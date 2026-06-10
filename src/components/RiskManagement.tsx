"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
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

/* ── Mini Sparkline SVG ─────────────────────────────────────────── */
function RiskSparkline({ data, color }: { data: number[]; color: string }) {
  let plotData = data.filter((v) => isFinite(v));
  if (plotData.length < 2) plotData = [0.5, 1, 0.4, 1.3, 0.9, 1.6, 1.1, 1.9];
  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;
  const W = 72, H = 20, pad = 2;
  const points = plotData
    .map((v, i) => {
      const x = (i / (plotData.length - 1)) * (W - pad * 2) + pad;
      const y = H - ((v - min) / range) * (H - pad * 2) - pad;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={W} height={H}
      style={{ position: "absolute", right: 10, bottom: 8, opacity: 0.55, pointerEvents: "none" }}
    >
      <polyline
        fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={points}
        style={{ strokeDasharray: 250, strokeDashoffset: 250, animation: "drawSparkline 1.8s ease-out forwards" }}
      />
    </svg>
  );
}

/* ── Zone-banded progress bar ────────────────────────────────────── */
function ZonedBar({ fillPct, fillColor, zone1 = 50, zone2 = 80 }: {
  fillPct: number; fillColor: string; zone1?: number; zone2?: number;
}) {
  return (
    <div className={styles.riskBarTrack}>
      <div className={styles.riskBarZone} style={{ left: 0, width: `${zone1}%`, background: "rgba(0,230,118,0.06)" }} />
      <div className={styles.riskBarZone} style={{ left: `${zone1}%`, width: `${zone2 - zone1}%`, background: "rgba(255,179,0,0.07)" }} />
      <div className={styles.riskBarZone} style={{ left: `${zone2}%`, width: `${100 - zone2}%`, background: "rgba(255,23,68,0.08)" }} />
      <div className={styles.riskBarDivider} style={{ left: `${zone1}%`, background: "rgba(255,179,0,0.35)" }} />
      <div className={styles.riskBarDivider} style={{ left: `${zone2}%`, background: "rgba(255,23,68,0.35)" }} />
      <div className={styles.riskBarFill} style={{
        width: `${Math.max(fillPct > 0 ? 1.5 : 0, fillPct)}%`,
        background: fillColor,
        boxShadow: `0 0 10px ${fillColor}66`,
      }} />
    </div>
  );
}

/* ── Status Pill ─────────────────────────────────────────────────── */
function Pill({ label, color }: { label: string; color: string }) {
  const bgMap: Record<string, string> = {
    CRÍTICO: "rgba(255,23,68,0.13)",
    ALERTA: "rgba(255,179,0,0.12)",
    SEGURO: "rgba(0,230,118,0.10)",
    POSITIVO: "rgba(0,230,118,0.10)",
    NEGATIVO: "rgba(255,23,68,0.13)",
  };
  const bdMap: Record<string, string> = {
    CRÍTICO: "rgba(255,23,68,0.3)",
    ALERTA: "rgba(255,179,0,0.3)",
    SEGURO: "rgba(0,230,118,0.25)",
    POSITIVO: "rgba(0,230,118,0.25)",
    NEGATIVO: "rgba(255,23,68,0.3)",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.2rem",
      background: bgMap[label] ?? "rgba(255,255,255,0.07)",
      border: `1px solid ${bdMap[label] ?? "rgba(255,255,255,0.12)"}`,
      color, fontSize: "0.59rem", fontWeight: 800,
      padding: "0.08rem 0.42rem", borderRadius: "20px",
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ fontSize: "0.5rem" }}>●</span> {label}
    </span>
  );
}

/* ── Divider ─────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0.1rem 0" }} />;
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

  /* ── Formatter ────────────────────────────────────────────────── */
  const fmt = (val: number, keepSign = false) => {
    const absVal = Math.abs(val);
    const sign = keepSign ? (val < 0 ? "-" : val > 0 ? "+" : "") : "";
    if (currencyMode === "CENT") {
      return `${sign}${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    }
    const brl = (absVal / 100) * brlRate;
    return `${sign}R$ ${brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const clamp = (v: number, max: number) => max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0;

  /* ═══════════════════════════════════════════════════════════════
     1. PERDA FLUTUANTE — valor atual do P&L
  ═══════════════════════════════════════════════════════════════ */
  const plIsPositive = floatingPl >= 0;
  const plColor      = plIsPositive ? "var(--neon-green)" : "var(--neon-red)";
  const plStatus     = plIsPositive ? "POSITIVO" : "NEGATIVO";
  const plIcon       = plIsPositive ? TrendingUp : TrendingDown;
  const PlIcon       = plIcon;

  /* ═══════════════════════════════════════════════════════════════
     2. SOFT STOP — % do limite consumido
  ═══════════════════════════════════════════════════════════════ */
  const plLoss       = Math.max(0, -floatingPl);
  const ssBarPct     = floatingPl < 0 ? clamp(plLoss, softStopLimit) : 0;
  const ssColor      = ssBarPct >= 80 ? "var(--neon-red)" : ssBarPct >= 50 ? "var(--neon-gold)" : "var(--neon-green)";
  const ssStatus     = ssBarPct >= 80 ? "CRÍTICO" : ssBarPct >= 50 ? "ALERTA" : "SEGURO";
  const ssHeadroom   = Math.max(0, softStopLimit - plLoss);

  /* ═══════════════════════════════════════════════════════════════
     3. REBAIXAMENTO (DRAWDOWN)
  ═══════════════════════════════════════════════════════════════ */
  const ddBarPct     = clamp(maxDrawdown, 40);
  const ddColor      = maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-gold)" : "var(--neon-green)";
  const ddStatus     = maxDrawdown >= 20 ? "CRÍTICO" : maxDrawdown >= 10 ? "ALERTA" : "SEGURO";
  const ddHeadroom   = Math.max(0, 40 - maxDrawdown);

  /* ── Worst state → card border ───────────────────────────────── */
  const isCritical = ssStatus === "CRÍTICO" || ddStatus === "CRÍTICO";
  const isAlert    = ssStatus === "ALERTA"   || ddStatus === "ALERTA";
  const cardBorder = isCritical
    ? styles.kpiCardBorderRed
    : isAlert
    ? styles.kpiCardBorderAmber
    : styles.kpiCardBorderGreen;
  const titleColor = isCritical ? "var(--neon-red)" : isAlert ? "var(--neon-gold)" : "var(--neon-green)";

  /* ── Sparkline data ──────────────────────────────────────────── */
  const sparkProfit = history.map((h) => h.profit);
  const sparkBal    = history.map((h) => h.balance);

  return (
    <div className={`${styles.riskManagementCard} ${cardBorder}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" }}>
        {isCritical || isAlert
          ? <ShieldAlert size={15} style={{ color: titleColor, flexShrink: 0 }} />
          : <ShieldCheck size={15} style={{ color: titleColor, flexShrink: 0 }} />
        }
        <h3 className={styles.riskTitle} style={{ margin: 0, color: titleColor }}>
          Gestão de Risco
        </h3>
        <div style={{ marginLeft: "auto" }}>
          <Pill
            label={isCritical ? "CRÍTICO" : isAlert ? "ALERTA" : "SEGURO"}
            color={titleColor}
          />
        </div>
      </div>

      <div className={styles.riskItemList}>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 1 — PERDA FLUTUANTE (valor, não barra)
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 60 }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <PlIcon size={11} style={{ color: plColor }} />
              <span className={styles.riskSectionLabel}>PERDA FLUTUANTE</span>
            </div>
            <Pill label={plStatus} color={plColor} />
          </div>

          {/* Big value */}
          <div style={{ marginTop: "0.3rem" }}>
            <span style={{
              fontSize: "1.35rem", fontWeight: 800, color: plColor,
              fontFamily: "monospace", letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              {fmt(floatingPl, true)}
            </span>
          </div>

          {/* Sub info */}
          <div style={{ marginTop: "0.25rem" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {plIsPositive
                ? "✓ Sem perda flutuante no momento"
                : `Perda de ${fmt(plLoss)} sobre posições abertas`}
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkProfit} color={plColor} />
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 2 — SOFT STOP
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 60 }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <AlertTriangle size={11} style={{ color: ssColor }} />
              <span className={styles.riskSectionLabel}>SOFT STOP</span>
            </div>
            <Pill label={ssStatus} color={ssColor} />
          </div>

          {/* Values */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.3rem 0 0.4rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ssColor, fontFamily: "monospace" }}>
              {fmt(plLoss)} consumido
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              limite {fmt(softStopLimit)}
            </span>
          </div>

          {/* Zoned bar */}
          <ZonedBar fillPct={ssBarPct} fillColor={ssColor} zone1={50} zone2={80} />

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.59rem", color: "var(--text-muted)" }}>
              <strong style={{ color: ssColor }}>{ssBarPct.toFixed(1)}%</strong> do limite
            </span>
            <span style={{ fontSize: "0.59rem", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
              ↳ {fmt(ssHeadroom)} disponíveis
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkProfit.map((v) => (v < 0 ? Math.abs(v) : 0))} color={ssColor} />
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 3 — REBAIXAMENTO (DRAWDOWN)
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 60 }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <TrendingDown size={11} style={{ color: ddColor }} />
              <span className={styles.riskSectionLabel}>REBAIXAMENTO (DRAWDOWN)</span>
            </div>
            <Pill label={ddStatus} color={ddColor} />
          </div>

          {/* Values */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.3rem 0 0.4rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ddColor, fontFamily: "monospace" }}>
              {maxDrawdown.toFixed(2)}%
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              limite 40.00%
            </span>
          </div>

          {/* Zoned bar: 10%→25% do trilho, 20%→50% do trilho */}
          <ZonedBar fillPct={ddBarPct} fillColor={ddColor} zone1={25} zone2={50} />

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.59rem", color: "var(--text-muted)" }}>
              <strong style={{ color: ddColor }}>{ddBarPct.toFixed(1)}%</strong> do limite atingido
            </span>
            <span style={{ fontSize: "0.59rem", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
              ↳ {ddHeadroom.toFixed(2)}% disponíveis
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkBal} color={ddColor} />
        </div>

      </div>
    </div>
  );
}
