"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp } from "lucide-react";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface ChartsProps {
  history: PerformancePoint[];
}

export default function Charts({ history = [] }: ChartsProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  // Construct chart data
  const data = history.map((h) => ({
    name: formatDate(h.date),
    lucro: parseFloat(h.profit.toFixed(2)),
    saldo: parseFloat(h.balance.toFixed(2)),
  }));

  return (
    <div className={styles.chartsCard}>
      <h3 className={styles.cardTitle}>
        <TrendingUp size={20} className={styles.logoAccent} />
        Curva de Performance (USC)
      </h3>

      {data.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhum histórico de performance disponível ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Main Balance Curve */}
          <div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
              Crescimento de Saldo Acumulado
            </span>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-blue)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--neon-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
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
                    formatter={(value: any) => [`USC ${value}`, "Saldo"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="var(--neon-blue)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSaldo)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Profits Bar Chart */}
          <div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
              Lucro Diário
            </span>
            <div className={styles.chartContainer} style={{ height: "120px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={formatCurrency} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-panel-solid)",
                      borderColor: "var(--border-active)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-primary)",
                    }}
                    formatter={(value: any) => [`USC ${value}`, "Lucro"]}
                  />
                  <Bar
                    dataKey="lucro"
                    fill="var(--neon-green)"
                    radius={[4, 4, 0, 0]}
                    // Dynamic coloring for positive/negative days
                    fillOpacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
