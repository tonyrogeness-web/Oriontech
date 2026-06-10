"use client";

import React from "react";
import styles from "./components.module.css";

interface RiskManagementProps {
  floatingPl: number;   // P&L flutuante global (USC) — pode ser negativo
  maxDrawdown: number;  // Drawdown atual em % (0–100)
  tradesCount: number;  // Total de posições abertas
  softStopLimit?: number; // Limite do SoftStop (USC)
  balance?: number;     // Saldo da conta (USC)
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
  balance = 0,
  currencyMode = "CENT",
  brlRate = 5.45,
}: RiskManagementProps) {

  /* ── helpers ──────────────────────────────────────────────────── */
  const formatRiskCurrency = (val: number, keepSign = false) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    
    let signStr = "";
    if (keepSign) {
      signStr = isNeg ? "-" : val > 0 ? "+" : "";
    }

    if (currencyMode === "CENT") {
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${signStr}${formattedNum} USC`;
    } else { // BRL
      const convertedBrl = (absVal / 100) * brlRate;
      const formattedNum = convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${signStr}R$ ${formattedNum} BRL`;
    }
  };

  /* clamp 0–100 */
  const pct = (val: number, max: number) =>
    max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;

  const plLoss = Math.max(0, -floatingPl);

  /* ── 1. P&L Flutuante Global (vs SoftStop) ─────────────────────── */
  const plReachPct = floatingPl < 0 ? pct(plLoss, softStopLimit) : 0;
  const plColor = floatingPl >= 0 ? "var(--neon-green)"
                : plReachPct >= 80 ? "var(--neon-red)"
                : plReachPct >= 50 ? "var(--neon-gold)"
                : "var(--neon-green)";
  const plStatus = floatingPl >= 0 ? "LUCRO"
                 : plReachPct >= 80 ? "CRÍTICO"
                 : plReachPct >= 50 ? "ALERTA"
                 : "OK";

  /* ── 2. Drawdown (Limite 40%) ──────────────────────────────────── */
  const ddReachPct = pct(maxDrawdown, 40);
  const ddColor = maxDrawdown >= 20 ? "var(--neon-red)"
                : maxDrawdown >= 10 ? "var(--neon-gold)"
                : "var(--neon-green)";
  const ddStatus = maxDrawdown >= 20 ? "CRÍTICO"
                 : maxDrawdown >= 10 ? "ALERTA"
                 : "SEGURO";
  // marcadores em px% dentro da barra
  const zone10px = (10 / 40) * 100; // 25%
  const zone20px = (20 / 40) * 100; // 50%

  /* ── 3. SoftStop Global (Perda Máxima vs Limite) ──────────────── */
  const ssReachPct = pct(plLoss, softStopLimit);
  const ssColor = ssReachPct >= 80 ? "var(--neon-red)"
                : ssReachPct >= 50 ? "var(--neon-gold)"
                : "var(--neon-green)";
  const ssStatus = ssReachPct >= 80 ? "CRÍTICO"
                 : ssReachPct >= 50 ? "ALERTA"
                 : plLoss === 0 ? "NENHUM"
                 : "OK";

  /* ── 4. Ordens Abertas (Limite 36) ────────────────────────────── */
  const maxSlots = 36;
  const slotsReachPct = pct(tradesCount, maxSlots);
  const slotsColor = tradesCount >= 28 ? "var(--neon-red)"
                   : tradesCount >= 18 ? "var(--neon-gold)"
                   : "var(--neon-green)";
  const slotsStatus = tradesCount >= 28 ? "CRÍTICO"
                    : tradesCount >= 18 ? "ALERTA"
                    : "SEGURO";

  /* ── 5. Capital em Risco (Limite 10% do Saldo) ───────────────── */
  const capLossPct = balance > 0 ? (plLoss / balance) * 100 : 0;
  const capLimit = 10.00; // 10% do saldo como limite
  const capReachPct = pct(capLossPct, capLimit);
  const capColor = capLossPct >= 5 ? "var(--neon-red)"
                 : capLossPct >= 2 ? "var(--neon-gold)"
                 : "var(--neon-green)";
  const capStatus = capLossPct >= 5 ? "CRÍTICO"
                  : capLossPct >= 2 ? "ALERTA"
                  : "SEGURO";

  return (
    <div className={styles.riskManagementCard}>
      <h3 className={styles.riskTitle}>Gestão de Risco</h3>

      <div className={styles.riskItemList}>

        {/* 1. P&L Flutuante Global */}
        <RiskBar
          label="P&L Flutuante (vs SoftStop)"
          valueText={`${formatRiskCurrency(floatingPl, true)} / ${formatRiskCurrency(-softStopLimit, true)}`}
          reachText={`${plReachPct.toFixed(1)}% de alcance`}
          barPct={plReachPct}
          barColor={plColor}
          barGlow={plColor}
          statusLabel={plStatus}
          statusColor={plColor}
        />

        {/* 2. Drawdown */}
        <RiskBar
          label="Drawdown de Saldo (Limite 40%)"
          valueText={`${maxDrawdown.toFixed(2)}% / 40.00%`}
          reachText={`${ddReachPct.toFixed(1)}% de alcance`}
          barPct={ddReachPct}
          barColor={ddColor}
          barGlow={ddColor}
          statusLabel={ddStatus}
          statusColor={ddColor}
          markers={[zone10px, zone20px]}
          markerColors={["rgba(255,179,0,0.5)", "rgba(255,23,68,0.5)"]}
        />

        {/* 3. SoftStop Global */}
        <RiskBar
          label="SoftStop Consumido"
          valueText={`${formatRiskCurrency(plLoss)} / ${formatRiskCurrency(softStopLimit)}`}
          reachText={`${ssReachPct.toFixed(1)}% usado`}
          barPct={ssReachPct}
          barColor={ssColor}
          barGlow={ssColor}
          statusLabel={ssStatus}
          statusColor={ssColor}
        />

        {/* 4. Ordens Abertas */}
        <RiskBar
          label="Ordens Abertas"
          valueText={`${tradesCount} / ${maxSlots} slots`}
          reachText={`${slotsReachPct.toFixed(1)}% de alcance`}
          barPct={slotsReachPct}
          barColor={slotsColor}
          barGlow={slotsColor}
          statusLabel={slotsStatus}
          statusColor={slotsColor}
        />

        {/* 5. Capital em Risco */}
        <RiskBar
          label="Capital em Risco (Limite 10% Saldo)"
          valueText={`${capLossPct.toFixed(2)}% / ${capLimit.toFixed(2)}%`}
          reachText={`${capReachPct.toFixed(1)}% de alcance`}
          barPct={capReachPct}
          barColor={capColor}
          barGlow={capColor}
          statusLabel={capStatus}
          statusColor={capColor}
        />

      </div>
    </div>
  );
}

/* ── Sub-componente de barra individual ─────────────────────────── */
interface RiskBarProps {
  label: string;
  valueText: string;
  reachText: string;
  barPct: number;       // 0–100
  barColor: string;
  barGlow?: string;
  statusLabel?: string;
  statusColor?: string;
  markers?: number[];   // posições % dos marcadores de zona
  markerColors?: string[];
}

function RiskBar({
  label,
  valueText,
  reachText,
  barPct,
  barColor,
  barGlow,
  statusLabel,
  statusColor,
  markers = [],
  markerColors = [],
}: RiskBarProps) {
  return (
    <div className={styles.riskItem}>
      <div className={styles.riskHeaderRow}>
        <span className={styles.riskLabel}>{label}</span>
        <span className={styles.riskItemValue}>{valueText}</span>
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

      {/* rodapé da barra com porcentagem e status */}
      <div className={styles.riskScale}>
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
          {reachText}
        </span>
        {statusLabel && (
          <span style={{ color: statusColor, fontWeight: 700, letterSpacing: "0.02em" }}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}
