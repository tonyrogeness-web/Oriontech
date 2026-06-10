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
    setExpandedSymbols(prev => ({ ...prev, [sym]: !prev[sym] }));
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

  // Render mini visual bar for P&L scale inline
  const renderMiniBar = (profit: number) => {
    const maxLimit = 15.0; // scale limit for visual bar (USC)
    const pct = Math.min(100, (Math.abs(profit) / maxLimit) * 100);
    const isPos = profit >= 0;
    const barColor = isPos ? "var(--neon-green)" : "var(--neon-red)";
    return (
      <div style={{ display: "inline-block", width: "40px", height: "4px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "2px", overflow: "hidden", marginLeft: "8px", verticalAlign: "middle" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor }} />
      </div>
    );
  };

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
          background: "rgba(255, 255, 255, 0.03)",
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
        <div className={styles.tableWrapper} style={{ flex: 1, overflowY: "auto", overflowX: "auto", maxHeight: "310px", width: "100%" }}>
          <table className={styles.tradesTable} style={{ width: "100%", minWidth: "520px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Par / Ticket</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Tipo</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Nível</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Volume</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Preço Entrada</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", textAlign: "right" }}>P&L Posição</th>
              </tr>
            </thead>
            {groupedSymbols.map((group) => {
              const isExpanded = !!expandedSymbols[group.symbol];
              const isGroupProfit = group.totalProfit >= 0;
              const groupColor = isGroupProfit ? "var(--neon-green)" : "var(--neon-red)";
              
              return (
                <tbody key={group.symbol} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                  {/* Group Summary Accordion Header Row */}
                  <tr 
                    onClick={() => toggleSymbol(group.symbol)} 
                    style={{ 
                      cursor: "pointer", 
                      backgroundColor: "rgba(255, 255, 255, 0.015)",
                      transition: "background-color 0.2s" 
                    }}
                    className={styles.symbolGroupRow}
                  >
                    <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {isExpanded ? <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} /> : <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />}
                      <span>{group.symbol}</span>
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {group.buyCount > 0 && `Buy x${group.buyCount}`}
                      {group.buyCount > 0 && group.sellCount > 0 && " + "}
                      {group.sellCount > 0 && `Sell x${group.sellCount}`}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.68rem" }}>
                      Grade: {group.maxLevel}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      {group.totalVolume.toFixed(3)} L
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem" }} />
                    <td style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", textAlign: "right", fontWeight: 700, fontSize: "0.75rem", color: groupColor }}>
                      {group.totalProfit >= 0 ? "+" : ""}{formatProfitPrimary(group.totalProfit)}
                      {renderMiniBar(group.totalProfit)}
                    </td>
                  </tr>

                  {/* Individual position detail rows (Rendered if expanded) */}
                  {isExpanded && group.trades.map((trade) => {
                    const isBuy = trade.type.toUpperCase() === "BUY" || trade.type === "0";
                    const isJpy = trade.symbol.toUpperCase().includes("JPY");
                    const digits = isJpy ? 3 : 5;
                    const tProfit = trade.currentProfit;
                    const isProfit = tProfit >= 0;
                    const profitColor = isProfit ? "var(--neon-green)" : "var(--neon-red)";
                    const profitBg = isProfit ? "rgba(0, 230, 118, 0.06)" : "rgba(255, 23, 68, 0.06)";
                    const profitBorder = isProfit ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 23, 68, 0.2)";

                    return (
                      <tr key={trade.ticket} style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                        <td style={{ padding: "0.55rem 0.75rem", paddingLeft: "1.75rem", color: "var(--text-muted)", fontSize: "0.68rem" }}>
                          #{trade.ticket}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem" }}>
                          <span className={isBuy ? styles.badgeLong : styles.badgeShort} style={{ fontSize: "0.6rem", padding: "0.05rem 0.35rem" }}>
                            {isBuy ? "COMPRA" : "VENDA"}
                          </span>
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)", fontSize: "0.68rem" }}>
                          {trade.level}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {trade.volume.toFixed(3)}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {trade.entryPrice.toFixed(digits)}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", textAlign: "right", fontWeight: 600 }}>
                          <span style={{
                            color: profitColor,
                            backgroundColor: profitBg,
                            border: `1px solid ${profitBorder}`,
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                            fontSize: "0.65rem"
                          }}>
                            {formatProfitPrimary(tProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}
