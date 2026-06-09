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
}

interface TradesTableProps {
  trades: Trade[];
}

export default function TradesTable({ trades = [] }: TradesTableProps) {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  const getAssetDetails = (symbol: string) => {
    const s = symbol.toUpperCase().replace("C", "").replace("/",""); // clean suffix like EURUSDc
    if (s.includes("EURUSD")) return { flag: "🇪🇺🇺🇸", label: "EUR/USD" };
    if (s.includes("GBPJPY")) return { flag: "🇬🇧🇯🇵", label: "GBP/JPY" };
    if (s.includes("USDJPY")) return { flag: "🇺🇸🇯🇵", label: "USD/JPY" };
    if (s.includes("GBPUSD")) return { flag: "🇬🇧🇺🇸", label: "GBP/USD" };
    if (s.includes("EURJPY")) return { flag: "🇪🇺🇯🇵", label: "EUR/JPY" };
    if (s.includes("AUDUSD")) return { flag: "🇦🇺🇺🇸", label: "AUD/USD" };
    if (s.includes("USDCAD")) return { flag: "🇺🇸🇨🇦", label: "USD/CAD" };
    return { flag: "🌐", label: symbol };
  };

  // Calculate total lots
  const totalLots = trades.reduce((acc, t) => acc + t.volume, 0);

  return (
    <div className={styles.tradesCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 className={styles.cardTitle} style={{ margin: 0 }}>Active Pairs & Trades</h3>
        <span style={{ fontSize: "0.825rem", color: "var(--neon-green)", fontWeight: 600 }}>
          {trades.length} ACTIVE TRADES (Total: {totalLots.toFixed(2)} Lots)
        </span>
      </div>

      {trades.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhuma ordem aberta no momento.</p>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            O robô está monitorando os sinais de mercado...
          </span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
                <th>Trade</th>
                <th>Entry</th>
                <th>SL/TP</th>
                <th style={{ textAlign: "right" }}>P/L</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isBuy = trade.type.toUpperCase() === "BUY" || trade.type === "0";
                const isProfit = trade.currentProfit >= 0;
                const asset = getAssetDetails(trade.symbol);

                return (
                  <tr key={trade.ticket}>
                    <td>
                      <div className={styles.flagBadge}>
                        <span style={{ fontSize: "1.25rem" }}>{asset.flag}</span>
                        <span>{asset.label}</span>
                      </div>
                    </td>
                    <td>
                      <span className={isBuy ? styles.badgeLong : styles.badgeShort}>
                        {isBuy ? "Long" : "Short"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{trade.volume.toFixed(2)} Lots</td>
                    <td style={{ fontFamily: "monospace" }}>{trade.entryPrice.toFixed(5)}</td>
                    <td style={{ color: "var(--text-muted)" }}>SL/TP</td>
                    <td
                      style={{ textAlign: "right", fontWeight: 700 }}
                      className={isProfit ? styles.valuePositive : styles.valueNegative}
                    >
                      {isProfit ? "+" : ""}
                      {formatCurrency(trade.currentProfit)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", borderColor: "var(--border-light)", borderWidth: "1px", borderStyle: "solid" }}>
                        Open
                      </span>
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
