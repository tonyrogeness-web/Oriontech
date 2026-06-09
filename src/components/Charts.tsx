"use client";

import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface ChartsProps {
  history: PerformancePoint[];
  currencyMode?: "CENT_BRL" | "USD_STAND" | "BRL_STAND";
}

export default function Charts({ history = [], currencyMode = "CENT_BRL" }: ChartsProps) {
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
    if (currencyMode === "CENT_BRL") {
      if (val >= 1000) return `${(val / 1000).toFixed(0)}k USC`;
      return `${val} USC`;
    } else if (currencyMode === "USD_STAND") {
      if (val >= 1000) return `$ ${(val / 1000).toFixed(0)}k`;
      return `$ ${val}`;
    } else {
      if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
      return `R$ ${val}`;
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
  const lineData = filteredHistory.map((h) => ({
    name: formatDate(h.date),
    balance: parseFloat(h.balance.toFixed(2)),
  }));

  // Calculate growth percentage for the filtered period
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

        {/* Timeframe Filters */}
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

      {lineData.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhum histórico disponível.</p>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%" }}>
          {/* Growth floating tag */}
          <div style={{
            position: "absolute",
            top: "5px",
            right: "10px",
            background: "rgba(0, 230, 118, 0.08)",
            border: "1px solid rgba(0, 230, 118, 0.2)",
            color: "var(--neon-green)",
            fontSize: "0.65rem",
            fontWeight: 800,
            padding: "0.15rem 0.35rem",
            borderRadius: "4px",
            zIndex: 10,
          }}>
            {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(2)}%
          </div>

          <div className={styles.chartContainer} style={{ height: "230px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="performanceGlowGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0} />
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
                  formatter={(value: any) => {
                    const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (currencyMode === "CENT_BRL") {
                      return [`${formatted} USC`, "Saldo"];
                    } else if (currencyMode === "USD_STAND") {
                      return [`$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Saldo"];
                    } else {
                      return [`R$ ${formatted}`, "Saldo"];
                    }
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--neon-green)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#performanceGlowGreen)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
