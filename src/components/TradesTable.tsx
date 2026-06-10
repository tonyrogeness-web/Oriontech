"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import styles from "./components.module.css";

interface Trade {
  id: number;
  ticket: string;
  symbol: string;
  type: string;
  volume: number;
  entryPrice: number;
  currentPrice: number;
  currentProfit: number;
  magicNumber: number;
}

interface TradesTableProps {
  trades: Trade[];
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function TradesTable({ trades = [], currencyMode = "CENT", brlRate = 5.45 }: TradesTableProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});

  const cleanSymbol = (sym: string) => {
    return sym.toUpperCase().replace("C", "").replace("/", "");
  };

  const toggleSymbol = (sym: string) => {
    setExpandedSymbols(prev => {
      const current = prev[sym] !== false; // default is true
      return { ...prev, [sym]: !current };
    });
  };

  // Group and sort trades chronologically by ticket to assign grid levels (N1, N2, etc.)
  const getTradesWithLevels = () => {
    const sorted = [...trades].sort((a, b) => parseInt(a.ticket) - parseInt(b.ticket));
    const counts: { [key: string]: number } = {};
    
    return sorted.map((t) => {
      const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
      const dir = isBuy ? "BUY" : "SELL";
      const key = `${cleanSymbol(t.symbol)}_${dir}`;
      
      if (counts[key] === undefined) {
        counts[key] = 0;
      }
      counts[key]++;
      
      return {
        ...t,
        level: `N${counts[key]}`,
      };
    });
  };

  const tradesWithLevels = getTradesWithLevels();
  const totalLots = trades.reduce((acc, t) => acc + t.volume, 0);
  const totalProfit = trades.reduce((acc, t) => acc + t.currentProfit, 0);

  const formatProfitPrimary = (val: number) => {
    const absVal = Math.abs(val);
    const isNeg = val < 0;
    const sign = isNeg ? "-" : val > 0 ? "+" : "";

    if (currencyMode === "CENT") {
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${sign}${formattedNum} USC`;
    } else { // BRL
      const convertedBrl = (absVal / 100) * brlRate;
      return `${sign}R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  // Group trades by Symbol
  const groupsMap: Record<string, typeof tradesWithLevels> = {};
  tradesWithLevels.forEach(t => {
    const sym = cleanSymbol(t.symbol);
    if (!groupsMap[sym]) groupsMap[sym] = [];
    groupsMap[sym].push(t);
  });

  interface GroupedSymbol {
    symbol: string;
    trades: typeof tradesWithLevels;
    totalProfit: number;
    totalVolume: number;
    buyCount: number;
    sellCount: number;
    maxLevel: string;
  }

  const groupedSymbols: GroupedSymbol[] = Object.entries(groupsMap).map(([sym, symTrades]) => {
    const totProfit = symTrades.reduce((s, t) => s + t.currentProfit, 0);
    const totVol = symTrades.reduce((s, t) => s + t.volume, 0);
    const buyCount = symTrades.filter(t => t.type.toUpperCase() === "BUY" || t.type === "0").length;
    const sellCount = symTrades.length - buyCount;
    const levels = symTrades.map(t => parseInt(t.level.replace("N", "")) || 0);
    const maxLvl = levels.length > 0 ? `N${Math.max(...levels)}` : "N0";

    return {
      symbol: sym,
      trades: symTrades,
      totalProfit: totProfit,
      totalVolume: totVol,
      buyCount,
      sellCount,
      maxLevel: maxLvl,
    };
  });

  // Sort by profit: worst (lowest) first
  groupedSymbols.sort((a, b) => a.totalProfit - b.totalProfit);



  return (
    <div className={styles.tradesCard} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div>
          <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", marginBottom: "0.15rem" }}>
            Todas as Posições
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {trades.length} ordens · {totalLots.toFixed(3)} lotes · P&L:{" "}
            <strong style={{ color: totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontFamily: "monospace" }}>
              {formatProfitPrimary(totalProfit)}
            </strong>
          </span>
        </div>
        <span style={{
          background: "var(--opacity-bg-header)",
          border: "1px solid var(--border-light)",
          color: "var(--text-secondary)",
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "0.2rem 0.5rem",
          borderRadius: "6px"
        }}>
          {trades.length} ordens
        </span>
      </div>

      {trades.length === 0 ? (
        <div className={styles.emptyState} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className={styles.emptyStateText}>Nenhuma ordem aberta no momento.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", maxHeight: "310px", width: "100%", paddingRight: "0.25rem", marginTop: "0.75rem" }}>
          {groupedSymbols.map((group) => {
            const isExpanded = expandedSymbols[group.symbol] !== false;
            const isGroupProfit = group.totalProfit >= 0;
            const groupColor = isGroupProfit ? "var(--neon-green)" : "var(--neon-red)";

            // ── Shared grid: all rows use this exact same template ──────────
            // Col1: Ordem (flexible), Col2: Grade (44px), Col3: Lotes (64px), Col4: P&L (88px)
            const COLS = "1fr 44px 64px 88px";
            const ROW_PAD = "0 0.75rem";

            return (
              <div key={group.symbol} style={{
                marginBottom: "0.6rem",
                borderRadius: "12px",
                border: "1px solid var(--border-light)",
                background: "var(--opacity-bg-soft)",
                overflow: "hidden",
                width: "100%"
              }}>
                {/* ── Group summary header — same grid as rows below ── */}
                <div
                  onClick={() => toggleSymbol(group.symbol)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: "var(--opacity-bg-soft)",
                    padding: "0.5rem 0.75rem",
                    display: "grid",
                    gridTemplateColumns: COLS,
                    alignItems: "center",
                    userSelect: "none",
                  }}
                  className={styles.symbolGroupRow}
                >
                  {/* Col 1: chevron + symbol */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    {isExpanded
                      ? <ChevronDown size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                      : <ChevronRight size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />}
                    <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{group.symbol}</strong>
                  </div>

                  {/* Col 2: max grade badge — centered */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      fontSize: "0.6rem",
                      color: "var(--neon-gold)",
                      backgroundColor: "rgba(255, 184, 0, 0.06)",
                      border: "1px solid rgba(255, 184, 0, 0.15)",
                      padding: "0.05rem 0.3rem",
                      borderRadius: "3px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}>
                      {group.maxLevel}
                    </span>
                  </div>

                  {/* Col 3: total volume — centered */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {group.totalVolume.toFixed(3)}L
                    </span>
                  </div>

                  {/* Col 4: total P&L — right */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", color: groupColor, whiteSpace: "nowrap" }}>
                      {group.totalProfit >= 0 ? "+" : ""}{formatProfitPrimary(group.totalProfit)}
                    </span>
                  </div>
                </div>

                {/* ── Expanded detail section ── */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-light)", background: "rgba(0, 0, 0, 0.15)" }}>

                    {/* Column label header — same grid */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: COLS,
                      padding: "0.22rem 0.75rem",
                      borderBottom: "1px solid var(--opacity-border)",
                      background: "var(--opacity-bg-soft)",
                    }}>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.76rem)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ordem</span>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.76rem)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Grade</span>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.76rem)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Lotes</span>
                      <span style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.76rem)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>P&L</span>
                    </div>

                    {/* Data rows — same grid */}
                    {group.trades.map((trade) => {
                      const isBuy = trade.type.toUpperCase() === "BUY" || trade.type === "0";
                      const tProfit = trade.currentProfit;
                      const isProfit = tProfit >= 0;
                      const profitColor = isProfit ? "var(--neon-green)" : "var(--neon-red)";
                      const profitBg = isProfit ? "rgba(0, 230, 118, 0.05)" : "rgba(255, 23, 68, 0.05)";
                      const profitBorder = isProfit ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 23, 68, 0.15)";

                      return (
                        <div
                          key={trade.ticket}
                          style={{
                            display: "grid",
                            gridTemplateColumns: COLS,
                            alignItems: "center",
                            padding: "0.38rem 0.75rem",
                            borderBottom: "1px solid var(--opacity-border)",
                          }}
                        >
                          {/* Col 1: badge + ticket */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.1rem" }}>
                            <span
                              className={isBuy ? styles.badgeLong : styles.badgeShort}
                              style={{ fontSize: "clamp(0.68rem, 1.6vw, 0.76rem)", padding: "0.05rem 0.28rem", fontWeight: 800, borderRadius: "3px", whiteSpace: "nowrap" }}
                            >
                              {isBuy ? "COMPRA" : "VENDA"}
                            </span>
                            <span style={{ fontSize: "clamp(0.62rem, 1.5vw, 0.68rem)", color: "var(--text-muted)", fontFamily: "monospace", letterSpacing: "0.01em" }}>
                              #{trade.ticket}
                            </span>
                          </div>

                          {/* Col 2: grade — centered */}
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "clamp(0.72rem, 1.8vw, 0.82rem)", color: "var(--neon-gold)", fontFamily: "monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {trade.level}
                            </span>
                          </div>

                          {/* Col 3: volume — centered */}
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "clamp(0.78rem, 1.8vw, 0.88rem)", color: "var(--text-primary)", fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {trade.volume.toFixed(3)}L
                            </span>
                          </div>

                          {/* Col 4: P&L badge — right */}
                          <div style={{ textAlign: "right" }}>
                            <span style={{
                              color: profitColor,
                              backgroundColor: profitBg,
                              border: `1px solid ${profitBorder}`,
                              padding: "0.08rem 0.3rem",
                              borderRadius: "4px",
                              fontSize: "clamp(0.76rem, 1.8vw, 0.86rem)",
                              fontWeight: 700,
                              display: "inline-block",
                              whiteSpace: "nowrap",
                              fontFamily: "monospace",
                            }}>
                              {formatProfitPrimary(tProfit)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
