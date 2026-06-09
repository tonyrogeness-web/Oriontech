"use client";

import React from "react";
import { ChevronUp, ChevronDown, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
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

interface ActiveBasketsProps {
  trades: Trade[];
  brlRate?: number;
}

interface Basket {
  symbol: string;
  direction: "COMPRA" | "VENDA";
  profit: number;
  volume: number;
  level: number;
  maxLevels: number;
  pm: number;
  currentPrice: number;
  tp: number;
  tpPoints: number;
  rcPrice: number;
  rcPoints: number;
  progress: number;
  digits: number;
}

function buildBaskets(trades: Trade[]): Basket[] {
  const map: Record<string, { symbol: string; direction: "COMPRA" | "VENDA"; trades: Trade[] }> = {};

  trades.forEach((t) => {
    const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
    const dir = isBuy ? "COMPRA" : "VENDA";
    // Remove trailing 'c' for cent accounts (e.g. EURUSDc → EURUSD)
    const sym = t.symbol.replace(/c$/i, "").toUpperCase();
    const key = `${sym}_${dir}`;
    if (!map[key]) map[key] = { symbol: sym, direction: dir, trades: [] };
    map[key].trades.push(t);
  });

  return Object.values(map).map((b) => {
    const totalVol = b.trades.reduce((s, t) => s + t.volume, 0);
    const totalProfit = b.trades.reduce((s, t) => s + t.currentProfit, 0);
    const pm =
      totalVol > 0
        ? b.trades.reduce((s, t) => s + t.entryPrice * t.volume, 0) / totalVol
        : 0;
    const currentPrice = b.trades[0]?.currentPrice ?? pm;
    const isBuy = b.direction === "COMPRA";

    const isJpy = b.symbol.includes("JPY");
    const digits = isJpy ? 3 : 5;
    const pipSize = isJpy ? 0.001 : 0.00001;

    // Target is estimated based on the robot's typical TP (InpTakeProfitDinheiro / volume)
    const avgVol = totalVol / b.trades.length;
    const tpPoints = Math.round(1.5 / (avgVol * (isJpy ? 0.01 : 0.0001)));
    const tpDiff = tpPoints * pipSize;
    const tp = isBuy ? pm + tpDiff : pm - tpDiff;

    // Next RC estimate: robot uses dist_base * ATR; approximate as similar to tpPoints
    const rcPoints = Math.round(tpPoints * 0.9);
    const rcDiff = rcPoints * pipSize;
    const rcPrice = isBuy ? pm - rcDiff : pm + rcDiff;

    // Progress: how far currentPrice has moved toward TP relative to tpDiff
    let progress = 0;
    if (tpDiff > 0) {
      progress = isBuy
        ? ((currentPrice - pm) / tpDiff) * 100
        : ((pm - currentPrice) / tpDiff) * 100;
    }
    progress = Math.max(-100, Math.min(100, Math.round(progress)));

    return {
      symbol: b.symbol,
      direction: b.direction,
      profit: totalProfit,
      volume: totalVol,
      level: b.trades.length,
      maxLevels: 6,
      pm,
      currentPrice,
      tp,
      tpPoints,
      rcPrice,
      rcPoints,
      progress,
      digits,
    };
  });
}

// ─── Group baskets by symbol for the "per-currency" layout ───────────────────
function groupBySymbol(baskets: Basket[]): Record<string, Basket[]> {
  const g: Record<string, Basket[]> = {};
  baskets.forEach((b) => {
    if (!g[b.symbol]) g[b.symbol] = [];
    g[b.symbol].push(b);
  });
  return g;
}

const MOCK_BASKETS: Basket[] = [
  {
    symbol: "EURUSD", direction: "COMPRA",
    profit: -133.56, volume: 0.63, level: 3, maxLevels: 6,
    pm: 1.15644, currentPrice: 1.15608, tp: 1.15779, tpPoints: 347,
    rcPrice: 1.15367, rcPoints: 188, progress: -10, digits: 5,
  },
  {
    symbol: "EURUSD", direction: "VENDA",
    profit: -31.36, volume: 0.64, level: 2, maxLevels: 6,
    pm: 1.15391, currentPrice: 1.15608, tp: 1.15256, tpPoints: 184,
    rcPrice: 1.15739, rcPoints: 351, progress: -100, digits: 5,
  },
  {
    symbol: "USDJPY", direction: "COMPRA",
    profit: -15.96, volume: 0.64, level: 1, maxLevels: 6,
    pm: 160.408, currentPrice: 160.350, tp: 160.688, tpPoints: 280,
    rcPrice: 160.028, rcPoints: 380, progress: -14, digits: 3,
  },
];

// ─── Sub-component: one basket card ──────────────────────────────────────────
function BasketCard({ b }: { b: Basket }) {
  const isBuy = b.direction === "COMPRA";
  const isProfit = b.profit >= 0;
  const profitColor = isProfit ? "var(--neon-green)" : "var(--neon-red)";
  const fmtProfit = Math.abs(b.profit).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fmtPrice = (v: number) => v.toFixed(b.digits);

  // Grade blocks
  const blocks = Array.from({ length: b.maxLevels }, (_, i) => {
    const filled = i < b.level;
    return (
      <div
        key={i}
        className={`${styles.gridBlock} ${
          filled
            ? isBuy
              ? styles.gridBlockFilledBuy
              : styles.gridBlockFilledSell
            : ""
        }`}
      />
    );
  });

  const isHighLevel = b.level >= 4;
  const tpColor = isBuy ? "var(--neon-green)" : "var(--neon-gold)";
  const progressAbs = Math.abs(b.progress);
  const progressColor = b.progress >= 0 ? "var(--neon-green)" : "var(--neon-red)";

  return (
    <div
      className={`${styles.basketCard} ${
        isBuy ? styles.basketCardBorderBuy : styles.basketCardBorderSell
      }`}
    >
      {/* ── Header ── */}
      <div className={styles.basketHeader}>
        <div className={styles.basketTitleGroup}>
          <span className={styles.basketSymbol}>{b.symbol}</span>
          <span
            className={`${styles.basketDirection} ${
              isBuy ? styles.directionBuy : styles.directionSell
            }`}
          >
            {isBuy ? (
              <ChevronUp size={9} style={{ display: "inline", marginRight: 1 }} />
            ) : (
              <ChevronDown size={9} style={{ display: "inline", marginRight: 1 }} />
            )}
            {b.direction}
          </span>
          {isHighLevel && (
            <span className={styles.riskBadge}>
              <AlertTriangle size={9} />
              {b.level}/6
            </span>
          )}
        </div>
        <div className={styles.basketProfit} style={{ color: profitColor }}>
          {isProfit ? "+" : "-"}
          {fmtProfit}
          <span className={styles.basketProfitSubtext}>USC flutuante</span>
        </div>
      </div>

      {/* ── Nível e Mult ── */}
      <div className={styles.basketLevelRow}>
        <span style={{ color: isHighLevel ? "var(--neon-red)" : "var(--text-muted)" }}>
          Nível {b.level} de {b.maxLevels} · Mult 1.50×
        </span>
      </div>

      {/* ── Detalhes ── */}
      <div className={styles.basketDetails}>
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Preço Médio</span>
          <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
            {fmtPrice(b.pm)}
          </span>
        </div>

        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Alvo TP</span>
          <span
            className={styles.basketRowValue}
            style={{ color: tpColor, fontFamily: "monospace" }}
          >
            {fmtPrice(b.tp)}{" "}
            <span style={{ fontSize: "0.68rem", fontWeight: 500 }}>
              ({isBuy ? "+" : "-"}
              {b.tpPoints} pts)
            </span>
          </span>
        </div>

        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Volume Total</span>
          <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
            {b.volume.toFixed(3)} L
          </span>
        </div>

        {/* Grade blocos */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Grade</span>
          <div className={styles.gridBlocks}>{blocks}</div>
        </div>

        {/* Progresso ao TP */}
        <div className={styles.tpProgressWrapper}>
          <div className={styles.tpProgressHeader}>
            <span className={styles.basketRowLabel}>Progresso ao TP</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: progressColor }}>
              {b.progress > 0 ? "+" : ""}
              {b.progress}%
            </span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{
                width: `${Math.max(2, progressAbs)}%`,
                background:
                  b.progress >= 0
                    ? "linear-gradient(90deg, #00c853, #00ff88)"
                    : "linear-gradient(90deg, #c62828, #ff1744)",
                boxShadow: `0 0 6px ${progressColor}88`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Footer: Prox. RC ── */}
      <div className={styles.basketFooter}>
        <span>
          Prox. RC:{" "}
          <strong
            style={{
              color: isHighLevel ? "var(--neon-red)" : "var(--neon-blue)",
              fontFamily: "monospace",
            }}
          >
            H4 FR @ {fmtPrice(b.rcPrice)}
          </strong>
        </span>
        <span style={{ color: isHighLevel ? "var(--neon-red)" : "var(--text-muted)" }}>
          ({isBuy ? "-" : "+"}
          {b.rcPoints} pts)
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActiveBaskets({ trades = [], brlRate = 5.45 }: ActiveBasketsProps) {
  const liveBaskets = buildBaskets(trades);
  const displayBaskets = liveBaskets.length > 0 ? liveBaskets : MOCK_BASKETS;

  const grouped = groupBySymbol(displayBaskets);
  const symbols = Object.keys(grouped).sort();

  if (displayBaskets.length === 0) {
    return (
      <div className={styles.basketsSection}>
        <div className={styles.basketsSectionHeader}>
          <span className={styles.basketsSectionTitle}>Cestos Ativos por Moeda</span>
          <span className={styles.basketsCount}>0 cestos</span>
        </div>
        <div className={styles.basketsEmpty}>
          <TrendingUp size={32} style={{ opacity: 0.3 }} />
          <p>Nenhum cesto ativo no momento</p>
        </div>
      </div>
    );
  }

  // Total global P&L
  const totalPl = displayBaskets.reduce((s, b) => s + b.profit, 0);
  const totalTrades = trades.length;

  return (
    <div className={styles.basketsSection}>
      {/* ── Section header ── */}
      <div className={styles.basketsSectionHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={styles.basketsSectionTitle}>Cestos Ativos por Moeda</span>
          <span className={styles.basketsCount}>
            {displayBaskets.length} cesto{displayBaskets.length !== 1 ? "s" : ""} ·{" "}
            {symbols.length} par{symbols.length !== 1 ? "es" : ""}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: totalPl >= 0 ? "var(--neon-green)" : "var(--neon-red)",
          }}
        >
          {totalPl >= 0 ? "+" : ""}
          {totalPl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC total
        </div>
      </div>

      {/* ── Por Símbolo ── */}
      <div className={styles.basketsBySymbol}>
        {symbols.map((sym) => {
          const symBaskets = grouped[sym];
          const symPl = symBaskets.reduce((s, b) => s + b.profit, 0);
          const symPlColor = symPl >= 0 ? "var(--neon-green)" : "var(--neon-red)";
          const hasBuy = symBaskets.some((b) => b.direction === "COMPRA");
          const hasSell = symBaskets.some((b) => b.direction === "VENDA");

          return (
            <div key={sym} className={styles.symbolGroup}>
              {/* Symbol header bar */}
              <div className={styles.symbolGroupHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className={styles.symbolGroupName}>{sym}</span>
                  {hasBuy && (
                    <span className={styles.symbolDirTag} style={{ color: "var(--neon-green)", borderColor: "rgba(0,230,118,0.2)" }}>
                      <TrendingUp size={10} /> COMPRA
                    </span>
                  )}
                  {hasSell && (
                    <span className={styles.symbolDirTag} style={{ color: "var(--neon-red)", borderColor: "rgba(255,23,68,0.2)" }}>
                      <TrendingDown size={10} /> VENDA
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: symPlColor,
                    fontFamily: "monospace",
                  }}
                >
                  {symPl >= 0 ? "+" : ""}
                  {symPl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC
                </span>
              </div>

              {/* Basket cards for this symbol */}
              <div
                className={styles.symbolBaskets}
                style={{
                  gridTemplateColumns: symBaskets.length === 1 ? "1fr" : "repeat(2, 1fr)",
                }}
              >
                {symBaskets.map((b, i) => (
                  <BasketCard key={`${b.symbol}_${b.direction}_${i}`} b={b} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
