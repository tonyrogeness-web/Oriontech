"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface RiskManagementProps {
  floatingPl: number;
  maxDrawdown: number;
  tradesCount: number;
  softStopLimit?: number;
  balance?: number;
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
  history?: PerformancePoint[];
  trades?: any[];
}

/* ── Mini Sparkline SVG ─────────────────────────────────────────── */
function RiskSparkline({ data, color }: { data: number[]; color: string }) {
  let plotData = data.filter((v) => isFinite(v));
  if (plotData.length < 2) plotData = [0.5, 1, 0.4, 1.3, 0.9, 1.6, 1.1, 1.9];
  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;
  const W = 72, H = 20, pad = 2;
  const points = plotData
    .map((v, i) => {
      const x = (i / (plotData.length - 1)) * (W - pad * 2) + pad;
      const y = H - ((v - min) / range) * (H - pad * 2) - pad;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={W} height={H}
      className={styles.riskSparkline}
    >
      <polyline
        fill="none" stroke={color} strokeWidth="1.0"
        strokeLinecap="round" strokeLinejoin="round" points={points}
        style={{ strokeDasharray: 250, strokeDashoffset: 250, animation: "drawSparkline 1.8s ease-out forwards" }}
      />
    </svg>
  );
}

/* ── Zone-banded progress bar ────────────────────────────────────── */
function ZonedBar({ fillPct, fillColor, zone1 = 50, zone2 = 80 }: {
  fillPct: number; fillColor: string; zone1?: number; zone2?: number;
}) {
  return (
    <div className={styles.riskBarTrack}>
      <div className={styles.riskBarZone} style={{ left: 0, width: `${zone1}%`, background: "rgba(0,230,118,0.06)" }} />
      <div className={styles.riskBarZone} style={{ left: `${zone1}%`, width: `${zone2 - zone1}%`, background: "rgba(255,179,0,0.07)" }} />
      <div className={styles.riskBarZone} style={{ left: `${zone2}%`, width: `${100 - zone2}%`, background: "rgba(255,23,68,0.08)" }} />
      <div className={styles.riskBarDivider} style={{ left: `${zone1}%`, background: "rgba(255,179,0,0.35)" }} />
      <div className={styles.riskBarDivider} style={{ left: `${zone2}%`, background: "rgba(255,23,68,0.35)" }} />
      <div className={styles.riskBarFill} style={{
        width: `${Math.max(fillPct > 0 ? 1.5 : 0, fillPct)}%`,
        background: fillColor,
        boxShadow: `0 0 10px ${fillColor}66`,
      }} />
    </div>
  );
}

/* ── Status Pill ─────────────────────────────────────────────────── */
function Pill({ label, color }: { label: string; color: string }) {
  const bgMap: Record<string, string> = {
    CRÍTICO: "rgba(255,23,68,0.13)",
    ALERTA: "rgba(255,179,0,0.12)",
    SEGURO: "rgba(0,230,118,0.10)",
    POSITIVO: "rgba(0,230,118,0.10)",
    NEGATIVO: "rgba(255,23,68,0.13)",
  };
  const bdMap: Record<string, string> = {
    CRÍTICO: "rgba(255,23,68,0.3)",
    ALERTA: "rgba(255,179,0,0.3)",
    SEGURO: "rgba(0,230,118,0.25)",
    POSITIVO: "rgba(0,230,118,0.25)",
    NEGATIVO: "rgba(255,23,68,0.3)",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.2rem",
      background: bgMap[label] ?? "var(--opacity-bg-soft)",
      border: `1px solid ${bdMap[label] ?? "var(--opacity-border)"}`,
      color, fontSize: "0.68rem", fontWeight: 800,
      padding: "0.1rem 0.5rem", borderRadius: "20px",
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ fontSize: "0.55rem" }}>●</span> {label}
    </span>
  );
}

