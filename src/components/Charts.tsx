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
  const [chartType, setChartType] = useState<"COMPOSTO" | "SEMANAL">("COMPOSTO");

  // Group history by day of the week for static profit stats
  const getWeeklyDistribution = () => {
    const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const totals = weekdays.map(day => ({ name: day, profit: 0, gain: 0, loss: 0 }));
    
    history.forEach((h) => {
      let profitVal = h.profit;
      let gainVal = (h as any).gain !== undefined && (h as any).gain !== null ? (h as any).gain : (profitVal > 0 ? profitVal : 0);
      let lossVal = (h as any).loss !== undefined && (h as any).loss !== null ? (h as any).loss : (profitVal < 0 ? profitVal : 0);
      
      if (currencyMode === "BRL") {
        profitVal = (profitVal / 100) * brlRate;
        gainVal = (gainVal / 100) * brlRate;
        lossVal = (lossVal / 100) * brlRate;
      }
      
      const date = new Date(h.date);
      const dayIdx = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      totals[dayIdx].profit += profitVal;
      totals[dayIdx].gain += gainVal;
      totals[dayIdx].loss += lossVal;
    });
    
    // Filter out Sunday and Saturday if they have zero deals
    return totals.filter((d, idx) => (idx !== 0 && idx !== 6) || d.profit !== 0).map(d => ({
      ...d,
      profit: parseFloat(d.profit.toFixed(2)),
      gain: parseFloat(d.gain.toFixed(2)),
      loss: parseFloat(d.loss.toFixed(2))
    }));
  };

  const weeklyData = getWeeklyDistribution();
  
  // Calculate max abs value for weekly data y-axis scaling
  let maxAbsWeekly = 5;
  weeklyData.forEach((d) => {
    const val1 = Math.abs(d.gain);
    const val2 = Math.abs(d.loss);
    const m = Math.max(val1, val2);
    if (m > maxAbsWeekly) maxAbsWeekly = m;
  });
  const weeklyDomain = [-maxAbsWeekly * 1.15, maxAbsWeekly * 1.15];

  // Weekly stats
  const weeklyTotalGains = weeklyData.reduce((sum, d) => sum + d.gain, 0);
  const weeklyTotalLosses = weeklyData.reduce((sum, d) => sum + d.loss, 0);
  const weeklyNetProfit = weeklyData.reduce((sum, d) => sum + d.profit, 0);

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

  // Process the full history to calculate cumulative curves first, avoiding reset when filtering timeframes
  let runningCumProfit = 0;
  const fullProcessedHistory = history.map((h) => {
    let balVal = h.balance;
    let profitVal = h.profit;
    let eqVal = h.equity !== null && h.equity !== undefined ? h.equity : h.balance;

    if (currencyMode === "BRL") {
      balVal = (h.balance / 100) * brlRate;
      profitVal = (h.profit / 100) * brlRate;
      eqVal = (eqVal / 100) * brlRate;
    }

    runningCumProfit += profitVal;
    const floatingPl = eqVal - balVal;
    const netProfit = runningCumProfit + floatingPl;

    // Use actual gain and loss if sent by the robot, otherwise fallback
    const gainVal = (h as any).gain !== undefined && (h as any).gain !== null
      ? (currencyMode === "BRL" ? ((h as any).gain / 100) * brlRate : (h as any).gain)
      : (profitVal > 0 ? profitVal : 0);

    const lossVal = (h as any).loss !== undefined && (h as any).loss !== null
      ? (currencyMode === "BRL" ? ((h as any).loss / 100) * brlRate : (h as any).loss)
      : (profitVal < 0 ? profitVal : 0);

    return {
      dateRaw: h.date,
      name: formatDate(h.date),
      balance: parseFloat(balVal.toFixed(2)),
      profit: parseFloat(profitVal.toFixed(2)),
      gain: parseFloat(gainVal.toFixed(2)),
      loss: parseFloat(lossVal.toFixed(2)),
      floating: parseFloat(floatingPl.toFixed(2)),
      cumProfit: parseFloat(runningCumProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
    };
  });

  // Filter history based on timeframe from the processed data
  const getFilteredHistory = () => {
    if (!fullProcessedHistory || fullProcessedHistory.length === 0) return [];
    if (timeframe === "DIÁRIO") return fullProcessedHistory.slice(-2); // Show last 2 days (yesterday and today)
    if (timeframe === "7D") return fullProcessedHistory.slice(-7);
    if (timeframe === "30D") return fullProcessedHistory.slice(-30);
    if (timeframe === "MÊS") return fullProcessedHistory.slice(-30);
    return fullProcessedHistory;
  };

  const lineData = getFilteredHistory();

  // Calculate symmetric domains centered around 0 to align 0 baseline of left/right Y-axes
  let maxAbsLeft = 10;
  lineData.forEach((d) => {
    const val1 = Math.abs(d.floating);
    const val2 = Math.abs(d.cumProfit);
    const val3 = Math.abs(d.netProfit);
    const m = Math.max(val1, val2, val3);
    if (m > maxAbsLeft) maxAbsLeft = m;
  });
  const leftDomain = [-maxAbsLeft * 1.15, maxAbsLeft * 1.15];

  let maxAbsRight = 5;
  lineData.forEach((d) => {
    const val1 = Math.abs(d.gain);
    const val2 = Math.abs(d.loss);
    const m = Math.max(val1, val2);
    if (m > maxAbsRight) maxAbsRight = m;
  });
  const rightDomain = [-maxAbsRight * 1.15, maxAbsRight * 1.15];

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
      {/* Top Header: Title and Toggle between Composto and Dia da Semana */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.05rem", margin: 0 }}>
          {chartType === "COMPOSTO" ? "Desempenho Diário e Curva de Lucros" : "Distribuição de Lucros por Dia da Semana"}
        </h3>
        
        {/* Chart type filter */}
        <div className={styles.chartFilters}>
          <button
            className={`${styles.chartFilterBtn} ${chartType === "COMPOSTO" ? styles.chartFilterBtnActive : ""}`}
            onClick={() => setChartType("COMPOSTO")}
            style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
          >
            Dinâmico (Curvas)
          </button>
          <button
            className={`${styles.chartFilterBtn} ${chartType === "SEMANAL" ? styles.chartFilterBtnActive : ""}`}
            onClick={() => setChartType("SEMANAL")}
            style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
          >
            Fixo (Dia da Semana)
          </button>
        </div>
      </div>

      {/* Timeframe & Legend Row */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        {chartType === "COMPOSTO" ? (
          <>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-green)", fontSize: "0.75rem" }}>●</span> Ganhos
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-red)", fontSize: "0.75rem" }}>●</span> Perdas
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-amber)", fontSize: "0.75rem" }}>●</span> Flutuante
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-gold)", fontSize: "0.75rem" }}>●</span> L. Global
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "#00e5ff", fontSize: "0.75rem" }}>●</span> L. Líquido
              </span>
            </div>

            <div className={styles.chartFilters}>
              {["DIÁRIO", "7D", "30D", "MÊS", "TUDO"].map((tf) => (
                <button
                  key={tf}
                  className={`${styles.chartFilterBtn} ${timeframe === tf ? styles.chartFilterBtnActive : ""}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-green)", fontSize: "0.75rem" }}>●</span> Ganhos Realizados
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--neon-red)", fontSize: "0.75rem" }}>●</span> Perdas Realizadas
              </span>
            </div>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Dados Consolidados Históricos
            </span>
          </>
        )}
      </div>

      {lineData.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhum histórico disponível.</p>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%" }}>
          
          {/* Summary stats bar (Dynamic based on selected chart type) */}
          <div className={styles.chartSummaryBar}>
            {chartType === "COMPOSTO" ? (
              <>
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
              </>
            ) : (
              <>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Ganhos Totais</span>
                  <span className={styles.summaryValue} style={{ color: "var(--neon-green)" }}>
                    {formatValPrimary(weeklyTotalGains)}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Perdas Totais</span>
                  <span className={styles.summaryValue} style={{ color: "var(--neon-red)" }}>
                    {formatValPrimary(weeklyTotalLosses)}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Lucro Líquido</span>
                  <span className={styles.summaryValue} style={{ color: weeklyNetProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
                    {formatValPrimary(weeklyNetProfit)}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Eficiência Histórica</span>
                  <span className={styles.summaryValue} style={{ color: "var(--neon-green)" }}>
                    {winRate.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Chart Rendering Container */}
          <div className={styles.chartContainer} style={{ height: "210px" }}>
            {chartType === "COMPOSTO" ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lineData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--text-secondary)"
                    fontSize={9}
                    tickLine={false}
                    domain={leftDomain}
                    tickFormatter={formatCurrency}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--text-secondary)"
                    fontSize={9}
                    tickLine={false}
                    domain={rightDomain}
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
                      if (name === "cumProfit") labelName = "L. Global Acumulado";
                      if (name === "netProfit") labelName = "L. Líquido Acumulado";
                      
                      return [`${prefix}${formatted}${suffix}`, labelName];
                    }}
                  />
                  
                  <ReferenceLine yAxisId="left" y={0} stroke="var(--opacity-border)" strokeWidth={1} />
                  
                  {/* Daily Gain Bar (Green) */}
                  <Bar
                    yAxisId="right"
                    dataKey="gain"
                    fill="var(--neon-green)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={25}
                    name="gain"
                  />
                  
                  {/* Daily Loss Bar (Red) */}
                  <Bar
                    yAxisId="right"
                    dataKey="loss"
                    fill="var(--neon-red)"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={25}
                    name="loss"
                  />
                  
                  {/* Floating Loss Line (Amber) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="floating"
                    stroke="var(--neon-amber)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "var(--neon-amber)", strokeWidth: 1 }}
                    name="floating"
                  />

                  {/* Cumulative Global Closed Profit Line (Gold) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumProfit"
                    stroke="var(--neon-gold)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "var(--neon-gold)", strokeWidth: 1 }}
                    name="cumProfit"
                  />

                  {/* Cumulative Net Profit Line (Cyan) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="netProfit"
                    stroke="#00e5ff"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#00e5ff", strokeWidth: 1 }}
                    name="netProfit"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--text-secondary)"
                    fontSize={9}
                    tickLine={false}
                    domain={weeklyDomain}
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
                      
                      let labelName = name === "gain" ? "Ganhos Fechados" : "Perdas Fechadas";
                      return [`${prefix}${formatted}${suffix}`, labelName];
                    }}
                  />
                  
                  <ReferenceLine yAxisId="left" y={0} stroke="var(--opacity-border)" strokeWidth={1} />
                  
                  {/* Weekly Gain Bar (Green) */}
                  <Bar
                    yAxisId="left"
                    dataKey="gain"
                    fill="var(--neon-green)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    name="gain"
                  />
                  
                  {/* Weekly Loss Bar (Red) */}
                  <Bar
                    yAxisId="left"
                    dataKey="loss"
                    fill="var(--neon-red)"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={30}
                    name="loss"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
