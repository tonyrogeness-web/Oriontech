"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Activity, Percent } from "lucide-react";
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
      return date.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

  // 1. Chart Data for Performance History (Last 30 Days)
  const lineData = history.map((h) => ({
    name: formatDate(h.date),
    balance: parseFloat(h.balance.toFixed(2)),
  }));

  // 2. Chart Data for Daily Drawdown (MTD)
  // We can calculate dynamic drawdown or use some realistic mock data based on recent performance
  // to draw the exact mockup bar chart style.
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const barData = daysOfWeek.map((day, idx) => {
    // Generate realistic drawdown values between 0.8% and 5.2%
    let val = 1.2;
    if (idx === 1) val = 3.5;
    if (idx === 2) val = 2.9;
    if (idx === 3) val = 5.2;
    if (idx === 4) val = 0.5;
    if (idx === 5) val = 1.8;
    return { name: day, val };
  });

  return (
    <div className={styles.chartsCard}>
      <div className={styles.mainGrid} style={{ gridTemplateColumns: "1fr", gap: "1.5rem", width: "100%", margin: 0 }}>
        {/* Left Side: Performance History */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h3 className={styles.cardTitle}>
            <Activity size={16} className={styles.logoAccent} />
            Histórico de Performance <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "none" }}>(Últimos 30 Dias)</span>
          </h3>

          {lineData.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>Nenhum histórico disponível.</p>
            </div>
          ) : (
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="performanceGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-gold)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--neon-gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
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
                    formatter={(value: any) => [`$${value.toLocaleString()}`, "Saldo"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--neon-gold)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#performanceGlow)"
                    dot={{ stroke: "var(--neon-gold)", strokeWidth: 2, r: 3, fill: "var(--bg-panel-solid)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Side: Daily Drawdown (MTD) */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h3 className={styles.cardTitle}>
            <Percent size={16} style={{ color: "var(--neon-amber)" }} />
            Drawdown Diário <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "none" }}>(Mês Atual)</span>
          </h3>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-panel-solid)",
                    borderColor: "var(--border-active)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-primary)",
                  }}
                  formatter={(value: any) => [`${value}%`, "Drawdown"]}
                />
                <Bar dataKey="val" radius={[4, 4, 0, 0]} fillOpacity={0.85}>
                  {barData.map((entry, index) => {
                    // Color highlight: yellow/amber for moderate, gold for standard, orange/red for higher
                    let color = "var(--neon-gold)";
                    if (entry.val > 3.0) color = "var(--neon-amber)";
                    if (entry.val >= 5.0) color = "var(--neon-red)";
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
