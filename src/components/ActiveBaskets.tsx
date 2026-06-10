"use client";

import React from "react";
import { ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import styles from "./components.module.css";

/* ── Tipos ───────────────────────────────────────────────────────── */
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
  tp?: number;   // opcional: preço TP real da posição (enviado pelo robô v3.39+)
  sl?: number;   // opcional: SL real
}

// ActiveBasketsProps is defined below in the primary component section

/* ── Lógica de agrupamento ─────────────────────────────────────── */
interface Basket {
  symbol: string;
  direction: "COMPRA" | "VENDA";
  trades: Trade[];
  // campos calculados
  totalProfit: number;
  totalVolume: number;
  pm: number;           // Preço médio ponderado por volume
  currentPrice: number;
  tpPrice: number | null;   // TP real (se disponível) — 0 = sem TP
  digits: number;
  pipValue: number;     // valor de 1 pip
  distPips: number;     // distância do PM ao preço atual em pips (+ = favor, - = contra)
}

function buildBaskets(trades: Trade[]): Basket[] {
  const map: Record<string, { symbol: string; direction: "COMPRA" | "VENDA"; trades: Trade[] }> = {};

  trades.forEach((t) => {
    const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
    const dir = isBuy ? "COMPRA" : "VENDA";
    const sym = t.symbol.replace(/c$/i, "").toUpperCase();
    const key = `${sym}_${dir}`;
    if (!map[key]) map[key] = { symbol: sym, direction: dir, trades: [] };
    map[key].trades.push(t);
  });

  return Object.values(map).map((b): Basket => {
    const isBuy = b.direction === "COMPRA";
    const totalVol = b.trades.reduce((s, t) => s + t.volume, 0);
    const totalProfit = b.trades.reduce((s, t) => s + t.currentProfit, 0);

    // Preço médio ponderado
    const pm = totalVol > 0
      ? b.trades.reduce((s, t) => s + t.entryPrice * t.volume, 0) / totalVol
      : 0;

    // Preço atual (usa o mais recente = trade[0], pois o robô envia por posição)
    const currentPrice = b.trades[0]?.currentPrice ?? pm;

    // TP: pega o TP do PRIMEIRO trade que tiver TP != 0
    const tpTrade = b.trades.find((t) => t.tp && t.tp > 0);
    const tpPrice = tpTrade?.tp ?? null;

    const isJpy = b.symbol.includes("JPY");
    const digits = isJpy ? 3 : 5;
    const pipValue = isJpy ? 0.001 : 0.00001;

    // distância PM → preço atual em pips
    // positivo = preço foi na direção favorável
    const rawDist = isBuy ? (currentPrice - pm) : (pm - currentPrice);
    const distPips = Math.round(rawDist / pipValue);

    return {
      symbol: b.symbol,
      direction: b.direction,
      trades: b.trades,
      totalProfit,
      totalVolume: totalVol,
      pm,
      currentPrice,
      tpPrice,
      digits,
      pipValue,
      distPips,
    };
  });
}

function groupBySymbol(baskets: Basket[]) {
  const g: Record<string, Basket[]> = {};
  baskets.forEach((b) => {
    if (!g[b.symbol]) g[b.symbol] = [];
    g[b.symbol].push(b);
  });
  return g;
}

/* ── Grade de blocos ─────────────────────────────────────────────── */
function GradeBlocks({ level, max = 6, isBuy }: { level: number; max?: number; isBuy: boolean }) {
  return (
    <div className={styles.gridBlocks}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`${styles.gridBlock} ${
            i < level
              ? isBuy
                ? styles.gridBlockFilledBuy
                : styles.gridBlockFilledSell
              : ""
          }`}
        />
      ))}
      <span
        style={{
          fontSize: "0.68rem",
          color: level >= 4 ? "var(--neon-red)" : "var(--text-muted)",
          fontWeight: 700,
          marginLeft: "0.25rem",
        }}
      >
        {level}/{max}
      </span>
    </div>
  );
}

