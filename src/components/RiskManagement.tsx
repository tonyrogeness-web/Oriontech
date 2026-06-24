"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Wallet, Shield } from "lucide-react";
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
  balance?: number;
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
  history?: PerformancePoint[];
  trades?: any[];
  sgScore?: number;
  sgScoreMin?: number;
  sgDistMultipl?: number;
  sgLoteFator?: number;
  sgBloqueado?: boolean;
  symbolStates?: Array<{
    symbol: string;
    sgScore: number;
    sgScoreMin: number;
    sgDistMultipl: number;
    sgLoteFator: number;
    sgBloqueado: boolean;
  }>;
  reserveFund?: number;
  reserveCapPct?: number;
  reserveCutsCount?: number;
  reserveCutsGasto?: number;
  hpCutsCount?: number;
  hpCutsGasto?: number;
  buySosScheduled?: boolean;
  sellSosScheduled?: boolean;
  loteBase?: number;
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
  balance = 0,
  currencyMode = "CENT",
  brlRate = 5.45,
  history = [],
  trades = [],
  sgScore = 100.0,
  sgScoreMin = 40.0,
  sgDistMultipl = 1.0,
  sgLoteFator = 1.0,
  sgBloqueado = false,
  symbolStates = [],
  reserveFund = 0,
  reserveCapPct = 2.0,
  reserveCutsCount = 0,
  reserveCutsGasto = 0.0,
  hpCutsCount = 0,
  hpCutsGasto = 0.0,
  buySosScheduled = false,
  sellSosScheduled = false,
  loteBase = 0.012,
}: RiskManagementProps) {
  const [isSGExpanded, setIsSGExpanded] = React.useState(false);
  const [isReserveExpanded, setIsReserveExpanded] = React.useState(false);
  const [isDefesaExpanded, setIsDefesaExpanded] = React.useState(false);

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
     2. SMART GATE — status e score de segurança (Worst-Offender)
  ═══════════════════════════════════════════════════════════════ */
  const sgStatus = sgBloqueado
    ? "CRÍTICO"
    : sgScore < 60.0
      ? "ALERTA"
      : "SEGURO";

  const sgColor = sgBloqueado
    ? "var(--neon-red)"
    : sgScore < 60.0
      ? "var(--neon-gold)"
      : "var(--neon-green)";

  /* ═══════════════════════════════════════════════════════════════
     3. REBAIXAMENTO (DRAWDOWN) — identico a barra "Drawdown Local" do painel MT5
  ═══════════════════════════════════════════════════════════════ */
  const ddBarPct     = clamp(maxDrawdown, 50);
  const ddColor      = maxDrawdown >= 35 ? "var(--neon-red)" : maxDrawdown >= 20 ? "var(--neon-gold)" : "var(--neon-green)";
  const ddStatus     = maxDrawdown >= 35 ? "CRÍTICO" : maxDrawdown >= 20 ? "ALERTA" : "SEGURO";
  const ddHeadroom   = Math.max(0, 50 - maxDrawdown);



  /* ── Worst state → card border ───────────────────────────────── */
  const isCritical = sgStatus === "CRÍTICO" || ddStatus === "CRÍTICO";
  const isAlert    = sgStatus === "ALERTA"   || ddStatus === "ALERTA";
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
            SEÇÃO 1 — REBAIXAMENTO (DRAWDOWN)
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
            SEÇÃO 2 — PERDA FLUTUANTE
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
            SEÇÃO 3 — FUNDO DE RESERVA (F. RESERVA)
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow} style={{ marginBottom: "0.15rem", cursor: "pointer" }} onClick={() => setIsReserveExpanded(!isReserveExpanded)}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Wallet size={12} style={{ color: "#a855f7" }} />
              <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>F. RESERVA</span>
              {isReserveExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
            </div>
            <Pill label={reserveFund > 0 ? "ATIVO" : "INATIVO"} color={reserveFund > 0 ? "#a855f7" : "var(--text-muted)"} />
          </div>

          {!isReserveExpanded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {/* Values */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.1rem 0 0.2rem" }}>
                <span style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", fontWeight: 700, color: "#a855f7", fontFamily: "monospace" }}>
                  {fmt(reserveFund)}
                </span>
                <span style={{ fontSize: "clamp(0.7rem, 2vw, 0.82rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  teto <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{reserveCapPct.toFixed(1)}%</span>
                </span>
              </div>

              {/* Progress bar in relation to ceiling */}
              {(() => {
                const limitVal = balance * (reserveCapPct / 100) || 1;
                const ratioPct = Math.min(100, Math.max(0, (reserveFund / limitVal) * 100));
                return (
                  <div style={{ position: "relative", width: "100%" }}>
                    <ZonedBar fillPct={ratioPct} fillColor="#a855f7" zone1={50} zone2={80} />
                  </div>
                );
              })()}

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                  Cortes/Defesas: <strong style={{ color: "var(--text-secondary)" }}>{reserveCutsCount}</strong>
                </span>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                  Total Queimado: <strong style={{ color: "var(--text-secondary)" }}>{fmt(reserveCutsGasto)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Fundo de Reserva:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#a855f7" }}>{fmt(reserveFund)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Teto Máximo ({reserveCapPct.toFixed(1)}%):</span>
                <span style={{ fontFamily: "monospace" }}>{fmt(balance * (reserveCapPct / 100))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Progresso do Teto:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#a855f7" }}>
                  {((reserveFund / (balance * (reserveCapPct / 100) || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total de Cortes (Airbag):</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{reserveCutsCount} vezes</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Prejuízo Coberto / Queimado:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--neon-red)" }}>{fmt(reserveCutsGasto)}</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginTop: "0.15rem" }}>
                O Fundo de Reserva é alimentado com a retenção de 10% dos lucros de ciclos normais para realizar cortes parciais na pior ordem em momentos de estresse (Airbag).
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 4 — SISTEMA DE DEFESA (DEFESA)
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Group by symbol to count levels accurately (not summing different pairs together) */}
          {(() => {
            const symbolOrderCounts = trades.reduce((acc: Record<string, { buy: number; sell: number }>, t: any) => {
              const sym = t.symbol || "unknown";
              if (!acc[sym]) acc[sym] = { buy: 0, sell: 0 };
              if (t.type === "BUY") acc[sym].buy++;
              if (t.type === "SELL") acc[sym].sell++;
              return acc;
            }, {});

            const buyCount = Object.values(symbolOrderCounts).reduce((max: number, c: any) => Math.max(max, c.buy), 0);
            const sellCount = Object.values(symbolOrderCounts).reduce((max: number, c: any) => Math.max(max, c.sell), 0);
            const worstLevel = Math.max(buyCount, sellCount);

            return (
              <>
                {/* Label row */}
                <div className={styles.riskHeaderRow} style={{ marginBottom: "0.15rem", cursor: "pointer" }} onClick={() => setIsDefesaExpanded(!isDefesaExpanded)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Shield size={12} style={{ color: (buySosScheduled || sellSosScheduled) ? "var(--neon-amber)" : "var(--neon-green)" }} />
                    <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>SISTEMA DE DEFESA</span>
                    {isDefesaExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                  </div>
                  <Pill 
                    label={(buySosScheduled || sellSosScheduled) ? "DEFESA!" : "MONITORANDO"} 
                    color={(buySosScheduled || sellSosScheduled) ? "var(--neon-amber)" : "var(--neon-green)"} 
                  />
                </div>

                {!isDefesaExpanded ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    {/* Values */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.1rem 0 0.2rem" }}>
                      <span style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", fontWeight: 700, color: hpCutsGasto > 0 ? "var(--neon-red)" : "var(--text-secondary)", fontFamily: "monospace" }}>
                        {fmt(hpCutsGasto)}
                      </span>
                      <span style={{ fontSize: "clamp(0.7rem, 2vw, 0.82rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        grade <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{worstLevel}/5</span>
                      </span>
                    </div>

                    {/* Progress bar in relation to triggering level N5 */}
                    <div style={{ position: "relative", width: "100%" }}>
                      <ZonedBar fillPct={Math.min(100, Math.max(0, (worstLevel / 5) * 100))} fillColor={worstLevel >= 5 ? "var(--neon-amber)" : "var(--neon-green)"} zone1={50} zone2={80} />
                    </div>

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                        Cortes/Defesas: <strong style={{ color: "var(--text-secondary)" }}>{hpCutsCount}</strong>
                      </span>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                        SOS: <strong style={{ color: (buySosScheduled || sellSosScheduled) ? "var(--neon-red)" : "var(--text-muted)" }}>
                          {buySosScheduled || sellSosScheduled ? "ATIVADO" : "Aguardando"}
                        </strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {/* Detailed stats */}
                    {/* HEDGE PARCIAL */}
                    <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "#a855f7", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "0.2rem", marginBottom: "0.1rem" }}>
                      Hedge Parcial (Alt 1)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Cesto Buy:</span>
                      <span style={{ fontWeight: 700, color: buyCount >= 5 ? "var(--neon-amber)" : "var(--text-muted)" }}>
                        {buyCount >= 5 ? "ATIVO (Coberto por Sell)" : `Aguardando (${buyCount}/5)`}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Cesto Sell:</span>
                      <span style={{ fontWeight: 700, color: sellCount >= 5 ? "var(--neon-amber)" : "var(--text-muted)" }}>
                        {sellCount >= 5 ? "ATIVO (Coberto por Buy)" : `Aguardando (${sellCount}/5)`}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Total de Cortes:</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{hpCutsCount} vezes</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Lucro Queimado:</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--neon-red)" }}>{fmt(hpCutsGasto)}</span>
                    </div>

                    {/* BREAK EVEN SOS */}
                    <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "var(--neon-blue)", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "0.4rem", borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginBottom: "0.1rem" }}>
                      Break Even SOS (Alt 2)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>SOS Buy (Zero a Zero):</span>
                      <span style={{ fontWeight: 700, color: buySosScheduled ? "var(--neon-red)" : "var(--text-muted)" }}>
                        {buySosScheduled ? "ATIVADO" : (buyCount >= 5 ? "Aguardando DD > 10%" : `Aguardando Nível (${buyCount}/5)`)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>SOS Sell (Zero a Zero):</span>
                      <span style={{ fontWeight: 700, color: sellSosScheduled ? "var(--neon-red)" : "var(--text-muted)" }}>
                        {sellSosScheduled ? "ATIVADO" : (sellCount >= 5 ? "Aguardando DD > 10%" : `Aguardando Nível (${sellCount}/5)`)}
                      </span>
                    </div>

                    {/* DADOS GERAIS */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginTop: "0.4rem" }}>
                      <span>Lote Base Atual:</span>
                      <span style={{ fontFamily: "monospace" }}>{(loteBase || 0.012).toFixed(3)}</span>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginTop: "0.15rem" }}>
                      A Defesa é composta pelo Hedge Parcial (queima lucro do cesto oposto para fechar a pior ordem) e pelo Break Even SOS (reduz o TP do cesto para empate rápido em momentos de alto rebaixamento).
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <Divider />

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 5 — SMART GATE
        ═══════════════════════════════════════════════════════ */}
        <div className={styles.riskItem} style={{ position: "relative", minHeight: 65, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Label row */}
          <div className={styles.riskHeaderRow} style={{ marginBottom: "0.15rem", cursor: "pointer" }} onClick={() => setIsSGExpanded(!isSGExpanded)}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertTriangle size={12} style={{ color: sgColor }} />
              <span className={styles.riskSectionLabel} style={{ fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)" }}>SMART GATE</span>
              {isSGExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
            </div>
            <Pill label={sgStatus} color={sgColor} />
          </div>

          {!isSGExpanded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {/* Values */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0.1rem 0 0.2rem" }}>
                <span style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                  {sgScore.toFixed(1)} <span style={{ color: sgColor, fontSize: "clamp(0.7rem, 2vw, 0.82rem)", fontWeight: 500 }}>score</span>
                </span>
                <span style={{ fontSize: "clamp(0.7rem, 2vw, 0.82rem)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  mínimo <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{sgScoreMin.toFixed(1)}</span>
                </span>
              </div>

              {/* Zoned bar */}
              <div style={{ position: "relative", width: "100%" }}>
                <ZonedBar fillPct={sgScore} fillColor={sgColor} zone1={40} zone2={60} />
                <div style={{ position: "absolute", left: `${sgScoreMin}%`, top: 0, bottom: 0, width: "2px", background: "var(--text-primary)", boxShadow: "0 0 4px #fff" }} />
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                  DistX: <strong style={{ color: sgDistMultipl > 1.0 ? "var(--neon-gold)" : "var(--text-secondary)" }}>{sgDistMultipl.toFixed(2)}x</strong>
                </span>
                <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.78rem)", color: "var(--text-muted)" }}>
                  LoteX: <strong style={{ color: sgLoteFator < 1.0 ? "var(--neon-gold)" : "var(--text-secondary)" }}>{(sgLoteFator * 100).toFixed(0)}%</strong>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Status da Grade:</span>
                <span style={{ fontWeight: 700, color: sgColor }}>{sgBloqueado ? "BLOQUEADO (RECOMPRAS SUSPENSAS)" : sgScore < 60 ? "RESTRIÇÃO ATIVA" : "LIBERADO"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Score Atual:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{sgScore.toFixed(1)} / 100.0</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Score Mínimo:</span>
                <span style={{ fontFamily: "monospace" }}>{sgScoreMin.toFixed(1)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Multiplicador de Distância (DistX):</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{sgDistMultipl.toFixed(2)}x</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Fator de Redução de Lote (LoteX):</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{(sgLoteFator * 100).toFixed(0)}%</span>
              </div>
              {(() => {
                const cleanSymbol = (sym: string) => {
                  if (!sym) return "";
                  return sym.toUpperCase().replace(/(CENT|c|\.c)$/i, "").replace("/", "").trim();
                };
                const activeSymbolsCleaned = Array.from(
                  new Set(trades.map((t: any) => cleanSymbol(t.symbol)))
                );
                const activeSymbolStates = symbolStates.filter((s: any) =>
                  activeSymbolsCleaned.includes(cleanSymbol(s.symbol))
                );
                if (activeSymbolStates.length === 0) return null;
                return (
                  <div style={{ borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.1rem" }}>
                      POR SÍMBOLO
                    </div>
                    {activeSymbolStates.map((s: any) => {
                      const statusText = s.sgBloqueado ? "BLOQUEADO" : s.sgScore < 60.0 ? "RESTRITO" : "OK";
                      const statusColor = s.sgBloqueado ? "var(--neon-red)" : s.sgScore < 60.0 ? "var(--neon-amber)" : "var(--neon-green)";
                      const indicator = s.sgBloqueado ? "🔴" : s.sgScore < 60.0 ? "⚠️" : "✓";
                      return (
                        <div key={s.symbol} style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: "0.72rem", alignItems: "center" }}>
                          <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{cleanSymbol(s.symbol)}</span>
                          <div style={{ display: "flex", gap: "0.6rem", color: "var(--text-muted)" }}>
                            <span>{s.sgScore.toFixed(0)}/{s.sgScoreMin.toFixed(0)}</span>
                            <span>D:{s.sgDistMultipl.toFixed(2)}x</span>
                            <span>L:{(s.sgLoteFator * 100).toFixed(0)}%</span>
                          </div>
                          <span style={{ color: statusColor, fontWeight: 700, fontSize: "0.68rem" }}>
                            {indicator} {statusText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", borderTop: "1px dashed var(--opacity-border)", paddingTop: "0.4rem", marginTop: "0.15rem" }}>
                O Smart Gate modula as recompras dinamicamente baseando-se no Drawdown flutuante de cada cesto.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
