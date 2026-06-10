"use client";

import React from "react";
import { Wallet, Coins, TrendingUp, Globe, ShieldAlert } from "lucide-react";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  brlRate?: number;
  currencyMode: "CENT" | "BRL";
  history?: PerformancePoint[];
}

/* ── Sparkline component inside KpiCards.tsx ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  let plotData = [...data];
  
  // Render placeholder sine-like wave if history is empty
  if (plotData.length < 2) {
    plotData = [10, 13, 11, 14, 13, 16, 15, 18];
  }

  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;

  const width = 85;
  const height = 24;
  const padding = 1.5;

  const points = plotData
    .map((val, idx) => {
      const x = (idx / (plotData.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={styles.sparkline}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.0"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  brlRate = 5.45,
  currencyMode = "CENT",
  history = [],
}: KpiCardsProps) {
  // Format primary value (main display)
  const formatValPrimary = (val: number) => {
    const absVal = Math.abs(val);
    const isNeg = val < 0;
    const sign = isNeg ? "-" : "";

    if (currencyMode === "CENT") {
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${sign}${formattedNum} USC`;
    } else { // BRL
      const convertedBrl = (absVal / 100) * brlRate;
      return `${sign}R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  // Format secondary value (sub-label) - returns absolute value without sign
  const formatValSecondary = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT") {
      const convertedBrl = (absVal / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} BRL`;
    } else { // BRL
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} USC`;
    }
  };

  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;
  const periodPct = balance > 0 ? (totalProfit / balance) * 100 : 0;

  // Drawdown zones
  let ddZone = "Zona Verde";
  let ddBadge = "SEGURO";
  let ddColorClass = styles.kpiBadgeGreen;
  let ddBorderClass = styles.kpiCardBorderGold;
  let ddGlowClass = styles.goldGlow;
  if (maxDrawdown >= 10 && maxDrawdown < 20) {
    ddZone = "Zona Amarela";
    ddBadge = "ALERTA";
    ddColorClass = styles.kpiBadgeGold;
    ddBorderClass = styles.kpiCardBorderAmber;
    ddGlowClass = styles.amberGlow;
  } else if (maxDrawdown >= 20) {
    ddZone = "Zona Vermelha";
    ddBadge = "CRÍTICO";
    ddColorClass = styles.kpiBadgeRed;
    ddBorderClass = styles.kpiCardBorderRed;
    ddGlowClass = styles.redGlow;
  }

  // Extract history curves
  const balanceHistory = history.map((h) => h.balance);
  const equityHistory = history.map((h) => h.balance + h.profit);
  const dailyProfitHistory = history.map((h) => h.profit);
  
  // Cumulative global profit path
  let globalCum = 0;
  const globalProfitHistory = history.map((h) => {
    globalCum += h.profit;
    return globalCum;
  });

  // Simulated drawdown risk curves
  const drawdownTrendHistory = history.map((h) => (h.profit < 0 ? Math.abs(h.profit) : 0));

  // Patrimônio Líquido
  const equityCalc = balance + floatingPl;
  const equityDiffCalc = equityCalc - balance; // = floatingPl
  const equityDiffPctCalc = balance > 0 ? (equityDiffCalc / balance) * 100 : 0;

  return (
    <div className={styles.kpiRowGrid}>
      {/* 1. Saldo da Conta */}
      <div className={`${styles.kpiCardMockup} ${styles.kpiCardBorderGold} ${styles.kpiCardLarge}`}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Saldo da Conta</span>
          <div className={`${styles.kpiIconContainer} ${styles.goldGlow}`}>
            <Wallet size={14} />
          </div>
        </div>
        <span className={`${styles.kpiValueMockup} tabular-nums`}>{formatValPrimary(balance)}</span>
        <span className={`${styles.kpiSubValueMockup} tabular-nums`}>{formatValSecondary(balance)}</span>
        <span className={`${styles.kpiBadgeMockup} ${styles.kpiBadgeGreen}`}>
          {currencyMode === "CENT" ? "CENT" : "BRL"}
        </span>
        <Sparkline data={balanceHistory} color="var(--neon-gold)" />
      </div>

      {/* 2. Patrimônio Líquido */}
      <div className={`${styles.kpiCardMockup} ${floatingPl >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderRed} ${styles.kpiCardLarge}`}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>P. Líquido</span>
          <div className={`${styles.kpiIconContainer} ${equityDiffCalc >= 0 ? styles.greenGlow : styles.redGlow}`}>
            <Coins size={14} />
          </div>
        </div>
        <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: equityDiffCalc >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
          {formatValPrimary(equityCalc)}
        </span>
        <span className={`${styles.kpiSubValueMockup} tabular-nums`}>
          {formatValSecondary(equityCalc)} · {equityDiffPctCalc >= 0 ? "+" : ""}{equityDiffPctCalc.toFixed(2)}%
        </span>
        <span className={`${styles.kpiBadgeMockup} ${floatingPl >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          P/L: {floatingPl >= 0 ? "+" : ""}{formatValPrimary(floatingPl)}
        </span>
        <Sparkline data={equityHistory} color={floatingPl >= 0 ? "var(--neon-green)" : "var(--neon-red)"} />
      </div>

      {/* 3. Lucro Hoje */}
      <div className={`${styles.kpiCardMockup} ${dailyProfit >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderAmber} ${styles.kpiCardSmall}`}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Lucro Hoje</span>
          <div className={`${styles.kpiIconContainer} ${dailyProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
            <TrendingUp size={14} />
          </div>
        </div>
        <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {dailyProfit >= 0 ? "+" : ""}{formatValPrimary(dailyProfit)}
        </span>
        <span className={`${styles.kpiSubValueMockup} tabular-nums`}>
          {dailyProfit >= 0 ? "+" : ""}{formatValSecondary(dailyProfit)}
        </span>
        <span className={`${styles.kpiBadgeMockup} ${dailyProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {dailyProfit >= 0 ? "+" : ""}{dailyPct.toFixed(2)}%
        </span>
        <Sparkline data={dailyProfitHistory} color={dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)"} />
      </div>

      {/* 4. L. Global */}
      <div className={`${styles.kpiCardMockup} ${totalProfit >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderAmber} ${styles.kpiCardSmall}`}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>L. Global</span>
          <div className={`${styles.kpiIconContainer} ${totalProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
            <Globe size={14} />
          </div>
        </div>
        <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {totalProfit >= 0 ? "+" : ""}{formatValPrimary(totalProfit)}
        </span>
        <span className={`${styles.kpiSubValueMockup} tabular-nums`}>
          {totalProfit >= 0 ? "+" : ""}{formatValSecondary(totalProfit)}
        </span>
        <span className={`${styles.kpiBadgeMockup} ${totalProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {totalProfit >= 0 ? "+" : ""}{periodPct.toFixed(2)}%
        </span>
        <Sparkline data={globalProfitHistory} color={totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)"} />
      </div>

      {/* 5. Drawdown Atual */}
      <div className={`${styles.kpiCardMockup} ${ddBorderClass} ${styles.kpiCardSmall}`}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Drawdown Atual</span>
          <div className={`${styles.kpiIconContainer} ${ddGlowClass}`}>
            <ShieldAlert size={14} />
          </div>
        </div>
        <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)" }}>
          {maxDrawdown.toFixed(1)}%
        </span>
        <span className={styles.kpiSubValueMockup}>
          {ddZone} · Limite 40%
        </span>
        <span className={`${styles.kpiBadgeMockup} ${ddColorClass}`} style={{ marginBottom: "0.2rem" }}>
          {ddBadge}
        </span>
        
        <div style={{ marginTop: "0.4rem", width: "100%", height: "3px", background: "var(--opacity-divider)", borderRadius: "2px", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (maxDrawdown / 40) * 100)}%`,
              background: maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)",
              opacity: 0.8,
              transition: "width 0.5s ease"
            }}
          />
          <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, width: "1px", background: "var(--opacity-border)" }} />
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "var(--opacity-border)" }} />
        </div>

        <Sparkline data={drawdownTrendHistory} color={maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)"} />
      </div>
    </div>
  );
}
