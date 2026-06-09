"use client";

import React from "react";
import styles from "./components.module.css";

interface RiskManagementProps {
  floatingPl: number;   // P&L flutuante global (USC) — pode ser negativo
  maxDrawdown: number;  // Drawdown atual em % (0–100)
  tradesCount: number;  // Total de posições abertas
  softStopLimit?: number; // Limite do SoftStop (USC)
  balance?: number;     // Saldo da conta (USC)
}

export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
  balance = 0,
}: RiskManagementProps) {

  /* ── helpers ──────────────────────────────────────────────────── */
  const fmt2 = (v: number) =>
    Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* clamp 0–100 */
  const pct = (val: number, max: number) =>
    max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;

  /* ── 1. P&L Flutuante Global ──────────────────────────────────── */
  // Barra mostra a perda atual vs o SoftStop. Verde = lucro, Vermelho = perda.
  const plLoss   = Math.abs(Math.min(0, floatingPl));          // só perda
  const plGain   = Math.max(0, floatingPl);
  const isProfit = floatingPl >= 0;
  // % em relação ao SoftStop (cap 100%)
  const plBarPct = isProfit
    ? pct(plGain, softStopLimit)   // lucro: verde crescendo
    : pct(plLoss, softStopLimit);  // perda: vermelho crescendo
  const plColor  = isProfit ? "var(--neon-green)" : "var(--neon-red)";
  const plGlow   = isProfit ? "var(--neon-green-glow)" : "var(--neon-red-glow)";

  /* ── 2. Drawdown (3 zonas: 0-10 verde / 10-20 amarelo / 20-40 vermelho) */
  const ddBarPct = pct(maxDrawdown, 40);
  const ddColor  = maxDrawdown >= 20 ? "var(--neon-red)"
                 : maxDrawdown >= 10 ? "var(--neon-gold)"
                 : "var(--neon-green)";
  const ddLabel  = maxDrawdown >= 20 ? "ZONA VERMELHA"
                 : maxDrawdown >= 10 ? "ZONA AMARELA"
                 : "ZONA VERDE";
  // marcadores em px% dentro da barra
  const zone10px = (10 / 40) * 100; // 25%
  const zone20px = (20 / 40) * 100; // 50%

  /* ── 3. SoftStop: quanto da "margem de perda" já foi usada ──── */
  const ssUsedPct = pct(plLoss, softStopLimit);
  const ssColor   = ssUsedPct >= 80 ? "var(--neon-red)"
                  : ssUsedPct >= 50 ? "var(--neon-gold)"
                  : "var(--neon-green)";
  const ssLabel   = ssUsedPct >= 80 ? "CRÍTICO"
                  : ssUsedPct >= 50 ? "ALERTA"
                  : "OK";

  /* ── 4. Ordens Abertas (max 36 slots = 6 pares × 6 níveis) ─── */
  const maxSlots  = 36;
  const slotsBarPct = pct(tradesCount, maxSlots);
  const slotsColor  = tradesCount >= 28 ? "var(--neon-red)"
                    : tradesCount >= 18 ? "var(--neon-gold)"
                    : "var(--neon-green)";

  /* ── 5. Capital em risco: % do saldo que é o floatingPl de perda */
  const capPct   = balance > 0 ? pct(plLoss, balance) : 0;
  const capColor = capPct >= 5 ? "var(--neon-red)"
                 : capPct >= 2 ? "var(--neon-gold)"
                 : "var(--neon-green)";

  return (
    <div className={styles.riskManagementCard}>
      <h3 className={styles.riskTitle}>Gestão de Risco</h3>

      <div className={styles.riskItemList}>

        {/* 1. P&L Flutuante Global */}
        <RiskBar
          label="P&L Flutuante Global"
          valueNode={
            <span style={{ color: plColor, fontWeight: 700 }}>
              {isProfit ? "+" : "-"}USC {fmt2(floatingPl)}
            </span>
          }
          barPct={plBarPct}
          barColor={plColor}
          barGlow={plGlow}
        />

        {/* 2. Drawdown */}
        <RiskBar
          label="Drawdown (Zona 3 faixas)"
          valueNode={
            <span style={{ color: ddColor, fontWeight: 700 }}>
              {maxDrawdown.toFixed(2)}% / 40%{" "}
              <small style={{ color: "var(--text-muted)", fontWeight: 500 }}>· {ddLabel}</small>
            </span>
          }
          barPct={ddBarPct}
          barColor={ddColor}
          barGlow={ddColor}
          scaleLabels={["0%", "10%", "20%", "40%"]}
          markers={[zone10px, zone20px]}
          markerColors={["rgba(255,179,0,0.5)", "rgba(255,23,68,0.5)"]}
        />

        {/* 3. SoftStop Global */}
        <RiskBar
          label="SoftStop Global"
          valueNode={
            <span style={{ fontWeight: 700 }}>
              USC {softStopLimit.toFixed(0)} ·{" "}
              <span style={{ color: ssColor }}>{ssUsedPct.toFixed(0)}% usado · {ssLabel}</span>
            </span>
          }
          barPct={ssUsedPct}
          barColor={ssColor}
          barGlow={ssColor}
        />

        {/* 4. Ordens Abertas */}
        <RiskBar
          label="Ordens Abertas"
          valueNode={
            <span style={{ color: slotsColor, fontWeight: 700 }}>
              {tradesCount} / {maxSlots} slots
            </span>
          }
          barPct={slotsBarPct}
          barColor={slotsColor}
          barGlow={slotsColor}
        />

        {/* 5. Capital em Risco */}
        <RiskBar
          label="Capital em Risco"
          valueNode={
            <span style={{ color: capColor, fontWeight: 700 }}>
              {capPct.toFixed(2)}%{" "}
              <small style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.68rem" }}>
                do saldo
              </small>
            </span>
          }
          barPct={capPct}
          barColor={capColor}
          barGlow={capColor}
        />

      </div>
    </div>
  );
}

/* ── Sub-componente de barra individual ─────────────────────────── */
interface RiskBarProps {
  label: string;
  valueNode: React.ReactNode;
  barPct: number;       // 0–100
  barColor: string;
  barGlow?: string;
  scaleLabels?: string[];
  markers?: number[];   // posições % dos marcadores de zona
  markerColors?: string[];
}

function RiskBar({
  label,
  valueNode,
  barPct,
  barColor,
  barGlow,
  scaleLabels,
  markers = [],
  markerColors = [],
}: RiskBarProps) {
  return (
    <div className={styles.riskItem}>
      <div className={styles.riskHeaderRow}>
        <span className={styles.riskLabel}>{label}</span>
        <span className={styles.riskItemValue}>{valueNode}</span>
      </div>

      {/* barra */}
      <div className={styles.progressBarOuter} style={{ position: "relative" }}>
        <div
          className={styles.progressBarInner}
          style={{
            width: `${Math.max(barPct > 0 ? 2 : 0, barPct)}%`,
            background: barColor,
            boxShadow: barGlow ? `0 0 7px ${barGlow}` : undefined,
            transition: "width 0.6s ease",
          }}
        />
        {/* marcadores de zona */}
        {markers.map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${m}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              background: markerColors[i] ?? "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* escala */}
      {scaleLabels && (
        <div className={styles.riskScale}>
          {scaleLabels.map((s, i) => (
            <span
              key={i}
              style={{
                color:
                  i === 1 ? "var(--neon-gold)"
                  : i === 2 ? "var(--neon-red)"
                  : undefined,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
