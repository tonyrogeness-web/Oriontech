"use client";

import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine } from "recharts";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface ChartsProps {
  history: PerformancePoint[];
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function Charts({ history = [], currencyMode = "CENT", brlRate = 5.45 }: ChartsProps) {
  const [timeframe, setTimeframe] = useState("7D");
  const [showDailyProfit, setShowDailyProfit] = useState(false);

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
      if (val >= 1000) return `${(val / 1000).toFixed(0)}k USC`;
      return `${val} USC`;
    } else { // BRL
      if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
      return `R$ ${val}`;
    }
  };

  const formatValPrimary = (val: number) => {
    if (currencyMode === "CENT") {
      return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    } else {
      return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    if (currencyMode === "BRL") {
      balVal = (h.balance / 100) * brlRate;
      profitVal = (h.profit / 100) * brlRate;
    }
    return {
      name: formatDate(h.date),
      balance: parseFloat(balVal.toFixed(2)),
      profit: parseFloat(profitVal.toFixed(2)),
    };
  });

  // Calculate statistics for the filtered period
  const balances = lineData.map((d) => d.balance);
  const minBalance = balances.length > 0 ? Math.min(...balances) : 0;
  const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
  
  const startBalance = lineData.length > 0 ? lineData[0].balance : 0;
  const off = (maxBalance - minBalance) === 0
    ? 0.5
    : Math.max(0, Math.min(1, (maxBalance - startBalance) / (maxBalance - minBalance)));

  let growthPct = 0;
  if (lineData.length > 1) {
    const startVal = lineData[0].balance;
    const endVal = lineData[lineData.length - 1].balance;
    if (startVal > 0) {
      growthPct = ((endVal - startVal) / startVal) * 100;
    }
  }

  return (
    <div className={styles.chartsCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", marginBottom: "0.15rem" }}>
            Curva de Patrimônio
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Evolução do equity em tempo real
          </span>
        </div>

        {/* Timeframe Filters & Daily Profit Toggle */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Toggle Button for Daily Profit Line */}
          {lineData.length > 0 && (
            <button
              className={`${styles.chartFilterBtn} ${showDailyProfit ? styles.chartFilterBtnActive : ""}`}
              onClick={() => setShowDailyProfit(!showDailyProfit)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: showDailyProfit ? "var(--neon-gold)" : "var(--text-muted)",
                borderColor: showDailyProfit ? "rgba(255, 184, 0, 0.3)" : "rgba(255, 255, 255, 0.06)",
                background: showDailyProfit ? "rgba(255, 184, 0, 0.05)" : "transparent",
              }}
              title="Exibir série de Lucro Diário consolidado"
            >
              <span style={{ fontSize: "0.68rem" }}>● Diário</span>
            </button>
          )}

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
              <span className={styles.summaryLabel}>Mínimo</span>
              <span className={styles.summaryValue}>{formatValPrimary(minBalance)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Máximo</span>
              <span className={styles.summaryValue}>{formatValPrimary(maxBalance)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Variação Período</span>
              <span className={styles.summaryValue} style={{ color: growthPct >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
                {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className={styles.chartContainer} style={{ height: "210px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor="var(--neon-green)" stopOpacity={0.25} />
                    <stop offset={off} stopColor="var(--neon-red)" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
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
                    
                    const labelName = name === "balance" ? "Saldo" : "Lucro Diário";
                    return [`${prefix}${formatted}${suffix}`, labelName];
                  }}
                />
                
                {/* Horizontal reference line for the initial period value */}
                {lineData.length > 0 && (
                  <ReferenceLine
                    y={lineData[0].balance}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeDasharray="3 3"
                    label={{
                      value: "Ponto Inicial",
                      position: "left",
                      fill: "var(--text-muted)",
                      fontSize: 8,
                      offset: 5,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--neon-green)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#splitColor)"
                  dot={false}
                  name="balance"
                />

                {/* Overlaid Daily Profit line */}
                {showDailyProfit && (
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--neon-gold)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: "var(--neon-gold)", strokeWidth: 1 }}
                    name="profit"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
