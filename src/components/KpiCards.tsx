"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import styles from "./components.module.css";

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  status: string;
  accountNumber: string;
  history: any[];
  brlRate?: number;
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  status = "RUNNING",
  accountNumber = "",
  history = [],
  brlRate = 5.45,
}: KpiCardsProps) {
  const formatCurrency = (val: number) => {
    const sign = val < 0 ? "-" : "";
    const formatted = Math.abs(val).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}USC ${formatted}`;
  };

  const formatBRL = (uscVal: number) => {
    const usdVal = uscVal / 100;
    const brlVal = usdVal * brlRate;
    const sign = brlVal < 0 ? "-" : "";
    const formatted = Math.abs(brlVal).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}R$ ${formatted} BRL`;
  };

  const isRobotActive = status === "RUNNING";

  // Calculate percentage and cash equity changes
  const equityDiff = equity - balance;
  const equityDiffPct = balance > 0 ? (equityDiff / balance) * 100 : 0;
  
  // Format daily profit percentage
  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;

  // Mini sparkline data derived from history
  const sparklineData = history.slice(-10).map((h) => ({ val: h.balance }));

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* 1. Big Balance & Equity Panel */}
      <div className={styles.balancePanel}>
        <div className={styles.balanceHeader}>
          <span>Conta: <strong>{accountNumber}</strong></span>
          <span className={isRobotActive ? styles.robotStatusBadge : styles.robotStatusPausedBadge}>
            Robô {isRobotActive ? "ATIVO" : "PAUSADO"}
          </span>
        </div>

        <div className={styles.balanceGrid}>
          {/* Account Balance Column */}
          <div className={styles.balanceColumn}>
            <span className={styles.balanceLabel}>Saldo da Conta</span>
            <span className={styles.balanceValue}>{formatCurrency(balance)}</span>
            <span className={styles.brlSubValue}>{formatBRL(balance)}</span>
          </div>

          {/* Equity Column */}
          <div className={styles.balanceColumn}>
            <span className={styles.balanceLabel}>Patrimônio (Equity)</span>
            <span className={styles.equityValue}>{formatCurrency(equity)}</span>
            <span className={styles.brlSubValue}>{formatBRL(equity)}</span>
            
            {/* Sparkline & P/L Changes */}
            <div className={styles.equityGrowthWrapper}>
              <span style={{
                color: dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)",
                fontWeight: 700
              }}>
                {dailyProfit >= 0 ? "+" : ""}{dailyPct.toFixed(2)}% | {dailyProfit >= 0 ? "+" : ""}{formatCurrency(dailyProfit)}
              </span>

              {/* Dynamic Sparkline Area Chart */}
              {sparklineData.length > 0 && (
                <div className={styles.sparklinePlaceholder}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
                      <defs>
                        <linearGradient id="sparkGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--neon-gold)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--neon-gold)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke="var(--neon-gold)"
                        strokeWidth={1.5}
                        dot={false}
                        fillOpacity={1}
                        fill="url(#sparkGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid of 4 Cards (Daily Profit, Floating P&L, Total Profit, Drawdown) */}
      <div className={styles.kpiGrid}>
        {/* Lucro Diário */}
        <div className={`${styles.kpiCard} ${styles.kpiDailyCard}`}>
          <span className={styles.kpiLabel}>Lucro Diário</span>
          <span className={`${styles.kpiValue} ${dailyProfit >= 0 ? styles.valuePositive : styles.valueNegative}`}>
            {dailyProfit >= 0 ? "+" : ""}{formatCurrency(dailyProfit)}
          </span>
          <span className={styles.brlKpiValue}>
            {dailyProfit >= 0 ? "+" : ""}{formatBRL(dailyProfit)}
          </span>
        </div>

        {/* Flutuante P&L */}
        <div className={`${styles.kpiCard} ${styles.kpiFloatingCard}`}>
          <span className={styles.kpiLabel}>Resultado Flutuante</span>
          <span className={`${styles.kpiValue} ${floatingPl >= 0 ? styles.valuePositive : styles.valueNegative}`}>
            {floatingPl >= 0 ? "+" : ""}{formatCurrency(floatingPl)}
          </span>
          <span className={styles.brlKpiValue}>
            {floatingPl >= 0 ? "+" : ""}{formatBRL(floatingPl)}
          </span>
        </div>

        {/* Lucro Total */}
        <div className={`${styles.kpiCard} ${styles.kpiTotalCard}`}>
          <span className={styles.kpiLabel}>Lucro Total</span>
          <span className={`${styles.kpiValue} ${totalProfit >= 0 ? styles.valuePositive : styles.valueNegative}`}>
            {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
          </span>
          <span className={styles.brlKpiValue}>
            {totalProfit >= 0 ? "+" : ""}{formatBRL(totalProfit)}
          </span>
        </div>

        {/* Drawdown */}
        <div className={`${styles.kpiCard} ${styles.kpiDrawdownCard}`}>
          <span className={styles.kpiLabel}>Drawdown</span>
          <span className={`${styles.kpiValue} ${maxDrawdown >= 10 ? styles.valueRed : styles.valuePositive}`}>
            Máx: {maxDrawdown.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
