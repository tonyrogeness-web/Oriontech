"use client";

import React from "react";
import { ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
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
}

export default function ActiveBaskets({ trades = [] }: ActiveBasketsProps) {
  const cleanSymbol = (sym: string) => {
    return sym.toUpperCase().replace("C", "").replace("/", "");
  };

  const getBaskets = () => {
    const basketsMap: { [key: string]: {
      symbol: string;
      direction: "COMPRA" | "VENDA";
      trades: Trade[];
    }} = {};

    trades.forEach((t) => {
      const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
      const dir = isBuy ? "COMPRA" : "VENDA";
      const symClean = cleanSymbol(t.symbol);
      const key = `${symClean}_${dir}`;

      if (!basketsMap[key]) {
        basketsMap[key] = {
          symbol: symClean,
          direction: dir,
          trades: [],
        };
      }
      basketsMap[key].trades.push(t);
    });

    return Object.values(basketsMap).map((b) => {
      const count = b.trades.length;
      const totalVolume = b.trades.reduce((acc, curr) => acc + curr.volume, 0);
      const totalProfit = b.trades.reduce((acc, curr) => acc + curr.currentProfit, 0);
      
      // Calculate Average Entry Price (PM)
      const sumVolPrice = b.trades.reduce((acc, curr) => acc + (curr.entryPrice * curr.volume), 0);
      const pm = totalVolume > 0 ? sumVolPrice / totalVolume : 0;
      
      const currentPrice = b.trades[0]?.currentPrice || pm;
      const isBuy = b.direction === "COMPRA";

      // Estimate TP and details based on symbol type
      const isJpy = b.symbol.includes("JPY");
      const digits = isJpy ? 3 : 5;
      const pointsMultiplier = isJpy ? 0.001 : 0.00001;
      
      // Typical targets in points
      const tpPoints = isJpy ? 280 : 178;
      const tpDiff = tpPoints * pointsMultiplier;
      const tp = isBuy ? (pm + tpDiff) : (pm - tpDiff);

      // Estimate Next Recompra (RC)
      const rcPoints = isJpy ? 380 : 162;
      const rcDiff = rcPoints * pointsMultiplier;
      const rcPrice = isBuy ? (pm - rcDiff) : (pm + rcDiff);

      // Progress to TP calculation
      let progress = 0;
      if (isBuy) {
        progress = ((currentPrice - pm) / tpDiff) * 100;
      } else {
        progress = ((pm - currentPrice) / tpDiff) * 100;
      }
      progress = Math.max(-100, Math.min(100, Math.round(progress)));

      return {
        symbol: b.symbol,
        direction: b.direction,
        profit: totalProfit,
        volume: totalVolume,
        level: count,
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
  };

  const activeBaskets = getBaskets();

  // If no active baskets, return mockup data matching the screenshot
  const displayBaskets = activeBaskets.length > 0 ? activeBaskets : [
    {
      symbol: "EURUSD",
      direction: "COMPRA" as const,
      profit: 2.14,
      volume: 0.068,
      level: 3,
      pm: 1.08342,
      currentPrice: 1.08398,
      tp: 1.08520,
      tpPoints: 178,
      rcPrice: 1.08180,
      rcPoints: 162,
      progress: 67,
      digits: 5,
    },
    {
      symbol: "EURUSD",
      direction: "VENDA" as const,
      profit: -0.88,
      volume: 0.026,
      level: 2,
      pm: 1.08280,
      currentPrice: 1.08315,
      tp: 1.08120,
      tpPoints: 160,
      rcPrice: 1.08420,
      rcPoints: 140,
      progress: -22,
      digits: 5,
    },
    {
      symbol: "USDJPY",
      direction: "VENDA" as const,
      profit: -3.42,
      volume: 0.091,
      level: 4,
      pm: 149.820,
      currentPrice: 149.920,
      tp: 149.540,
      tpPoints: 280,
      rcPrice: 150.200,
      rcPoints: 380,
      progress: -35,
      digits: 3,
      isBreakEven: true,
    }
  ];

  return (
    <div className={styles.basketsGrid}>
      {displayBaskets.map((b, idx) => {
        const isBuy = b.direction === "COMPRA";
        const isProfit = b.profit >= 0;
        const formattedProfit = Math.abs(b.profit).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        // Generate filled blocks for visual grid levels
        const blocks = [];
        for (let i = 1; i <= 6; i++) {
          const isFilled = i <= b.level;
          blocks.push(
            <div
              key={i}
              className={`${styles.gridBlock} ${
                isFilled 
                  ? isBuy 
                    ? styles.gridBlockFilledBuy 
                    : styles.gridBlockFilledSell 
                  : ""
              }`}
            />
          );
        }

        const isJpy = b.symbol.includes("JPY");
        const priceLabel = isJpy ? "ZONE CAP" : "";

        return (
          <div 
            key={`${b.symbol}_${b.direction}_${idx}`} 
            className={`${styles.basketCard} ${isBuy ? styles.basketCardBorderBuy : styles.basketCardBorderSell}`}
          >
            {/* Basket Header */}
            <div className={styles.basketHeader}>
              <div className={styles.basketTitleGroup}>
                <span className={styles.basketSymbol}>{b.symbol}</span>
                <span className={`${styles.basketDirection} ${isBuy ? styles.directionBuy : styles.directionSell}`}>
                  {isBuy ? <ChevronUp size={10} style={{ display: "inline", marginRight: "2px" }} /> : <ChevronDown size={10} style={{ display: "inline", marginRight: "2px" }} />}
                  {b.direction}
                </span>
              </div>
              <div 
                className={styles.basketProfit} 
                style={{ color: isProfit ? "var(--neon-green)" : "var(--neon-red)" }}
              >
                {isProfit ? "+" : "-"}{formattedProfit}
                <span className={styles.basketProfitSubtext}>USC flutuante</span>
              </div>
            </div>

            {/* Details */}
            <div className={styles.basketDetails}>
              <div className={styles.basketRow}>
                <span className={styles.basketRowLabel}>
                  {b.level >= 4 && !isBuy && b.symbol === "USDJPY" ? "Nível 4 de 6 · BreakEven ATIVO" : `Nível ${b.level} de 6 · Mult 1.50x`}
                </span>
              </div>
              
              <div className={styles.basketRow} style={{ marginTop: "0.25rem" }}>
                <span className={styles.basketRowLabel}>Preço Médio</span>
                <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
                  {b.pm.toFixed(b.digits)}
                </span>
              </div>

              <div className={styles.basketRow}>
                <span className={styles.basketRowLabel}>Alvo TP</span>
                <span 
                  className={styles.basketRowValue} 
                  style={{ color: isBuy ? "var(--neon-green)" : "var(--neon-gold)", fontFamily: "monospace" }}
                >
                  {b.tp.toFixed(b.digits)} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>({isBuy ? "+" : "-"}{b.tpPoints} pts)</span>
                </span>
              </div>

              <div className={styles.basketRow}>
                <span className={styles.basketRowLabel}>Volume Total</span>
                <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
                  {b.volume.toFixed(3)} L
                </span>
              </div>

              {/* Grid block display */}
              <div className={styles.basketRow} style={{ margin: "0.25rem 0" }}>
                <span className={styles.basketRowLabel}>Grade</span>
                <div className={styles.gridBlocks}>
                  {blocks}
                  {b.level >= 4 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--neon-red)", fontWeight: 700, marginLeft: "0.35rem", display: "flex", alignItems: "center", gap: "0.15rem" }}>
                      <AlertTriangle size={12} /> {b.level}/6
                    </span>
                  )}
                </div>
              </div>

              {/* Progress to TP */}
              <div className={styles.basketRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.15rem", marginTop: "0.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.7rem", fontWeight: 600 }}>
                  <span style={{ color: "var(--text-muted)" }}>Progresso ao TP</span>
                  <span style={{ color: b.progress >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}>{b.progress}%</span>
                </div>
                <div className={styles.progressBarOuter} style={{ height: "6px" }}>
                  <div 
                    className={styles.progressBarInner}
                    style={{
                      width: `${Math.max(5, Math.abs(b.progress))}%`,
                      backgroundColor: b.progress >= 0 ? "var(--neon-green)" : "var(--neon-red)",
                      boxShadow: b.progress >= 0 ? "0 0 5px var(--neon-green-glow)" : "0 0 5px var(--neon-red-glow)",
                      marginLeft: b.progress < 0 ? "auto" : "0", // align negative progress to right
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Extra fields or alerts */}
            {b.level >= 4 && !isBuy && b.symbol === "USDJPY" ? (
              <div className={styles.basketRow} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)", paddingTop: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>BreakEven SOS</span>
                <span style={{ fontSize: "0.75rem", color: "var(--neon-gold)", fontWeight: 700, textDecoration: "underline" }}>TP Reduzido → 0.15 USC</span>
              </div>
            ) : null}

            {/* Basket Footer */}
            <div className={styles.basketFooter}>
              <span>Prox. RC: <strong style={{ color: b.level >= 4 ? "var(--neon-red)" : "var(--neon-blue)" }}>{b.level >= 4 ? `D1 FR @ ${b.rcPrice.toFixed(b.digits)} ${priceLabel}` : `H4 FR @ ${b.rcPrice.toFixed(b.digits)}`}</strong></span>
              <span style={{ color: b.level >= 4 ? "var(--neon-red)" : "var(--text-muted)" }}>
                {b.level >= 4 ? `(+${b.rcPoints} pts)` : `(${isBuy ? "-" : "+"}${b.rcPoints} pts)`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
