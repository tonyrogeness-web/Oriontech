"use client";

import React from "react";
import styles from "./components.module.css";

interface RiskManagementProps {
  floatingPl: number;
  maxDrawdown: number;
  tradesCount: number;
  softStopLimit?: number;
  balance?: number;
}

export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
  balance = 0,
}: RiskManagementProps) {
  const fmt2 = (val: number) =>
    Math.abs(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── 1. P&L Flutuante Global ──────────────────────────────────────
  const isPnlPositive = floatingPl >= 0;
  // % do SoftStop usado em perda (barra indica quão perto do limite)
  const pnlBarPct = Math.min(100, (Math.abs(floatingPl) / softStopLimit) * 100);

  // ── 2. Drawdown em 3 zonas (0-10% verde, 10-20% amarelo, 20-40% vermelho) ──
  const ddCapPct = Math.min(100, (maxDrawdown / 40) * 100);
  const ddZoneColor =
    maxDrawdown >= 20
      ? "var(--neon-red)"
      : maxDrawdown >= 10
      ? "var(--neon-gold)"
      : "var(--neon-green)";

  // Marcadores de zona (10% = 25% da barra, 20% = 50%)
  const zone10 = (10 / 40) * 100; // = 25%
  const zone20 = (20 / 40) * 100; // = 50%

  // ── 3. SoftStop ──────────────────────────────────────────────────
  const softLoss = Math.abs(Math.min(0, floatingPl));
  const softUsedPct = Math.min(100, Math.round((softLoss / softStopLimit) * 100));
  const softColor =
    softUsedPct >= 80
      ? "var(--neon-red)"
      : softUsedPct >= 50
      ? "var(--neon-gold)"
      : "var(--neon-green)";
  const softLabel = softUsedPct >= 80 ? "CRÍTICO" : softUsedPct >= 50 ? "ALERTA" : "OK";

  // ── 4. Ordens Abertas (max 36 slots = 6 pares × 6 níveis) ────────
  const maxSlots = 36;
  const slotsPct = Math.min(100, (tradesCount / maxSlots) * 100);
  const slotsColor =
    tradesCount >= 30
      ? "var(--neon-red)"
      : tradesCount >= 20
      ? "var(--neon-gold)"
      : "var(--neon-green)";

  // ── 5. Uso de Capital (equity relativo ao saldo) ─────────────────
  const capitalPct = balance > 0 ? Math.min(100, Math.abs(floatingPl / balance) * 100) : 0;
  const capitalColor = isPnlPositive ? "var(--neon-green)" : "var(--neon-red)";

  return (
    <div className={styles.riskManagementCard}>
      <h3 className={styles.riskTitle}>Gestão de Risco</h3>

      <div className={styles.riskItemList}>

        {/* ── 1. P&L Flutuante Global ── */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>P&L Flutuante Global</span>
            <span
              className={styles.riskItemValue}
              style={{ color: isPnlPositive ? "var(--neon-green)" : "var(--neon-red)" }}
            >
              {isPnlPositive ? "+" : "-"}USC {fmt2(floatingPl)}
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            {/* barra sempre cresce da esquerda; vermelha = perda, verde = lucro */}
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, pnlBarPct)}%`,
                background: isPnlPositive
                  ? "linear-gradient(90deg, var(--neon-green), #00ff88)"
                  : "linear-gradient(90deg, var(--neon-red), #ff4d6d)",
                boxShadow: isPnlPositive
                  ? "0 0 8px var(--neon-green-glow)"
                  : "0 0 8px var(--neon-red-glow)",
              }}
            />
          </div>
        </div>

        {/* ── 2. Drawdown (3 zonas) ── */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>Drawdown (Zona 3 faixas)</span>
            <span className={styles.riskItemValue} style={{ color: ddZoneColor }}>
              {maxDrawdown.toFixed(1)}% / 40%
            </span>
          </div>
          {/* Barra com marcadores de zona */}
          <div className={styles.progressBarOuter} style={{ position: "relative" }}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, ddCapPct)}%`,
                background: `linear-gradient(90deg, var(--neon-green), ${ddZoneColor})`,
                boxShadow: `0 0 8px ${ddZoneColor}`,
              }}
            />
            {/* Marcador Zona Amarela (10% = 25%) */}
            <div
              style={{
                position: "absolute",
                left: `${zone10}%`,
                top: 0,
                bottom: 0,
                width: "1px",
                background: "rgba(255,179,0,0.4)",
              }}
            />
            {/* Marcador Zona Vermelha (20% = 50%) */}
            <div
              style={{
                position: "absolute",
                left: `${zone20}%`,
                top: 0,
                bottom: 0,
                width: "1px",
                background: "rgba(255,23,68,0.4)",
              }}
            />
          </div>
          <div className={styles.riskScale}>
            <span>0%</span>
            <span style={{ color: "var(--neon-gold)" }}>10%</span>
            <span style={{ color: "var(--neon-red)" }}>20%</span>
            <span>40%</span>
          </div>
        </div>

        {/* ── 3. SoftStop Global ── */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>SoftStop Global</span>
            <span className={styles.riskItemValue}>
              USC {softStopLimit.toFixed(0)} ·{" "}
              <span style={{ color: softColor }}>
                {softUsedPct}% usado · {softLabel}
              </span>
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, softUsedPct)}%`,
                background: `linear-gradient(90deg, var(--neon-green), ${softColor})`,
                boxShadow: `0 0 8px ${softColor}55`,
              }}
            />
          </div>
        </div>

        {/* ── 4. Ordens Abertas ── */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>Ordens Abertas</span>
            <span className={styles.riskItemValue} style={{ color: slotsColor }}>
              {tradesCount} / {maxSlots} slots
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, slotsPct)}%`,
                background: `linear-gradient(90deg, var(--neon-green), ${slotsColor})`,
                boxShadow: `0 0 6px ${slotsColor}55`,
              }}
            />
          </div>
        </div>

        {/* ── 5. Capital em Risco ── */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span className={styles.riskLabel}>Capital em Risco</span>
            <span
              className={styles.riskItemValue}
              style={{ color: capitalColor }}
            >
              {capitalPct.toFixed(2)}%{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.7rem" }}>
                do saldo
              </span>
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, capitalPct)}%`,
                background: `linear-gradient(90deg, ${capitalColor}, ${
                  isPnlPositive ? "#00ff88" : "#ff4d6d"
                })`,
                boxShadow: `0 0 6px ${capitalColor}55`,
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