/* ── Divider ─────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: "1px", background: "var(--opacity-divider)", margin: "0.1rem 0" }} />;
}

/* ── Main component ──────────────────────────────────────────────── */
export default function RiskManagement({
  floatingPl = 0,
  maxDrawdown = 0,
  tradesCount = 0,
  softStopLimit = 400.0,
  balance = 0,
  currencyMode = "CENT",
  brlRate = 5.45,
  history = [],
  trades = [],
}: RiskManagementProps) {

  /* ── Formatter ────────────────────────────────────────────────── */
  const fmt = (val: number, keepSign = false) => {
    const absVal = Math.abs(val);
    const sign = keepSign ? (val < 0 ? "-" : val > 0 ? "+" : "") : "";
    if (currencyMode === "CENT") {
      return `${sign}${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    }
    const brl = (absVal / 100) * brlRate;
    return `${sign}R$ ${brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const clamp = (v: number, max: number) => max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0;

  /* ═══════════════════════════════════════════════════════════════
     1. PERDA FLUTUANTE — valor atual do P&L
  ═══════════════════════════════════════════════════════════════ */
  const plIsPositive = floatingPl >= 0;
  const plLoss       = Math.max(0, -floatingPl);
  const plBalancePct = (floatingPl < 0 && balance > 0) ? (plLoss / balance) * 100 : 0;
  
  const plStatus     = plIsPositive 
    ? "POSITIVO" 
    : plBalancePct >= 30 
      ? "CRÍTICO" 
      : plBalancePct >= 15 
        ? "ALERTA" 
        : "SEGURO";
        
  const plColor      = plIsPositive 
    ? "var(--neon-green)" 
    : plBalancePct >= 30 
      ? "var(--neon-red)" 
      : plBalancePct >= 15 
        ? "var(--neon-gold)" 
        : "var(--neon-green)";

  const plIcon       = plIsPositive || plBalancePct < 15 ? TrendingUp : TrendingDown;
  const PlIcon       = plIcon;

  const plBarColor   = plColor;
  const plBarPct     = clamp(plBalancePct, 50);

  /* ═══════════════════════════════════════════════════════════════
     2. SOFT STOP — % do limite consumido por par (Worst-Offender)
  ═══════════════════════════════════════════════════════════════ */
  const symbolStats = React.useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    // Group trades by symbol
    const symbols = Array.from(new Set(trades.map((t: any) => t.symbol))) as string[];
    return symbols.map(sym => {
      const symTrades = trades.filter((t: any) => t.symbol === sym);
      const symPl = symTrades.reduce((sum, t) => sum + (t.currentProfit || 0), 0);
      const symLoss = Math.max(0, -symPl);
      const symBarPct = symPl < 0 ? clamp(symLoss, softStopLimit) : 0;
      const cleanSym = sym.toUpperCase().replace(/C$/i, "").replace("/", "");
      
      const symColor = symBarPct >= 80 ? "var(--neon-red)" : symBarPct >= 50 ? "var(--neon-gold)" : "var(--neon-green)";
      const symStatus = symBarPct >= 80 ? "CRÍTICO" : symBarPct >= 50 ? "ALERTA" : "SEGURO";

      return {
        symbol: cleanSym,
        floatingPl: symPl,
        loss: symLoss,
        barPct: symBarPct,
        color: symColor,
        status: symStatus,
      };
    }).sort((a, b) => b.loss - a.loss); // Worst performing first
  }, [trades, softStopLimit]);

  // Find worst status for global references
  let ssStatus = "SEGURO";
  let ssColor = "var(--neon-green)";
  let ssBarPct = 0;
  let worstPlLoss = 0;

  if (symbolStats.length > 0) {
    const hasCritical = symbolStats.some(s => s.status === "CRÍTICO");
    const hasAlert = symbolStats.some(s => s.status === "ALERTA");
    
    if (hasCritical) {
      ssStatus = "CRÍTICO";
      ssColor = "var(--neon-red)";
    } else if (hasAlert) {
      ssStatus = "ALERTA";
      ssColor = "var(--neon-gold)";
    }
    
    const worstPair = symbolStats[0]; // worst-offender
    worstPlLoss = worstPair.loss;
    ssBarPct = worstPair.barPct;
  }

  const ssHeadroom   = Math.max(0, softStopLimit - worstPlLoss);

  /* ═══════════════════════════════════════════════════════════════
     3. REBAIXAMENTO (DRAWDOWN) — identico a barra "Drawdown Local" do painel MT5
  ═══════════════════════════════════════════════════════════════ */
  const ddBarPct     = clamp(maxDrawdown, 50);
  const ddColor      = maxDrawdown >= 35 ? "var(--neon-red)" : maxDrawdown >= 20 ? "var(--neon-gold)" : "var(--neon-green)";
  const ddStatus     = maxDrawdown >= 35 ? "CRÍTICO" : maxDrawdown >= 20 ? "ALERTA" : "SEGURO";
  const ddHeadroom   = Math.max(0, 50 - maxDrawdown);



  /* ── Worst state → card border ───────────────────────────────── */
  const isCritical = ssStatus === "CRÍTICO" || ddStatus === "CRÍTICO";
  const isAlert    = ssStatus === "ALERTA"   || ddStatus === "ALERTA";
  const cardBorder = isCritical
    ? styles.kpiCardBorderRed
    : isAlert
    ? styles.kpiCardBorderAmber
    : styles.kpiCardBorderGreen;
  const titleColor = isCritical ? "var(--neon-red)" : isAlert ? "var(--neon-gold)" : "var(--neon-green)";

  /* ── Sparkline data ──────────────────────────────────────────── */
  const sparkProfit = history.map((h) => h.profit);
  const sparkBal    = history.map((h) => h.balance);

  return (
    <div className={`${styles.riskManagementCard} ${cardBorder}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" }}>
        {isCritical || isAlert
          ? <ShieldAlert size={15} style={{ color: titleColor, flexShrink: 0 }} />
          : <ShieldCheck size={15} style={{ color: titleColor, flexShrink: 0 }} />
        }
        <h3 className={styles.riskTitle} style={{ margin: 0, color: titleColor }}>
          Gestão de Risco
        </h3>
        <div style={{ marginLeft: "auto" }}>
          <Pill
            label={isCritical ? "CRÍTICO" : isAlert ? "ALERTA" : "SEGURO"}
            color={titleColor}
          />
        </div>
      </div>

      <div className={styles.riskItemList}>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 1 — PERDA FLUTUANTE
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65 }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <PlIcon size={12} style={{ color: plColor }} />
              <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>PERDA FLUTUANTE</span>
            </div>
            <Pill label={plStatus} color={plColor} />
          </div>

          {/* Big value */}
          <div style={{ marginTop: "0.3rem" }}>
            <span style={{
              fontSize: "clamp(1.25rem, 4.5vw, 1.75rem)", fontWeight: 800, color: plColor,
              fontFamily: "monospace", letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              {fmt(floatingPl, true)}
            </span>
          </div>

          {/* Progress bar in relation to total balance */}
          <div style={{ margin: "0.45rem 0" }}>
            <ZonedBar fillPct={plBarPct} fillColor={plBarColor} zone1={30} zone2={60} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: plColor, fontWeight: 700 }}>
              {plBalancePct.toFixed(2)}% da banca
            </span>
            <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {plIsPositive
                ? "✓ Sem perda flutuante"
                : `↳ Perda de ${fmt(plLoss)} sobre posições abertas`}
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkProfit} color={plColor} />
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 2 — REBAIXAMENTO (DRAWDOWN)
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65 }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <TrendingDown size={12} style={{ color: ddColor }} />
              <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>REBAIXAMENTO (DRAWDOWN)</span>
            </div>
            <Pill label={ddStatus} color={ddColor} />
          </div>

          {/* Values (Dynamic theme colors) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.35rem 0 0.45rem" }}>
            <span style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
              {maxDrawdown.toFixed(2)}% <span style={{ color: ddColor, fontSize: "clamp(0.7rem, 2vw, 0.82rem)", fontWeight: 500 }}>atual</span>
            </span>
            <span style={{ fontSize: "clamp(0.7rem, 2vw, 0.82rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              limite <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>50.00%</span>
            </span>
          </div>

          {/* Zoned bar */}
          <ZonedBar fillPct={ddBarPct} fillColor={ddColor} zone1={40} zone2={70} />

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
              <strong style={{ color: ddColor }}>{ddBarPct.toFixed(1)}%</strong> do limite atingido
            </span>
            <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
              ↳ {ddHeadroom.toFixed(2)}% disponíveis
            </span>
          </div>

          {/* Sparkline */}
          <RiskSparkline data={sparkBal} color={ddColor} />
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 3 — SOFT STOP
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow} style={{ marginBottom: "0.15rem", cursor: "pointer" }} onClick={() => setIsSoftStopExpanded(!isSoftStopExpanded)}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertTriangle size={12} style={{ color: ssColor }} />
              <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>SOFT STOP</span>
              {isSoftStopExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
            </div>
            <Pill label={ssStatus} color={ssColor} />
          </div>

          {!isSoftStopExpanded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {/* Values (Dynamic theme colors) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.1rem 0 0.2rem" }}>
                <span style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                  {fmt(plLoss)} <span style={{ color: ssColor, fontSize: "clamp(0.7rem, 2vw, 0.82rem)", fontWeight: 500 }}>consumido</span>
                </span>
                <span style={{ fontSize: "clamp(0.7rem, 2vw, 0.82rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  limite <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fmt(softStopLimit)}</span>
                </span>
              </div>

              {/* Zoned bar */}
              <ZonedBar fillPct={clamp(plLoss, softStopLimit)} fillColor={ssColor} zone1={50} zone2={80} />

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                  <strong style={{ color: ssColor }}>{clamp(plLoss, softStopLimit).toFixed(1)}%</strong> do limite
                </span>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--neon-green)", fontWeight: 700, fontFamily: "monospace" }}>
                  ↳ {fmt(Math.max(0, softStopLimit - plLoss))} disponíveis
                </span>
              </div>
            </div>
          ) : (
            symbolStats.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {symbolStats.map((stat) => {
                  const headroom = Math.max(0, softStopLimit - stat.loss);
                  return (
                    <div key={stat.symbol} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", alignItems: "baseline" }}>
                        <span style={{ fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>{stat.symbol}</span>
                        <span style={{ fontFamily: "monospace", color: stat.color, fontWeight: 700 }}>
                          {fmt(-stat.floatingPl)} / {fmt(softStopLimit)} ({stat.barPct.toFixed(0)}%)
                        </span>
                      </div>
                      <ZonedBar fillPct={stat.barPct} fillColor={stat.color} zone1={50} zone2={80} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        <span>Disponível: {fmt(headroom)}</span>
                        <span style={{ color: stat.color, fontWeight: 600 }}>{stat.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.02em" }}>Nenhum par ativo</span>
                  <span style={{ fontFamily: "monospace", color: "var(--neon-green)", fontWeight: 700 }}>
                    0,00 / {fmt(softStopLimit)} (0%)
                  </span>
                </div>
                <ZonedBar fillPct={0} fillColor="var(--neon-green)" zone1={50} zone2={80} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  <span>Disponível: {fmt(softStopLimit)}</span>
                  <span style={{ color: "var(--neon-green)", fontWeight: 600 }}>SEGURO</span>
                </div>
              </div>
            )
          )}
        </div>


      </div>
    </div>
  );
}
