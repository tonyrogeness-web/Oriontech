"use client";

import React from "react";
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
}

export default function TradesTable({ trades = [], currencyMode = "CENT" }: TradesTableProps) {
  const cleanSymbol = (sym: string) => {
    return sym.toUpperCase().replace("C", "").replace("/", "");
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

  return (
    <div className={styles.tradesCard} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div>
          <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", marginBottom: "0.15rem" }}>
            Todas as Posições
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {trades.length} ordens ativas · {totalLots.toFixed(3)} lotes totais
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
          <table className={styles.tradesTable} style={{ width: "100%", minWidth: "460px" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Par</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Tipo</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Nível</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem" }}>Volume</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", textAlign: "right" }}>Preço</th>
              </tr>
            </thead>
            <tbody>
              {tradesWithLevels.map((trade) => {
                const isBuy = trade.type.toUpperCase() === "BUY" || trade.type === "0";
                const isJpy = trade.symbol.toUpperCase().includes("JPY");
                const digits = isJpy ? 3 : 5;

                return (
                  <tr key={trade.ticket}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700 }}>
                      {cleanSymbol(trade.symbol)}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span className={isBuy ? styles.badgeLong : styles.badgeShort} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                        {isBuy ? "COMPRA" : "VENDA"}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {trade.level}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "monospace", fontWeight: 600 }}>
                      {trade.volume.toFixed(3)}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "monospace", textAlign: "right", fontWeight: 500 }}>
                      {trade.entryPrice.toFixed(digits)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
