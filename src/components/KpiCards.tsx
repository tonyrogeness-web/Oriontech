"use client";

import React from "react";
import { Wallet, Coins, TrendingUp, Globe, ShieldAlert } from "lucide-react";
import styles from "./components.module.css";

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  brlRate?: number;
  currencyMode: "CENT_BRL" | "USD_STAND" | "BRL_STAND";
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  brlRate = 5.45,
  currencyMode = "CENT_BRL",
}: KpiCardsProps) {
  // Format primary value (main display)
  const formatValPrimary = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT_BRL") {
      const convertedBrl = (val / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (currencyMode === "USD_STAND") {
      return `$ ${absVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else {
      // BRL_STAND
      return `R$ ${absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  // Format secondary value (sub-label)
  const formatValSecondary = (val: number) => {
    const absVal = Math.abs(val);
    const formattedNum = absVal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (currencyMode === "CENT_BRL") {
      return `${formattedNum} USC`;
    } else if (currencyMode === "USD_STAND") {
      return `${formattedNum} USD`;
    } else {
      return `${formattedNum} BRL`;
    }
  };

  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;
  const periodPct = balance > 0 ? (totalProfit / balance) * 100 : 0;
  const isLossDaily = dailyProfit < 0;
  const isLossTotal = totalProfit < 0;

  // Drawdown category
  let ddZone = "Zona Verde";
  let ddBadge = "SEGURO";
  let ddColorClass = styles.kpiBadgeGreen;
  let ddGlowClass = styles.goldGlow;
  if (maxDrawdown >= 10 && maxDrawdown < 20) {
    ddZone = "Zona Amarela";
    ddBadge = "ALERTA";
    ddColorClass = styles.kpiBadgeGold;
    ddGlowClass = styles.amberGlow;
  } else if (maxDrawdown >= 20) {
    ddZone = "Zona Vermelha";
    ddBadge = "CRÍTICO";
    ddColorClass = styles.kpiBadgeRed;
    ddGlowClass = styles.redGlow;
  }

  // Patrimônio Líquido = Saldo + P/L flutuante (igual ao MT5 ACCOUNT_EQUITY)
  const equityCalc = balance + floatingPl;
  const equityDiffCalc = equityCalc - balance; // = floatingPl
  const equityDiffPctCalc = balance > 0 ? (equityDiffCalc / balance) * 100 : 0;

  return (
    <div className={styles.kpiRowGrid}>
      {/* 1. Saldo da Conta */}
      <div className={styles.kpiCardMockup}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Saldo da Conta</span>
          <div className={`${styles.kpiIconContainer} ${styles.goldGlow}`}>
            <Wallet size={14} />
          </div>
        </div>
        <span className={styles.kpiValueMockup}>{formatValPrimary(balance)}</span>
        <span className={styles.kpiSubValueMockup}>{formatValSecondary(balance)}</span>
        <span className={`${styles.kpiBadgeMockup} ${styles.kpiBadgeGreen}`}>
          {currencyMode === "CENT_BRL" ? "CENT" : currencyMode === "USD_STAND" ? "USD" : "BRL"}
        </span>
      </div>

      {/* 2. Patrimônio Líquido (balance + floatingPl) */}
      <div className={styles.kpiCardMockup}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>P. Líquido</span>
          <div className={`${styles.kpiIconContainer} ${equityDiffCalc >= 0 ? styles.greenGlow : styles.redGlow}`}>
            <Coins size={14} />
          </div>
        </div>
        <span className={styles.kpiValueMockup} style={{ color: equityDiffCalc >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
          {formatValPrimary(equityCalc)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {formatValSecondary(equityCalc)} · {equityDiffPctCalc >= 0 ? "+" : ""}{equityDiffPctCalc.toFixed(2)}%
        </span>
        <span className={`${styles.kpiBadgeMockup} ${floatingPl >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          P/L: {floatingPl >= 0 ? "+" : "-"}{formatValSecondary(floatingPl)}
        </span>
      </div>

      {/* 3. Lucro Hoje */}
      <div className={styles.kpiCardMockup}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Lucro Hoje</span>
          <div className={`${styles.kpiIconContainer} ${dailyProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
            <TrendingUp size={14} />
          </div>
        </div>
        <span className={styles.kpiValueMockup} style={{ color: dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {dailyProfit >= 0 ? "+" : "-"}{formatValPrimary(dailyProfit)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {dailyProfit >= 0 ? "+" : "-"}{formatValSecondary(dailyProfit)}
        </span>
        <span className={`${styles.kpiBadgeMockup} ${dailyProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {dailyProfit >= 0 ? "+" : ""}{dailyPct.toFixed(2)}%
        </span>
      </div>

      {/* 4. L. Global (Lucro histórico fechado desde o reset) */}
      <div className={styles.kpiCardMockup}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>L. Global</span>
          <div className={`${styles.kpiIconContainer} ${totalProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
            <Globe size={14} />
          </div>
        </div>
        <span className={styles.kpiValueMockup} style={{ color: totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
          {totalProfit >= 0 ? "+" : "-"}{formatValPrimary(totalProfit)}
        </span>
        <span className={styles.kpiSubValueMockup}>
          {totalProfit >= 0 ? "+" : "-"}{formatValSecondary(totalProfit)}
        </span>
        <span className={`${styles.kpiBadgeMockup} ${totalProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
          {totalProfit >= 0 ? "+" : ""}{periodPct.toFixed(2)}%
        </span>
      </div>

      {/* 5. Drawdown Atual */}
      <div className={styles.kpiCardMockup}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabelMockup}>Drawdown Atual</span>
          <div className={`${styles.kpiIconContainer} ${ddGlowClass}`}>
            <ShieldAlert size={14} />
          </div>
        </div>
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
