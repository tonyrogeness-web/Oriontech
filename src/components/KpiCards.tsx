"use client";

import React from "react";
import styles from "./components.module.css";

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  brlRate?: number;
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  brlRate = 5.45,
}: KpiCardsProps) {
  const formatCurrencyRaw = (val: number) => {
    return Math.abs(val).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatBRL = (uscVal: number) => {
    const usdVal = uscVal / 100;
    const brlVal = usdVal * brlRate;
    return `R$ ${Math.abs(brlVal).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const equityDiff = equity - balance;
  const equityDiffPct = balance > 0 ? (equityDiff / balance) * 100 : 0;
  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;
  const periodPct = balance > 0 ? (totalProfit / balance) * 100 : 0;

  // Drawdown category
  let ddZone = "Zona Verde";
  let ddBadge = "SEGURO";
  let ddColorClass = styles.kpiBadgeGreen;
  if (maxDrawdown >= 10 && maxDrawdown < 20) {
    ddZone = "Zona Amarela";
    ddBadge = "ALERTA";
    ddColorClass = styles.kpiBadgeGold;
  } else if (maxDrawdown >= 20) {
    ddZone = "Zona Vermelha";
    ddBadge = "CRÍTICO";
    ddColorClass = styles.kpiBadgeRed;
  }

  return (
    <div className={styles.kpiRowGrid}>
      {/* 1. Saldo da Conta */}
      <div className={styles.kpiCardMockup}>
        <span className={styles.kpiLabelMockup}>Saldo da Conta</span>
        <span className={styles.kpiValueMockup}>{formatBRL(balance)}</span>
        <span className={styles.kpiSubValueMockup}>{formatCurrencyRaw(balance)} USC</span>
        <span className={`${styles.kpiBadgeMockup} ${styles.kpiBadgeGreen}`}>CENT</span>
      </div>

      {/* 2. Patrimônio Líquido */}
      <div className={styles.kpiCardMockup}>
        <span className={styles.kpiLabelMockup}>Patrimônio Líquido</span>
        <span className={styles.kpiValueMockup} style={{ color: "var(--neon-green)" }}>
          {formatBRL(equity)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {formatCurrencyRaw(equity)} USC · {equityDiffPct >= 0 ? "+" : ""}{equityDiffPct.toFixed(2)}%
        </span>
        <span className={`${styles.kpiBadgeMockup} ${floatingPl >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {floatingPl >= 0 ? "+" : "-"}{formatBRL(floatingPl)}
        </span>
      </div>

      {/* 3. Lucro Hoje */}
      <div className={styles.kpiCardMockup}>
        <span className={styles.kpiLabelMockup}>Lucro Hoje</span>
        <span className={styles.kpiValueMockup} style={{ color: dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {dailyProfit >= 0 ? "+" : "-"}{formatBRL(dailyProfit)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {dailyProfit >= 0 ? "+" : "-"}{formatCurrencyRaw(dailyProfit)} USC
        </span>
        <span className={`${styles.kpiBadgeMockup} ${dailyProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {dailyProfit >= 0 ? "+" : ""}{dailyPct.toFixed(2)}%
        </span>
      </div>

      {/* 4. Lucro Período */}
      <div className={styles.kpiCardMockup}>
        <span className={styles.kpiLabelMockup}>Lucro Período</span>
        <span className={styles.kpiValueMockup} style={{ color: totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {totalProfit >= 0 ? "+" : "-"}{formatBRL(totalProfit)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {totalProfit >= 0 ? "+" : "-"}{formatCurrencyRaw(totalProfit)} USC
        </span>
        <span className={`${styles.kpiBadgeMockup} ${totalProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {totalProfit >= 0 ? "+" : ""}{periodPct.toFixed(2)}%
        </span>
      </div>

      {/* 5. Drawdown Atual */}
      <div className={styles.kpiCardMockup}>
        <span className={styles.kpiLabelMockup}>Drawdown Atual</span>
        <span className={styles.kpiValueMockup} style={{ color: maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)" }}>
          {maxDrawdown.toFixed(1)}%
        </span>
        <span className={styles.kpiSubValueMockup}>
          {ddZone} · Limite 40%
        </span>
        <span className={`${styles.kpiBadgeMockup} ${ddColorClass}`}>
          {ddBadge}
        </span>
      </div>
    </div>
  );
}