/* ── Barra de distância do PM ──────────────────────────────────── */
// Mostra quanto o preço se afastou do PM. Estável e baseado em dados reais.
function DistBar({ distPips, isBuy }: { distPips: number; isBuy: boolean }) {
  // referência: 200 pips = barra cheia (escala visual)
  const MAX_PIPS = 200;
  const absPct = Math.min(100, (Math.abs(distPips) / MAX_PIPS) * 100);
  const isGood = distPips >= 0; // distância positiva = favor
  const color = isGood ? "var(--neon-green)" : "var(--neon-red)";
  const label = isGood
    ? `+${distPips} pts (favor)`
    : `${distPips} pts (contra)`;

  // Carrega a barra apenas quando a distância for positiva (a favor)
  const fillWidth = isGood ? absPct : 0;

  return (
    <div className={styles.tpProgressWrapper}>
      <div className={styles.tpProgressHeader}>
        <span className={styles.basketRowLabel}>Dist. do PM</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color }}>{label}</span>
      </div>
      <div className={styles.progressBarOuter}>
        <div
          className={styles.progressBarInner}
          style={{
            width: `${fillWidth}%`,
            background: color,
            boxShadow: isGood ? `0 0 5px ${color}88` : undefined,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ── Progresso ao TP (só se TP real disponível) ─────────────────── */
function TpBar({ pm, currentPrice, tpPrice, isBuy, digits }: {
  pm: number; currentPrice: number; tpPrice: number; isBuy: boolean; digits: number;
}) {
  const totalDist = isBuy ? (tpPrice - pm) : (pm - tpPrice);
  const doneDist  = isBuy ? (currentPrice - pm) : (pm - currentPrice);
  const progress  = totalDist > 0 ? Math.round((doneDist / totalDist) * 100) : 0;
  const clamped   = Math.max(-100, Math.min(100, progress));
  const color     = clamped >= 0 ? "var(--neon-green)" : "var(--neon-red)";
  const tpPts     = Math.round(Math.abs(totalDist) / (digits <= 3 ? 0.001 : 0.00001));

  // Carrega a barra apenas conforme a porcentagem real positiva (0% se negativo/drawdown)
  const fillWidth = clamped >= 0 ? clamped : 0;

  return (
    <div className={styles.tpProgressWrapper}>
      <div className={styles.tpProgressHeader}>
        <span className={styles.basketRowLabel}>Progresso ao TP</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color }}>
          {clamped >= 0 ? "+" : ""}{clamped}%
        </span>
      </div>
      <div className={styles.progressBarOuter}>
        <div
          className={styles.progressBarInner}
          style={{
            width: `${fillWidth}%`,
            background: clamped >= 0
              ? "linear-gradient(90deg, #00c853, #00ff88)"
              : "linear-gradient(90deg, #c62828, #ff1744)",
            boxShadow: clamped >= 0 ? `0 0 5px ${color}88` : undefined,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
        <span>PM: {pm.toFixed(digits)}</span>
        <span style={{ color: "var(--neon-gold)" }}>TP: {tpPrice.toFixed(digits)} ({tpPts} pts)</span>
      </div>
    </div>
  );
}

/* ── Card de um cesto ─────────────────────────────────────────── */
interface BasketCardProps {
  b: Basket;
  currencyMode: "CENT_BRL" | "USD_STAND" | "BRL_STAND";
  brlRate: number;
}

function BasketCard({ b, currencyMode, brlRate }: BasketCardProps) {
  const isBuy    = b.direction === "COMPRA";
  const isProfit = b.totalProfit >= 0;
  const profitColor = isProfit ? "var(--neon-green)" : "var(--neon-red)";
  const level    = b.trades.length;
  const isAlert  = level >= 4;

  const formatBasketProfit = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT_BRL") {
      const convertedBrl = (val / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (currencyMode === "USD_STAND") {
      return `$ ${absVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else {
      return `R$ ${absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const formatBasketProfitSub = (val: number) => {
    const absVal = Math.abs(val);
    const formattedNum = absVal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (currencyMode === "CENT_BRL") {
      return `${formattedNum} USC flutuante`;
    } else if (currencyMode === "USD_STAND") {
      return `${formattedNum} USD flutuante`;
    } else {
      return `${formattedNum} BRL flutuante`;
    }
  };

  return (
    <div
      className={`${styles.basketCard} ${
        isBuy ? styles.basketCardBorderBuy : styles.basketCardBorderSell
      }`}
    >
      {/* ── Cabeçalho ── */}
      <div className={styles.basketHeader}>
        <div className={styles.basketTitleGroup}>
          <span className={styles.basketSymbol}>{b.symbol}</span>
          <span
            className={`${styles.basketDirection} ${
              isBuy ? styles.directionBuy : styles.directionSell
            }`}
          >
            {isBuy
              ? <ChevronUp size={9} style={{ display: "inline", marginRight: 1 }} />
              : <ChevronDown size={9} style={{ display: "inline", marginRight: 1 }} />}
            {b.direction}
          </span>
          {isAlert && (
            <span className={styles.riskBadge}>
              <AlertTriangle size={9} /> NÍVEL {level}
            </span>
          )}
        </div>
        <div className={styles.basketProfit} style={{ color: profitColor }}>
          {isProfit ? "+" : "-"}{formatBasketProfit(b.totalProfit)}
          <span className={styles.basketProfitSubtext}>{formatBasketProfitSub(b.totalProfit)}</span>
        </div>
      </div>

      {/* ── Nível ── */}
      <div className={styles.basketLevelRow}>
        Nível {level} de 6 · Mult 1.50×
        {isAlert && (
          <span style={{ color: "var(--neon-red)", marginLeft: "0.5rem" }}>
            ⚠ RECOMPRA INTENSA
          </span>
        )}
      </div>

      {/* ── Dados ── */}
      <div className={styles.basketDetails}>
        {/* Preço Médio */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Preço Médio (PM)</span>
          <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
            {b.pm.toFixed(b.digits)}
          </span>
        </div>

        {/* Preço Atual */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Preço Atual</span>
          <span
            className={styles.basketRowValue}
            style={{
              fontFamily: "monospace",
              color: b.distPips >= 0 ? "var(--neon-green)" : "var(--neon-red)",
            }}
          >
            {b.currentPrice.toFixed(b.digits)}
          </span>
        </div>

        {/* Volume Total */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Volume Total</span>
          <span className={styles.basketRowValue} style={{ fontFamily: "monospace" }}>
            {b.totalVolume.toFixed(3)} L
          </span>
        </div>

        {/* Grade */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Grade</span>
          <GradeBlocks level={level} max={6} isBuy={isBuy} />
        </div>

        {/* Progresso ao TP (se TP real disponível) ou Dist. PM */}
        {b.tpPrice && b.tpPrice > 0 ? (
          <TpBar
            pm={b.pm}
            currentPrice={b.currentPrice}
            tpPrice={b.tpPrice}
            isBuy={isBuy}
            digits={b.digits}
          />
        ) : (
          <DistBar distPips={b.distPips} isBuy={isBuy} />
        )}
      </div>

      {/* ── Linha de posições individuais (mini) ── */}
      {b.trades.length > 1 && (
        <div className={styles.basketPositions}>
          {b.trades.map((t, i) => {
            const tProfit = t.currentProfit;
            const tColor  = tProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)";
            return (
              <div key={t.ticket} className={styles.basketPositionRow}>
                <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.6rem" }}>
                  #{i + 1} · {t.entryPrice.toFixed(b.digits)} · {t.volume.toFixed(2)}L
                </span>
                <span style={{ color: tColor, fontSize: "0.65rem", fontWeight: 700, fontFamily: "monospace" }}>
                  {tProfit >= 0 ? "+" : "-"}{Math.abs(tProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyMode === "CENT_BRL" ? "USC" : currencyMode === "USD_STAND" ? "USD" : "BRL"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Card inativo de placeholder ────────────────────────────────── */
interface InactiveBasketCardProps {
  symbol: string;
}

function InactiveBasketCard({ symbol }: InactiveBasketCardProps) {
  return (
    <div className={`${styles.basketCard} ${styles.basketCardInactive}`}>
      <div className={styles.basketHeader} style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
        <div className={styles.basketTitleGroup}>
          <span className={styles.basketSymbol} style={{ opacity: 0.4 }}>{symbol}</span>
          <span
            className={styles.symbolDirTag}
            style={{
              color: "var(--text-muted)",
              borderColor: "rgba(255,255,255,0.06)",
              background: "transparent",
              opacity: 0.5,
              fontSize: "0.55rem",
              padding: "0.05rem 0.35rem"
            }}
          >
            INATIVO
          </span>
        </div>
        <div className={styles.basketProfit} style={{ color: "var(--text-muted)", opacity: 0.4, fontSize: "0.85rem" }}>
          0.00
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────── */
interface ActiveBasketsProps {
  trades: Trade[];
  brlRate?: number;
  currencyMode?: "CENT_BRL" | "USD_STAND" | "BRL_STAND";
}

export default function ActiveBaskets({
  trades = [],
  brlRate = 5.45,
  currencyMode = "CENT_BRL",
}: ActiveBasketsProps) {
  const baskets = buildBaskets(trades);
  const grouped = groupBySymbol(baskets);

  const totalPl      = baskets.reduce((s, b) => s + b.totalProfit, 0);

  const formatSecondaryVal = (val: number) => {
    const absVal = Math.abs(val);
    const formattedNum = absVal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (currencyMode === "CENT_BRL") {
      return `${formattedNum} USC`;
    } else if (currencyMode === "USD_STAND") {
      return `${formattedNum} USD`;
    } else {
      return `${formattedNum} BRL`;
    }
  };

  const ALL_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"];

  return (
    <div className={styles.basketsSection}>

      {/* ── Cabeçalho da seção ── */}
      <div className={styles.basketsSectionHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={styles.basketsSectionTitle}>Cestos de Moedas</span>
          <span className={styles.basketsCount}>
            {baskets.length} cesto{baskets.length !== 1 ? "s" : ""} ativo{baskets.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: totalPl >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontFamily: "monospace" }}>
          {totalPl >= 0 ? "+" : "-"}{formatSecondaryVal(totalPl)} global flutuante
        </span>
      </div>

      {/* ── Grade principal fixa com 6 posições ── */}
      <div className={styles.basketsGridMain}>
        {ALL_SYMBOLS.map((sym) => {
          const symBaskets = grouped[sym] || [];
          const hasBaskets = symBaskets.length > 0;

          if (hasBaskets) {
            const symPl      = symBaskets.reduce((s, b) => s + b.totalProfit, 0);
            const symColor   = symPl >= 0 ? "var(--neon-green)" : "var(--neon-red)";
            const hasBuy     = symBaskets.some((b) => b.direction === "COMPRA");
            const hasSell    = symBaskets.some((b) => b.direction === "VENDA");

            return (
              <div key={sym} className={styles.symbolGroup}>
                {/* Cabeçalho do par ativo */}
                <div className={styles.symbolGroupHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className={styles.symbolGroupName}>{sym}</span>
                    {hasBuy && (
                      <span className={styles.symbolDirTag}
                        style={{ color: "var(--neon-green)", borderColor: "rgba(0,230,118,0.25)", background: "rgba(0,230,118,0.06)" }}>
                        ▲ COMPRA
                      </span>
                    )}
                    {hasSell && (
                      <span className={styles.symbolDirTag}
                        style={{ color: "var(--neon-red)", borderColor: "rgba(255,23,68,0.25)", background: "rgba(255,23,68,0.06)" }}>
                        ▼ VENDA
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: symColor, fontFamily: "monospace" }}>
                    {symPl >= 0 ? "+" : "-"}{formatSecondaryVal(symPl)}
                  </span>
                </div>

                {/* Cestos do par ativo */}
                <div className={styles.symbolBaskets}>
                  {symBaskets.map((b, i) => (
                    <BasketCard key={`${b.symbol}_${b.direction}_${i}`} b={b} currencyMode={currencyMode} brlRate={brlRate} />
                  ))}
                </div>
              </div>
            );
          } else {
            // Inativo
            return (
              <div key={sym} className={styles.symbolGroup}>
                {/* Cabeçalho do par inativo */}
                <div className={styles.symbolGroupHeader} style={{ opacity: 0.5 }}>
                  <span className={styles.symbolGroupName} style={{ color: "var(--text-muted)" }}>{sym}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", fontFamily: "monospace" }}>
                    0.00
                  </span>
                </div>

                {/* Card inativo */}
                <InactiveBasketCard symbol={sym} />
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
