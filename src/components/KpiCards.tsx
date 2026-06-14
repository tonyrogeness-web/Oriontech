"use client";

import { Wallet, Coins, TrendingUp, Globe, ShieldAlert, Target, DollarSign } from "lucide-react";
import styles from "./components.module.css";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
}

interface KpiCardsProps {
  balance: number;
  equity: number;
  dailyProfit: number;
  floatingPl: number;
  totalProfit: number;
  maxDrawdown: number;
  brlRate?: number;
  currencyMode: "CENT" | "BRL";
  history?: PerformancePoint[];
  trailingActive?: boolean;
  trailingPeak?: number;
  ddReached10?: boolean;
  ddReached20?: boolean;
  equityCycleBase?: number;
  equityCycleTargetPct?: number;
}

/* ── Sparkline component inside KpiCards.tsx ── */
function Sparkline({ data, color, width = 85, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  let plotData = [...data];
  
  // Render placeholder sine-like wave if history is empty
  if (plotData.length < 2) {
    plotData = [10, 13, 11, 14, 13, 16, 15, 18];
  }

  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;

  const padding = 1.5;

  const points = plotData
    .map((val, idx) => {
      const x = (idx / (plotData.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={styles.sparkline}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.0"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function KpiCards({
  balance = 0,
  equity = 0,
  dailyProfit = 0,
  floatingPl = 0,
  totalProfit = 0,
  maxDrawdown = 0,
  brlRate = 5.45,
  currencyMode = "CENT",
  history = [],
  trailingActive = false,
  trailingPeak = 0,
  ddReached10 = false,
  ddReached20 = false,
  equityCycleBase = 0,
  equityCycleTargetPct = 5.0,
}: KpiCardsProps) {
  // Format primary value (main display)
  const formatValPrimary = (val: number) => {
    const absVal = Math.abs(val);
    const isNeg = val < 0;
    const sign = isNeg ? "-" : "";

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

  // Format secondary value (sub-label) - returns absolute value without sign
  const formatValSecondary = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT") {
      const convertedBrl = (absVal / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} BRL`;
    } else { // BRL
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} USC`;
    }
  };

  const dailyPct = balance > 0 ? (dailyProfit / balance) * 100 : 0;
  const periodPct = balance > 0 ? (totalProfit / balance) * 100 : 0;

  // Drawdown zones
  let ddZone = "Zona Verde";
  let ddBadge = "SEGURO";
  let ddColorClass = styles.kpiBadgeGreen;
  let ddBorderClass = styles.kpiCardBorderGold;
  let ddGlowClass = styles.goldGlow;
  if (maxDrawdown >= 10 && maxDrawdown < 20) {
    ddZone = "Zona Amarela";
    ddBadge = "ALERTA";
    ddColorClass = styles.kpiBadgeGold;
    ddBorderClass = styles.kpiCardBorderAmber;
    ddGlowClass = styles.amberGlow;
  } else if (maxDrawdown >= 20) {
    ddZone = "Zona Vermelha";
    ddBadge = "CRÍTICO";
    ddColorClass = styles.kpiBadgeRed;
    ddBorderClass = styles.kpiCardBorderRed;
    ddGlowClass = styles.redGlow;
  }

  // Extract history curves
  const balanceHistory = history.map((h) => h.balance);
  const equityHistory = history.map((h) => h.balance + h.profit);
  const dailyProfitHistory = history.map((h) => h.profit);
  
  // Cumulative global profit path
  let globalCum = 0;
  const globalProfitHistory = history.map((h) => {
    globalCum += h.profit;
    return globalCum;
  });

  // Simulated drawdown risk curves
  const drawdownTrendHistory = history.map((h) => (h.profit < 0 ? Math.abs(h.profit) : 0));

  // Saldo Inicial
  const startBalance = equityCycleBase > 0 ? equityCycleBase : (balance - totalProfit);

  // Patrimônio Líquido (Saldo Líquido)
  const equityCalc = equity;
  const isEquityAboveStart = equityCalc >= startBalance;
  const equityDiffPctFromStart = startBalance > 0 ? ((equityCalc - startBalance) / startBalance) * 100 : 0;

  // Saldo Atual variação
  const balanceDiffPct = startBalance > 0 ? ((balance - startBalance) / startBalance) * 100 : 0;

  // Lucro Global Líquido (Realizado + Flutuante)
  const netProfitCalc = totalProfit + floatingPl;
  const netProfitPctCalc = startBalance > 0 ? (netProfitCalc / startBalance) * 100 : 0;

  // 6. Ciclo Equity Calculations
  const targetPct = equityCycleTargetPct > 0 ? equityCycleTargetPct : 5.0;
  const progressPct = targetPct > 0 ? (trailingPeak / targetPct) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPct));
  
  const targetValue = equityCycleBase * (1 + targetPct / 100);
  const profitNet = equityCycleBase * (trailingPeak / 100);

  let cycleBadge = "ATIVO";
  let cycleBadgeColorClass = styles.kpiBadgeGreen;
  let cycleBorderClass = styles.kpiCardBorderGreen;
  let cycleGlowClass = styles.greenGlow;
  let cycleColorVal = "var(--neon-green)";

  if (!trailingActive) {
    cycleBadge = "INATIVO";
    cycleBadgeColorClass = styles.kpiBadgeMuted;
    cycleBorderClass = styles.kpiCardBorderMuted;
    cycleGlowClass = "";
    cycleColorVal = "var(--text-muted)";
  } else if (ddReached20) {
    cycleBadge = "CRÍTICO";
    cycleBadgeColorClass = styles.kpiBadgeRed;
    cycleBorderClass = styles.kpiCardBorderRed;
    cycleGlowClass = styles.redGlow;
    cycleColorVal = "var(--neon-red)";
  } else if (ddReached10) {
    cycleBadge = "ALERTA";
    cycleBadgeColorClass = styles.kpiBadgeGold;
    cycleBorderClass = styles.kpiCardBorderAmber;
    cycleGlowClass = styles.amberGlow;
    cycleColorVal = "var(--neon-amber)";
  }

  const progressPercentText = clampedProgress.toFixed(0);
  const solidCount = Math.max(0, Math.min(10, Math.round(clampedProgress / 10)));
  const emptyCount = 10 - solidCount;
  const barStr = "[" + "█".repeat(solidCount) + "░".repeat(emptyCount) + "]";

  const isProfitPositive = profitNet >= 0;
  const profitColor = isProfitPositive ? "var(--neon-green)" : "var(--neon-red)";

  return (
    <>
      {/* ── PERFORMANCE DO DIA SECTION ── */}
      <div className={styles.kpiSectionHeader}>Performance do Dia</div>
      <div className={styles.kpiRowGrid}>
        {/* 2. Lucro Hoje */}
        <div className={`${styles.kpiCardMockup} ${dailyProfit >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderAmber} ${styles.kpiCardLarge}`}>
          <div className={styles.kpiHeaderRow}>
            <span className={styles.kpiLabelMockup}>Lucro Hoje</span>
            <div className={`${styles.kpiIconContainer} ${dailyProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
              <TrendingUp size={14} />
            </div>
          </div>
          <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
            {dailyProfit >= 0 ? "+" : ""}{formatValPrimary(dailyProfit)}
          </span>
          <span className={`${styles.kpiSubValueMockup} tabular-nums`}>
            {dailyProfit >= 0 ? "+" : ""}{formatValSecondary(dailyProfit)}
          </span>
          <span className={`${styles.kpiBadgeMockup} ${dailyProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
            {dailyProfit >= 0 ? "+" : ""}{dailyPct.toFixed(2)}%
          </span>
          <Sparkline data={dailyProfitHistory} color={dailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)"} />
        </div>

        {/* 3. L. Global */}
        <div className={`${styles.kpiCardMockup} ${totalProfit >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderAmber} ${styles.kpiCardLarge}`}>
          <div className={styles.kpiHeaderRow}>
            <span className={styles.kpiLabelMockup}>L. Global</span>
            <div className={`${styles.kpiIconContainer} ${totalProfit >= 0 ? styles.greenGlow : styles.amberGlow}`}>
              <Globe size={14} />
            </div>
          </div>
          <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)" }}>
            {totalProfit >= 0 ? "+" : ""}{formatValPrimary(totalProfit)}
          </span>
          <span className={`${styles.kpiSubValueMockup} tabular-nums`} style={{ fontSize: "0.80rem" }}>
            Líq: {formatValPrimary(netProfitCalc)}
          </span>
          <span className={`${styles.kpiBadgeMockup} ${totalProfit >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`}>
            {totalProfit >= 0 ? "+" : ""}{periodPct.toFixed(2)}%
          </span>
          <Sparkline data={globalProfitHistory} color={totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-amber)"} />
        </div>
      </div>

      {/* ── PATRIMÔNIO SECTION ── */}
      <div className={styles.kpiSectionHeader}>Patrimônio</div>
      <div className={`${styles.patrimonioUnifiedCard} ${floatingPl >= 0 ? styles.kpiCardBorderGreen : styles.kpiCardBorderRed}`}>
        {/* Header: Title and Floating P/L badge */}
        <div className={styles.patrimonioHeader}>
          <div className={styles.patrimonioTitleGroup}>
            <div className={`${styles.kpiIconContainer} ${styles.blueGlow}`}>
              <Coins size={15} />
            </div>
            <span className={styles.patrimonioMainTitle}>Visão Geral</span>
          </div>
          <span className={`${styles.patrimonioPlBadge} ${floatingPl >= 0 ? styles.badgeGreen : styles.badgeRed}`}>
            P/L: {floatingPl >= 0 ? "+" : ""}{formatValPrimary(floatingPl)}
          </span>
        </div>

        {/* Grid: 2x2 columns */}
        <div className={styles.patrimonioColsGrid}>
          {/* Col 1: Saldo Inicial */}
          <div className={styles.patrimonioCol}>
            <span className={styles.patrimonioColLabel}>SALDO INICIAL</span>
            <span className={`${styles.patrimonioColValue} tabular-nums`} style={{ color: "var(--text-muted)" }}>
              {formatValPrimary(startBalance)}
            </span>
            <span className={`${styles.patrimonioColSubValue} tabular-nums`}>
              {formatValSecondary(startBalance)}
            </span>
            <div className={styles.patrimonioColBadgeContainer}>
              <span className={`${styles.kpiBadgeMockup} ${styles.kpiBadgeMuted}`} style={{ marginTop: 0 }}>
                BASE
              </span>
            </div>
          </div>

          {/* Col 2: Saldo Atual */}
          <div className={styles.patrimonioCol}>
            <span className={styles.patrimonioColLabel}>SALDO ATUAL</span>
            <span className={`${styles.patrimonioColValue} tabular-nums`} style={{ color: "var(--neon-gold)" }}>
              {formatValPrimary(balance)}
            </span>
            <span className={`${styles.patrimonioColSubValue} tabular-nums`}>
              {formatValSecondary(balance)}
            </span>
            <div className={styles.patrimonioColBadgeContainer}>
              <span className={`${styles.kpiBadgeMockup} ${balanceDiffPct >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`} style={{ marginTop: 0 }}>
                {balanceDiffPct >= 0 ? "+" : ""}{balanceDiffPct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Col 3: Saldo Líquido */}
          <div className={styles.patrimonioCol}>
            <span className={styles.patrimonioColLabel}>SALDO LÍQUIDO</span>
            <span className={`${styles.patrimonioColValue} tabular-nums`} style={{ color: isEquityAboveStart ? "var(--neon-green)" : "var(--neon-red)" }}>
              {formatValPrimary(equityCalc)}
            </span>
            <span className={`${styles.patrimonioColSubValue} tabular-nums`}>
              {formatValSecondary(equityCalc)}
            </span>
            <div className={styles.patrimonioColBadgeContainer}>
              <span className={`${styles.kpiBadgeMockup} ${equityDiffPctFromStart >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`} style={{ marginTop: 0 }}>
                {equityDiffPctFromStart >= 0 ? "+" : ""}{equityDiffPctFromStart.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Col 4: L. Líquido */}
          <div className={styles.patrimonioCol}>
            <span className={styles.patrimonioColLabel}>L. LÍQUIDO</span>
            <span className={`${styles.patrimonioColValue} tabular-nums`} style={{ color: netProfitCalc >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
              {netProfitCalc >= 0 ? "+" : ""}{formatValPrimary(netProfitCalc)}
            </span>
            <span className={`${styles.patrimonioColSubValue} tabular-nums`}>
              {formatValSecondary(netProfitCalc)}
            </span>
            <div className={styles.patrimonioColBadgeContainer}>
              <span className={`${styles.kpiBadgeMockup} ${netProfitCalc >= 0 ? styles.kpiBadgeGreen : styles.kpiBadgeRed}`} style={{ marginTop: 0 }}>
                {netProfitPctCalc >= 0 ? "+" : ""}{netProfitPctCalc.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DRAWDOWN SECTION ── */}
      <div className={styles.kpiSectionHeader}>Risco de Drawdown</div>
      <div className={styles.kpiRowGrid}>
        {/* 6. Drawdown Atual */}
        <div className={`${styles.kpiCardMockup} ${ddBorderClass} ${styles.kpiCardFull}`}>
          <div className={styles.kpiHeaderRow}>
            <span className={styles.kpiLabelMockup}>Drawdown Atual</span>
            <div className={`${styles.kpiIconContainer} ${ddGlowClass}`}>
              <ShieldAlert size={14} />
            </div>
          </div>
          <span className={`${styles.kpiValueMockup} tabular-nums`} style={{ color: maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)" }}>
            {maxDrawdown.toFixed(1)}%
          </span>
          <span className={styles.kpiSubValueMockup}>
            {ddZone} · Limite 40%
          </span>
          <span className={`${styles.kpiBadgeMockup} ${ddColorClass}`} style={{ marginBottom: "0.2rem" }}>
            {ddBadge}
          </span>
          
          <div style={{ marginTop: "0.4rem", width: "100%", height: "3px", background: "var(--opacity-divider)", borderRadius: "2px", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (maxDrawdown / 40) * 100)}%`,
                background: maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)",
                opacity: 0.8,
                transition: "width 0.5s ease"
              }}
            />
            <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, width: "1px", background: "var(--opacity-border)" }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "var(--opacity-border)" }} />
          </div>

          <Sparkline data={drawdownTrendHistory} color={maxDrawdown >= 20 ? "var(--neon-red)" : maxDrawdown >= 10 ? "var(--neon-amber)" : "var(--neon-gold)"} />
        </div>
      </div>

      {/* Dedicated Full-Width Equity Cycle Card */}
      <div className={`${styles.equityCycleCardFull} ${cycleBorderClass}`}>
        
        {/* Left Side: Status Block */}
        <div className={styles.eqCycleLeft}>
          <div className={`${styles.kpiIconContainer} ${cycleGlowClass}`}>
            <Target size={15} />
          </div>
          <div className={styles.eqCycleTitleBlock}>
            <span className={styles.eqCycleLabel}>Ciclo Equity</span>
            <span className={`${styles.kpiBadgeMockup} ${cycleBadgeColorClass}`}>
              {cycleBadge}
            </span>
          </div>
        </div>

        {/* Center: Meta Base / Target on Line 1, Profit / Progress on Line 2 */}
        <div className={styles.eqCycleCenter}>
          {trailingActive ? (
            <div className={styles.eqCycleValueColumn} style={{ width: "100%" }}>
              <div className={styles.eqCycleGrid}>
                <div className={styles.eqCycleGridItem}>
                  <div className={styles.eqCycleInlineRow}>
                    <div className={styles.eqCycleValueSubBlock}>
                      <span className={styles.eqCycleValueLabel}>BASE</span>
                      <span className={`${styles.eqCycleValue} tabular-nums`}>{formatValPrimary(equityCycleBase)}</span>
                    </div>
                    <div className={styles.eqCycleValueSubBlock}>
                      <span className={styles.eqCycleValueLabel}>ALVO (+{targetPct.toFixed(0)}%)</span>
                      <span className={`${styles.eqCycleValue} tabular-nums`}>{formatValPrimary(targetValue)}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.eqCycleGridItem}>
                  <span className={styles.eqCycleValueLabel} style={{ color: profitColor }}>LUCRO LÍQ.</span>
                  <span className={`${styles.eqCycleProfitValue} tabular-nums`} style={{ color: profitColor }}>
                    {profitNet >= 0 ? "+" : ""}{formatValPrimary(profitNet)} ({trailingPeak >= 0 ? "+" : ""}{trailingPeak.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              {/* Graphical Progress Bar instead of text bracket */}
              <div className={styles.eqCycleProgressBarContainer}>
                <div className={styles.eqCycleProgressBarTrack}>
                  <div className={styles.eqCycleProgressBarFill} style={{ width: `${clampedProgress}%`, background: cycleColorVal }} />
                </div>
                <span className={styles.eqCycleProgressText} style={{ color: cycleColorVal }}>
                  {progressPercentText}%
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.eqCycleValueColumn}>
              <span className={styles.eqCycleInactiveText}>Sistema de Trailing de Patrimônio Líquido</span>
              <span className={styles.eqCycleInactiveSub}>Aguardando início do próximo ciclo</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
