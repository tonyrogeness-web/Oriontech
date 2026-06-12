"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
  equity?: number | null;
  gain?: number;
  loss?: number;
}

interface ChartsProps {
  history: PerformancePoint[];
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function Charts({ history = [], currencyMode = "CENT", brlRate = 5.45 }: ChartsProps) {
  const [timeframe, setTimeframe] = useState<"DIÁRIO" | "7D" | "30D">("7D");

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val: number) => {
    if (currencyMode === "CENT") {
      if (Math.abs(val) >= 10000) return `${(val / 1000).toFixed(0)}k USC`;
      if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k USC`;
      return `${val} USC`;
    } else { // BRL
      if (Math.abs(val) >= 10000) return `R$ ${(val / 1000).toFixed(1)}k`;
      if (Math.abs(val) >= 1000) return `R$ ${(val / 1000).toFixed(2)}k`;
      return `R$ ${val}`;
    }
  };

  const formatValPrimary = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (currencyMode === "CENT") {
      return `${sign}${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    } else {
      return `${sign}R$ ${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Process history: calculate currency conversions and percentages per day
  const processedHistory = history.map((h) => {
    let balVal = h.balance;
    let profitVal = h.profit;

    if (currencyMode === "BRL") {
      balVal = (h.balance / 100) * brlRate;
      profitVal = (h.profit / 100) * brlRate;
    }

    // Previous balance (start of day)
    const prevBal = balVal - profitVal;
    // Daily percentage profit
    const profitPercent = prevBal > 0 ? (profitVal / prevBal) * 100 : 0;

    return {
      dateRaw: h.date,
      name: formatDate(h.date),
      balance: parseFloat(balVal.toFixed(2)),
      profit: parseFloat(profitVal.toFixed(2)),
      profitPercent: parseFloat(profitPercent.toFixed(2)),
      formattedPercent: `${profitVal >= 0 ? "+" : ""}${profitPercent.toFixed(2)}%`,
    };
  });

  // Filter out today and tomorrow (in local timezone context) to ensure ONLY fixed completed days are shown
  const todayStr = new Date().toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });

  const completedHistory = processedHistory.filter((h) => {
    return h.name !== todayStr && h.name !== tomorrowStr;
  });

  // Filter based on selected timeframe
  const getFilteredHistory = () => {
    if (!completedHistory || completedHistory.length === 0) return [];
    if (timeframe === "DIÁRIO") return completedHistory.slice(-2); // 2 last completed days
    if (timeframe === "7D") return completedHistory.slice(-7);
    return completedHistory.slice(-30);
  };

  const chartData = getFilteredHistory();

  // Summary statistics calculation
  const totalPeriodProfit = chartData.reduce((sum, d) => sum + d.profit, 0);
  
  // Starting balance of the selected period
  const startingBalance = chartData.length > 0 
    ? (chartData[0].balance - chartData[0].profit) 
    : 1000;
  
  const totalPeriodPercent = startingBalance > 0 
    ? (totalPeriodProfit / startingBalance) * 100 
    : 0;

  const tradingDays = chartData.filter((d) => d.profit !== 0);
  const positiveDays = chartData.filter((d) => d.profit > 0);
  const winRate = tradingDays.length > 0 ? (positiveDays.length / tradingDays.length) * 100 : 100;

  const bestDay = chartData.length > 0 ? Math.max(...chartData.map(d => d.profit)) : 0;
  const worstDay = chartData.length > 0 ? Math.min(...chartData.map(d => d.profit)) : 0;

  // Find max absolute value to align Y axis symmetrically
  let maxAbsVal = 5;
  chartData.forEach((d) => {
    const val = Math.abs(d.profit);
    if (val > maxAbsVal) maxAbsVal = val;
  });
  const yDomain = [-maxAbsVal * 1.15, maxAbsVal * 1.15];

  return (
    <div className={styles.chartsCard}>
      {/* Header with Title and Timeframe filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.05rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>📊 Retornos Diários</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.04)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
            Valores & Percentuais
          </span>
        </h3>
        
        {/* Timeframe Selectors */}
        <div className={styles.chartFilters}>
          <button
            className={`${styles.chartFilterBtn} ${timeframe === "DIÁRIO" ? styles.chartFilterBtnActive : ""}`}
            onClick={() => setTimeframe("DIÁRIO")}
          >
            Diário
          </button>
          <button
            className={`${styles.chartFilterBtn} ${timeframe === "7D" ? styles.chartFilterBtnActive : ""}`}
            onClick={() => setTimeframe("7D")}
          >
            7 Dias
          </button>
          <button
            className={`${styles.chartFilterBtn} ${timeframe === "30D" ? styles.chartFilterBtnActive : ""}`}
            onClick={() => setTimeframe("30D")}
          >
            30 Dias
          </button>
        </div>
      </div>

      {/* Period Statistics Summary Bar */}
      <div className={styles.chartSummaryBar} style={{ marginBottom: "1.25rem", gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Lucro Período</span>
          <span className={styles.summaryValue} style={{ color: totalPeriodProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
            {formatValPrimary(totalPeriodProfit)}
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            ({totalPeriodPercent >= 0 ? "+" : ""}{totalPeriodPercent.toFixed(2)}%)
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Taxa de Acerto</span>
          <span className={styles.summaryValue} style={{ color: "var(--neon-green)" }}>
            {winRate.toFixed(1)}%
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            {positiveDays.length} de {tradingDays.length} dias
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Melhor Dia</span>
          <span className={styles.summaryValue} style={{ color: "var(--neon-green)" }}>
            {formatValPrimary(bestDay)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Pior Dia</span>
          <span className={styles.summaryValue} style={{ color: worstDay >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
            {formatValPrimary(worstDay)}
          </span>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className={styles.chartContainer} style={{ height: "230px" }}>
        {chartData.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)" }}>
            Sem dados de histórico disponíveis para o período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                fontSize={9}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={9}
                tickLine={false}
                domain={yDomain}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel-solid)",
                  borderColor: "var(--border-active)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-primary)",
                }}
                formatter={(value: any, name: any, props: any) => {
                  const item = props.payload;
                  return [
                    <div key="tooltip-content" style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <span style={{ color: item.profit >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontWeight: 700 }}>
                        {formatValPrimary(item.profit)} ({item.formattedPercent})
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Saldo Final: {formatValPrimary(item.balance)}
                      </span>
                    </div>,
                    "Retorno Diário"
                  ];
                }}
              />
              <ReferenceLine y={0} stroke="var(--opacity-border)" strokeWidth={1} />
              
              <Bar dataKey="profit" radius={[4, 4, 4, 4]} maxBarSize={30}>
                {chartData.map((entry, index) => {
                  const isPositive = entry.profit >= 0;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isPositive ? "var(--neon-green)" : "var(--neon-red)"}
                      fillOpacity={0.85}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily list with detailed percentage breakdown for mobile readability */}
      {chartData.length > 0 && (
        <div style={{
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          maxHeight: "110px",
          overflowY: "auto",
          paddingRight: "0.25rem",
          borderTop: "1px solid var(--border-light)",
          paddingTop: "0.75rem"
        }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
            Detalhamento Diário (Últimos Dias)
          </span>
          {[...chartData].reverse().slice(0, 5).map((day, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.72rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.01)",
                border: "1px solid rgba(255, 255, 255, 0.02)"
              }}
            >
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{day.name}</span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>{formatValPrimary(day.balance)}</span>
                <span style={{ color: day.profit >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontWeight: 700 }}>
                  {day.profit >= 0 ? "+" : ""}{formatValPrimary(day.profit)} ({day.formattedPercent})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
