import React from "react";
import { Wallet, Shield, DollarSign, Activity, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import styles from "./components.module.css";

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  rateBrl?: number;
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  rateBrl = 5.20,
}: KpiCardsProps) {
  const formatUsc = (val: number) => {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toBrl = (val: number) => {
    return (val * rateBrl).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;
  const floatingPct = balance > 0 ? (floatingPl / balance) * 100 : 0;

  // DD Color logic matching robot
  let ddColorClass = styles.valuePositive; // Green
  let ddLabel = "Baixo Risco (Verde)";
  if (maxDrawdown >= 10 && maxDrawdown < 20) {
    ddColorClass = styles.valueAmber; // Amber
    ddLabel = "Alerta (Amarelo)";
  } else if (maxDrawdown >= 20) {
    ddColorClass = styles.valueNegative; // Red
    ddLabel = "Crítico (Vermelho)";
  }

  return (
    <div className={styles.kpiGrid}>
      {/* Saldo / Balance */}
      <div className={`${styles.kpiCard} ${styles.kpiBalance}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Saldo da Conta</span>
          <Wallet size={20} style={{ color: "var(--neon-blue)" }} />
        </div>
        <div className={styles.kpiValue}>USC {formatUsc(balance)}</div>
        <div className={styles.kpiSubtext}>Est. {toBrl(balance)}</div>
      </div>

      {/* Capital Liquido / Equity */}
      <div className={`${styles.kpiCard} ${styles.kpiEquity}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Capital Líquido</span>
          <Shield size={20} style={{ color: "var(--neon-green)" }} />
        </div>
        <div className={styles.kpiValue}>USC {formatUsc(equity)}</div>
        <div className={styles.kpiSubtext}>Est. {toBrl(equity)}</div>
      </div>

      {/* Lucro de Hoje / Daily Profit */}
      <div className={`${styles.kpiCard} ${styles.kpiDaily}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Lucro de Hoje</span>
          {dailyProfit >= 0 ? (
            <ArrowUpRight size={20} style={{ color: "var(--neon-green)" }} />
          ) : (
            <ArrowDownRight size={20} style={{ color: "var(--neon-red)" }} />
          )}
        </div>
        <div className={`${styles.kpiValue} ${dailyProfit >= 0 ? styles.valuePositive : styles.valueNegative}`}>
          {dailyProfit >= 0 ? "+" : ""}
          {dailyPct.toFixed(2)}%
        </div>
        <div className={styles.kpiSubtext}>
          USC {formatUsc(dailyProfit)} | {toBrl(dailyProfit)}
        </div>
      </div>

      {/* Lucro Flutuante / Floating PL */}
      <div className={`${styles.kpiCard} ${floatingPl >= 0 ? styles.kpiProfit : styles.kpiDrawdown}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Flutuante Aberto</span>
          <Activity size={20} style={{ color: floatingPl >= 0 ? "var(--neon-green)" : "var(--neon-red)" }} />
        </div>
        <div className={`${styles.kpiValue} ${floatingPl >= 0 ? styles.valuePositive : styles.valueNegative}`}>
          {floatingPl >= 0 ? "+" : ""}
          {floatingPct.toFixed(2)}%
        </div>
        <div className={styles.kpiSubtext}>
          USC {formatUsc(floatingPl)} | {toBrl(floatingPl)}
        </div>
      </div>

      {/* Max Drawdown */}
      <div className={`${styles.kpiCard} ${styles.kpiDrawdown}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Drawdown Máximo</span>
          <Percent size={20} style={{ color: "var(--neon-red)" }} />
        </div>
        <div className={`${styles.kpiValue} ${ddColorClass}`}>{maxDrawdown.toFixed(2)}%</div>
        <div className={styles.kpiSubtext}>{ddLabel}</div>
      </div>
    </div>
  );
}
