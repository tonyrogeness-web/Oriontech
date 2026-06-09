import React from "react";
import { ArrowUpDown } from "lucide-react";
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
  rateBrl?: number;
}

export default function TradesTable({ trades = [], rateBrl = 5.20 }: TradesTableProps) {
  const formatUsc = (val: number) => {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toBrl = (val: number) => {
    return (val * rateBrl).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className={styles.tradesCard}>
      <h3 className={styles.cardTitle}>
        <ArrowUpDown size={20} className={styles.logoAccent} />
        Posições em Aberto ({trades.length})
      </h3>

      {trades.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>Nenhuma ordem aberta no momento.</p>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            O robô está aguardando condições de entrada...
          </span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Symbol</th>
                <th>Tipo</th>
                <th>Lotes</th>
                <th>Preço Entrada</th>
                <th>Preço Atual</th>
                <th style={{ textAlign: "right" }}>Lucro (USC)</th>
                <th style={{ textAlign: "right" }}>Lucro (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isBuy = trade.type.toUpperCase() === "BUY" || trade.type === "0";
                const isProfit = trade.currentProfit >= 0;

                return (
                  <tr key={trade.ticket}>
                    <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      #{trade.ticket}
                    </td>
                    <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                    <td>
                      <span className={isBuy ? styles.typeBuy : styles.typeSell}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                    </td>
                    <td>{trade.volume.toFixed(2)}</td>
                    <td>{trade.entryPrice.toFixed(5)}</td>
                    <td>{trade.currentPrice.toFixed(5)}</td>
                    <td
                      style={{ textAlign: "right", fontWeight: 600 }}
                      className={isProfit ? styles.valuePositive : styles.valueNegative}
                    >
                      {isProfit ? "+" : ""}
                      {formatUsc(trade.currentProfit)}
                    </td>
                    <td
                      style={{ textAlign: "right", fontWeight: 600 }}
                      className={isProfit ? styles.valuePositive : styles.valueNegative}
                    >
                      {isProfit ? "+" : ""}
                      {toBrl(trade.currentProfit)}
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
