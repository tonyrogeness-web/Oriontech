"use client";

import React, { useState } from "react";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine } from "recharts";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
  equity?: number | null;
}

interface ChartsProps {
  history: PerformancePoint[];
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function Charts({ history = [], currencyMode = "CENT", brlRate = 5.45 }: ChartsProps) {
  const [timeframe, setTimeframe] = useState("7D");

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

  // Filter history based on timeframe
  const getFilteredHistory = () => {
    if (!history || history.length === 0) return [];
    if (timeframe === "7D") return history.slice(-7);
    if (timeframe === "30D") return history.slice(-30);
    if (timeframe === "MÊS") return history.slice(-30);
    return history;
  };

  const filteredHistory = getFilteredHistory();
  const lineData = filteredHistory.map((h) => {
    let balVal = h.balance;
    let profitVal = h.profit;
    let eqVal = h.equity !== null && h.equity !== undefined ? h.equity : h.balance;

    if (currencyMode === "BRL") {
      balVal = (h.balance / 100) * brlRate;
      profitVal = (h.profit / 100) * brlRate;
      eqVal = (eqVal / 100) * brlRate;
    }
    
    const floatingPl = eqVal - balVal;
    
    return {
      name: formatDate(h.date),
      balance: parseFloat(balVal.toFixed(2)),
      profit: parseFloat(profitVal.toFixed(2)),
      gain: profitVal > 0 ? parseFloat(profitVal.toFixed(2)) : 0,
      loss: profitVal < 0 ? parseFloat(profitVal.toFixed(2)) : 0,
      floating: parseFloat(floatingPl.toFixed(2)),
    };
  });

  // Calculate statistics for the filtered period
  const tradingDays = lineData.filter((d) => d.profit !== 0);
  const positiveDays = lineData.filter((d) => d.profit > 0);
  const winRate = tradingDays.length > 0 ? (positiveDays.length / tradingDays.length) * 100 : 100;
  
  const totalPeriodProfit = lineData.reduce((sum, d) => sum + d.profit, 0);
  const avgDailyProfit = lineData.length > 0 ? totalPeriodProfit / lineData.length : 0;
  
  const floatings = lineData.map((d) => d.floating);
  const maxDrawdownVal = floatings.length > 0 ? Math.min(...floatings) : 0;

  return (
    <div className={styles.chartsCard}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", margin: 0 }}>
          Desempenho Diário e Risco Flutuante
        </h3>

        {/* Timeframe Filters */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--neon-green)", fontSize: "0.75rem" }}>●</span> Ganhos
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--neon-red)", fontSize: "0.75rem" }}>●</span> Perdas
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--neon-amber)", fontSize: "0.75rem" }}>●</span> Flutuante (Drawdown)
            </span>
          </div>

          <div className={styles.chartFilters}>
            {["7D", "30D", "MÊS", "TUDO"].map((tf) => (
              <button
                key={tf}
                className={`${styles.chartFilterBtn} ${timeframe === tf ? styles.chartFilterBtnActive : ""}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {lineData.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhum histórico disponível.</p>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%" }}>
          {/* Period Summary stats bar */}
          <div className={styles.chartSummaryBar}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Win Rate</span>
              <span className={styles.summaryValue} style={{ color: "var(--neon-green)" }}>
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Média Diária</span>
              <span className={styles.summaryValue} style={{ color: avgDailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
                {formatValPrimary(avgDailyProfit)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Máx. Flutuante</span>
              <span className={styles.summaryValue} style={{ color: maxDrawdownVal < 0 ? "var(--neon-red)" : "var(--neon-green)" }}>
                {formatValPrimary(maxDrawdownVal)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Período</span>
              <span className={styles.summaryValue} style={{ color: totalPeriodProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
                {formatValPrimary(totalPeriodProfit)}
              </span>
            </div>
          </div>

          <div className={styles.chartContainer} style={{ height: "210px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lineData} margin={{ top: 15, right: -5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="var(--text-secondary)"
                  fontSize={9}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--neon-amber)"
                  fontSize={9}
                  tickLine={false}
                  domain={["auto", "auto"]}
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
                  formatter={(value: any, name: any) => {
                    const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const isBrl = currencyMode === "BRL";
                    const prefix = isBrl ? "R$ " : "";
                    const suffix = isBrl ? " BRL" : " USC";
                    
                    let labelName = name;
                    if (name === "gain") labelName = "Ganho Diário";
                    if (name === "loss") labelName = "Perda Diária";
                    if (name === "floating") labelName = "Perda Flutuante";
                    
                    return [`${prefix}${formatted}${suffix}`, labelName];
                  }}
                />
                
                <ReferenceLine yAxisId="left" y={0} stroke="var(--opacity-border)" strokeWidth={1} />
                
                {/* Daily Gain Bar (Green) */}
                <Bar
                  yAxisId="left"
                  dataKey="gain"
                  fill="var(--neon-green)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                  name="gain"
                />
                
                {/* Daily Loss Bar (Red) */}
                <Bar
                  yAxisId="left"
                  dataKey="loss"
                  fill="var(--neon-red)"
                  radius={[0, 0, 4, 4]}
                  maxBarSize={30}
                  name="loss"
                />
                
                {/* Floating Loss Line (Amber/Red) */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="floating"
                  stroke="var(--neon-amber)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--neon-amber)", strokeWidth: 1 }}
                  name="floating"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
