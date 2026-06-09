"use client";

import React from "react";
import styles from "./components.module.css";

interface RiskManagementProps {
  floatingPl: number;
  maxDrawdown: number;
  tradesCount: number;
  softStopLimit?: number;
}

export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
}: RiskManagementProps) {
  const formatCurrencyRaw = (val: number) => {
    return Math.abs(val).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 1. Floating P&L Progress
  const pnlPct = Math.min(100, (Math.abs(floatingPl) / softStopLimit) * 100);
  const isPnlPositive = floatingPl >= 0;

  // 2. Drawdown Progress (Limit 40%)
  const ddPct = Math.min(100, (maxDrawdown / 40) * 100);

  // 3. SoftStop Usage
  const softStopUsedPct = Math.min(100, Math.round((Math.abs(Math.min(0, floatingPl)) / softStopLimit) * 100));

  // 4. Open Orders (Limit 36 slots)
  const slotsPct = Math.min(100, (tradesCount / 36) * 100);

  // 5. Spread Médio (mocked dynamically or fixed realistically at 14 pts out of 25)
  const spreadPct = (14 / 25) * 100;

  return (
    <div className={styles.riskManagementCard}>
      <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", marginBottom: "0.25rem" }}>
        Gestão de Risco
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* 1. P&L Flutuante Global */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span>P&L Flutuante Global</span>
            <span className={styles.riskItemValue} style={{ color: isPnlPositive ? "var(--neon-green)" : "var(--neon-red)" }}>
              {isPnlPositive ? "+" : "-"}USC {formatCurrencyRaw(floatingPl)}
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(5, pnlPct)}%`,
                backgroundColor: isPnlPositive ? "var(--neon-green)" : "var(--neon-red)",
                boxShadow: isPnlPositive ? "0 0 8px var(--neon-green-glow)" : "0 0 8px var(--neon-red-glow)",
              }}
            />
          </div>
        </div>

        {/* 2. Drawdown */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span>Drawdown (Zona 3 faixas)</span>
            <span className={styles.riskItemValue} style={{ color: "var(--neon-gold)" }}>
              {maxDrawdown.toFixed(1)}% / 40%
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${ddPct}%`,
                backgroundColor: "var(--neon-gold)",
                boxShadow: "0 0 8px var(--neon-gold-glow)",
              }}
            />
          </div>
          <div className={styles.riskScale}>
            <span>0%</span>
            <span>20%</span>
            <span>40%</span>
          </div>
        </div>

        {/* 3. SoftStop Global */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span>SoftStop Global</span>
            <span className={styles.riskItemValue}>
              USC {softStopLimit.toFixed(0)} · <span style={{ color: "var(--neon-green)" }}>{softStopUsedPct}% usado</span>
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${softStopUsedPct}%`,
                backgroundColor: "var(--neon-green)",
                boxShadow: "0 0 8px var(--neon-green-glow)",
              }}
            />
          </div>
        </div>

        {/* 4. Ordens Abertas */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span>Ordens Abertas</span>
            <span className={styles.riskItemValue} style={{ color: "var(--neon-blue)" }}>
              {tradesCount} / 36 slots
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${slotsPct}%`,
                backgroundColor: "var(--neon-blue)",
                boxShadow: "0 0 8px var(--neon-blue-glow)",
              }}
            />
          </div>
        </div>

        {/* 5. Spread Médio */}
        <div className={styles.riskItem}>
          <div className={styles.riskHeaderRow}>
            <span>Spread Médio</span>
            <span className={styles.riskItemValue} style={{ color: "var(--neon-green)" }}>
              14 pts · OK
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${spreadPct}%`,
                backgroundColor: "var(--neon-green)",
                boxShadow: "0 0 8px var(--neon-green-glow)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
