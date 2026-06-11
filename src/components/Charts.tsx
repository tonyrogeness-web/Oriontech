"use client";

import React, { useState } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Cell
} from "recharts";
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
  const [selectedIdea, setSelectedIdea] = useState<number>(0);
  const [timeframe, setTimeframe] = useState("TUDO");

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

  // 1. Process the full history to calculate cumulative curves
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

  // Filter based on timeframe
  const getFilteredHistory = () => {
    if (!fullProcessedHistory || fullProcessedHistory.length === 0) return [];
    if (timeframe === "DIÁRIO") return fullProcessedHistory.slice(-2);
    if (timeframe === "7D") return fullProcessedHistory.slice(-7);
    if (timeframe === "30D") return fullProcessedHistory.slice(-30);
    if (timeframe === "MÊS") return fullProcessedHistory.slice(-30);
    return fullProcessedHistory;
  };

  const lineData = getFilteredHistory();

  // Bins / Frequencies data generator for Option 5
  const getHistogramData = () => {
    const scale = currencyMode === "BRL" ? 1 : 5;
    const bins = [
      { label: `< -${50 * scale}`, count: 0, isPositive: false },
      { label: `-${50 * scale} a -${10 * scale}`, count: 0, isPositive: false },
      { label: `-${10 * scale} a 0`, count: 0, isPositive: false },
      { label: `0 a ${10 * scale}`, count: 0, isPositive: true },
      { label: `${10 * scale} a ${50 * scale}`, count: 0, isPositive: true },
      { label: `> ${50 * scale}`, count: 0, isPositive: true },
    ];

    let hasRealData = false;
    history.forEach((h) => {
      let val = h.profit;
      if (currencyMode === "BRL") {
        val = (h.profit / 100) * brlRate;
      }
      
      if (val !== 0) {
        hasRealData = true;
        if (val <= -50 * scale) bins[0].count++;
        else if (val > -50 * scale && val <= -10 * scale) bins[1].count++;
        else if (val > -10 * scale && val < 0) bins[2].count++;
        else if (val >= 0 && val < 10 * scale) bins[3].count++;
        else if (val >= 10 * scale && val < 50 * scale) bins[4].count++;
        else bins[5].count++;
      }
    });

    if (!hasRealData || history.length < 5) {
      bins[0].count = 1;
      bins[1].count = 3;
      bins[2].count = 5;
      bins[3].count = 14;
      bins[4].count = 8;
      bins[5].count = 4;
    }

    return bins.map(b => ({
      name: b.label,
      "Dias": b.count,
      isPositive: b.isPositive
    }));
  };

  // Drawdown Underwater calculations for Option 4
  const getDrawdownData = () => {
    let peakBalance = 0;
    return lineData.map(d => {
      if (d.balance > peakBalance) {
        peakBalance = d.balance;
      }
      const equity = d.balance + d.floating;
      const ddPct = peakBalance > 0 ? ((equity - peakBalance) / peakBalance) * 100 : 0;
      const cappedDd = ddPct > 0 ? 0 : parseFloat(ddPct.toFixed(2));
      return {
        name: d.name,
        drawdown: cappedDd,
      };
    });
  };

  // Asset returns generator for Option 3
  const getAssetDistribution = () => {
    const factor = currencyMode === "BRL" ? 10 : 50;
    return [
      { name: "EURUSD", profit: 345 * factor },
      { name: "GBPUSD", profit: 215 * factor },
      { name: "USDJPY", profit: -95 * factor },
      { name: "AUDUSD", profit: 80 * factor },
      { name: "USDCAD", profit: 150 * factor },
      { name: "NZDUSD", profit: -30 * factor },
    ].sort((a, b) => b.profit - a.profit);
  };

  // Monthly heatmap returns generator for Option 2
  const getMonthlyHeatmap = () => {
    const data2025: Record<string, number> = {
      "0": 2.4, "1": 4.1, "2": -1.5, "3": 3.8, "4": 5.2, "5": 2.9,
      "6": -0.8, "7": 4.6, "8": 3.1, "9": 1.2, "10": 5.8, "11": 3.9
    };
    
    const data2026: Record<string, number> = {};
    history.forEach((h) => {
      const d = new Date(h.date);
      const year = d.getFullYear();
      const month = d.getMonth();
      let val = h.profit;
      if (currencyMode === "BRL") {
        val = (h.profit / 100) * brlRate;
      }
      const key = `${year}-${month}`;
      if (!data2026[key]) data2026[key] = 0;
      data2026[key] += val;
    });

    const startBalance = history.length > 0 ? history[0].balance : 1000;
    const getPercent = (value: number) => {
      if (startBalance <= 0) return 0;
      return parseFloat(((value / startBalance) * 100).toFixed(1));
    };

    const real2026: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      const key = `2026-${m}`;
      if (data2026[key] !== undefined) {
        real2026[m.toString()] = getPercent(data2026[key]);
      }
    }

    if (Object.keys(real2026).length === 0) {
      real2026["0"] = 3.5;
      real2026["1"] = 4.8;
      real2026["2"] = 2.1;
      real2026["3"] = -0.5;
      real2026["4"] = 3.9;
      real2026["5"] = 1.8; // June
    }

    return [
      { year: 2025, months: data2025 },
      { year: 2026, months: real2026 }
    ];
  };

  const chartIdeas = [
    {
      id: 0,
      name: "📈 Curva de Crescimento",
      title: "1. Curva de Crescimento Patrimonial Limpa (Equity)",
      desc: "Uma linha contínua da evolução do saldo. Elimina o ruído diário e foca no crescimento de longo prazo do capital líquido.",
      advantage: "Padrão ouro de auditoria profissional (MyFxBook e MQL5). Ideal para avaliar consistência geral."
    },
    {
      id: 1,
      name: "📅 Retornos Mensais",
      title: "2. Tabela de Calor de Retornos Mensais (Heatmap)",
      desc: "Grade calorífica consolidando a rentabilidade percentual de cada mês. Verde representa lucro e Vermelho representa perda.",
      advantage: "Facilita a análise rápida de consistência mensal por parte de investidores e gestores de portfólio."
    },
    {
      id: 2,
      name: "💱 Retornos por Ativo",
      title: "3. Distribuição de Lucros por Ativo (Symbol Profit)",
      desc: "Gráfico horizontal mostrando quais pares de moedas trouxeram mais ganhos ou perdas líquidas.",
      advantage: "Crucial para robôs Hedge/Grid multi-moedas identificarem cestos desbalanceados ou moedas ineficientes."
    },
    {
      id: 3,
      name: "📉 Drawdown Subaquático",
      title: "4. Gráfico Subaquático de Drawdown (Underwater)",
      desc: "Representa visualmente os vales de rebaixamento flutuante da conta a partir de uma linha estável de 0%.",
      advantage: "Isola o risco operacional. Mostra a severidade das perdas flutuantes e o tempo de recuperação."
    },
    {
      id: 4,
      name: "📊 Freq. de Retornos",
      title: "5. Histograma de Frequência de Retorno Diário",
      desc: "Gráfico que agrupa o número de dias em que o robô obteve determinado intervalo de lucro ou perda.",
      advantage: "Visão estatística pura. Demonstra a distribuição probabilística da performance diária do robô."
    }
  ];

  const currentIdea = chartIdeas[selectedIdea];

  return (
    <div className={styles.chartsCard}>
      {/* Visualizer Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.05rem", margin: 0, color: "var(--neon-gold)" }}>
          💡 Demonstração Visual das 05 Ideias de Gráficos
        </h3>
        
        {/* Timeframe selector (only visible for temporal charts like Growth or Drawdown) */}
        {(selectedIdea === 0 || selectedIdea === 3) && (
          <div className={styles.chartFilters}>
            {["DIÁRIO", "7D", "30D", "TUDO"].map((tf) => (
              <button
                key={tf}
                className={`${styles.chartFilterBtn} ${timeframe === tf ? styles.chartFilterBtnActive : ""}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5-Idea Tab Selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem", background: "rgba(255, 255, 255, 0.01)", padding: "0.3rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
        {chartIdeas.map((idea) => (
          <button
            key={idea.id}
            onClick={() => setSelectedIdea(idea.id)}
            style={{
              flex: "1 1 auto",
              minWidth: "120px",
              padding: "0.45rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: selectedIdea === idea.id ? "1px solid var(--neon-gold)" : "1px solid transparent",
              background: selectedIdea === idea.id ? "rgba(255, 184, 0, 0.08)" : "transparent",
              color: selectedIdea === idea.id ? "var(--neon-gold)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            {idea.name}
          </button>
        ))}
      </div>

      {/* Subtitle / Header of selected chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {currentIdea.title}
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
          {currentIdea.desc}
        </span>
      </div>

      {/* Render Area */}
      <div className={styles.chartContainer} style={{ height: "230px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        
        {/* OPTION 1: Equity Growth Curve */}
        {selectedIdea === 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel-solid)",
                  borderColor: "var(--border-active)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-primary)",
                }}
                formatter={(value: any, name: any) => [
                  formatValPrimary(value),
                  name === "netProfit" ? "Capital Líquido (Equity)" : "Saldo Realizado (Balance)"
                ]}
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                stroke="#00e5ff"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorEquity)"
                name="netProfit"
              />
              <Line
                type="monotone"
                dataKey="cumProfit"
                stroke="var(--neon-gold)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="cumProfit"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* OPTION 2: Monthly Heatmap Grid */}
        {selectedIdea === 1 && (
          <div style={{ width: "100%", overflowX: "auto", paddingBottom: "0.5rem" }}>
            <div style={{ minWidth: "550px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "60px repeat(12, 1fr) 70px", gap: "0.25rem", textAlign: "center", borderBottom: "1px solid var(--border-light)", pb: "0.25rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                <div>Ano</div>
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                  <div key={m}>{m}</div>
                ))}
                <div>Total</div>
              </div>
              
              {/* Rows */}
              {getMonthlyHeatmap().map((row) => {
                const months = row.months;
                const total = Object.values(months).reduce((sum, v) => sum + v, 0);
                
                return (
                  <div key={row.year} style={{ display: "grid", gridTemplateColumns: "60px repeat(12, 1fr) 70px", gap: "0.25rem", alignItems: "center", fontSize: "0.72rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{row.year}</div>
                    
                    {Array.from({ length: 12 }).map((_, mIdx) => {
                      const val = months[mIdx.toString()];
                      const hasVal = val !== undefined;
                      let bg = "rgba(255, 255, 255, 0.02)";
                      let textColor = "var(--text-muted)";
                      
                      if (hasVal) {
                        textColor = "#ffffff";
                        if (val >= 0) {
                          const op = Math.min(0.4, 0.1 + (val / 10) * 0.3);
                          bg = `rgba(0, 229, 154, ${op})`;
                        } else {
                          const op = Math.min(0.4, 0.1 + (Math.abs(val) / 10) * 0.3);
                          bg = `rgba(255, 77, 77, ${op})`;
                        }
                      }
                      
                      return (
                        <div
                          key={mIdx}
                          style={{
                            background: bg,
                            padding: "0.45rem 0.2rem",
                            borderRadius: "4px",
                            textAlign: "center",
                            color: textColor,
                            fontWeight: hasVal ? 700 : 400,
                            border: hasVal ? "1px solid rgba(255, 255, 255, 0.05)" : "1px dashed rgba(255, 255, 255, 0.02)"
                          }}
                        >
                          {hasVal ? `${val > 0 ? "+" : ""}${val}%` : "-"}
                        </div>
                      );
                    })}
                    
                    <div
                      style={{
                        fontWeight: 700,
                        textAlign: "center",
                        padding: "0.45rem 0.2rem",
                        borderRadius: "4px",
                        background: total >= 0 ? "rgba(0, 229, 154, 0.1)" : "rgba(255, 77, 77, 0.1)",
                        color: total >= 0 ? "var(--neon-green)" : "var(--neon-red)",
                        border: "1px solid var(--border-light)"
                      }}
                    >
                      {total > 0 ? "+" : ""}{total.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OPTION 3: Profit by Currency Pair */}
        {selectedIdea === 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={getAssetDistribution()} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-secondary)" fontSize={9} tickFormatter={formatCurrency} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel-solid)",
                  borderColor: "var(--border-active)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-primary)",
                }}
                formatter={(value: any) => [formatValPrimary(value), "Lucro Líquido"]}
              />
              <ReferenceLine x={0} stroke="var(--opacity-border)" strokeWidth={1} />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]} maxBarSize={15}>
                {getAssetDistribution().map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.profit >= 0 ? "var(--neon-green)" : "var(--neon-red)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* OPTION 4: Drawdown Underwater Chart */}
        {selectedIdea === 3 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getDrawdownData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--neon-red)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--neon-red)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={9}
                tickLine={false}
                domain={[-15, 0]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel-solid)",
                  borderColor: "var(--border-active)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-primary)",
                }}
                formatter={(value: any) => [`${value}%`, "Rebaixamento (Drawdown)"]}
              />
              <ReferenceLine y={0} stroke="var(--opacity-border)" strokeWidth={1.5} />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="var(--neon-red)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDd)"
                name="drawdown"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* OPTION 5: Daily Return Frequencies */}
        {selectedIdea === 4 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getHistogramData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--opacity-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={8} />
              <YAxis stroke="var(--text-secondary)" fontSize={9} allowDecimals={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel-solid)",
                  borderColor: "var(--border-active)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-primary)",
                }}
                formatter={(value: any) => [`${value} dias`, "Frequência"]}
              />
              <Bar dataKey="Dias" radius={[4, 4, 0, 0]} maxBarSize={35}>
                {getHistogramData().map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPositive ? "var(--neon-green)" : "var(--neon-red)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

      </div>

      {/* Advantage / Highlight Alert Card */}
      <div style={{
        marginTop: "0.8rem",
        padding: "0.65rem 0.8rem",
        borderRadius: "10px",
        background: "rgba(255, 184, 0, 0.02)",
        border: "1px dashed rgba(255, 184, 0, 0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem"
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--neon-gold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          💡 Vantagem Analítica da Opção
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {currentIdea.advantage}
        </span>
      </div>
    </div>
  );
}
