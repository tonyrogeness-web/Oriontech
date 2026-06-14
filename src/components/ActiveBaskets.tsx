"use client";

import React from "react";
import { ChevronUp, ChevronDown, AlertTriangle, Layers } from "lucide-react";
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

/* ── Cálculo do TP Virtual estimado ───────────────────────────────── */
function getVirtualTp(b: Basket, balance: number): number {
  const isBuy = b.direction === "COMPRA";
  if (b.totalVolume <= 0 || b.pm <= 0) return 0;

  const InpLotInitial = 0.015;
  const InpTakeProfitDinheiro = 1.50;
  const InpBancaRef = 1000.0;
  const InpLotDeceleration = 0.90;

  let ratio = balance / InpBancaRef;
  if (ratio > 1.0 && InpLotDeceleration > 0.0 && InpLotDeceleration < 1.0) {
    ratio = Math.pow(ratio, InpLotDeceleration);
  }
  const raw = InpLotInitial * ratio;
  const step = 0.01;
  const minV = 0.01;
  const maxV = 500.0;
  
  let loteBase = Math.max(minV, Math.floor(raw / step) * step);
  if (loteBase > maxV) {
    loteBase = maxV;
  }
  
  const fat = loteBase / 0.01;
  const tpLimit = InpTakeProfitDinheiro * fat; // Alvo em USC

  // Estimar valor de 1 ponto em USC por lote
  const isJpy = b.symbol.toUpperCase().includes("JPY");
  const pipValue = isJpy ? 0.001 : 0.00001; // pipValue aqui refere-se a 1 ponto

  let pointValueForOneLot = 100; // default para USD quote (1 ponto de 1 lote = 1 USD = 100 USC)
  if (isJpy) {
    pointValueForOneLot = 65; // JPY quote (aprox)
  } else if (b.symbol.toUpperCase().includes("CAD")) {
    pointValueForOneLot = 75; // CAD quote
  } else if (b.symbol.toUpperCase().includes("CHF")) {
    pointValueForOneLot = 110; // CHF quote
  }

  const basketPointValue = b.totalVolume * pointValueForOneLot;
  const targetDistInPoints = basketPointValue > 0 ? (tpLimit / basketPointValue) : 0;
  const targetDistInPrice = targetDistInPoints * pipValue;
  
  return isBuy ? (b.pm + targetDistInPrice) : (b.pm - targetDistInPrice);
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
  const isDrawdown = progress < 0;
  const clamped   = Math.max(0, Math.min(100, progress));
  const color     = isDrawdown ? "var(--neon-red)" : "var(--neon-green)";
  const tpPts     = Math.round(Math.abs(totalDist) / (digits <= 3 ? 0.001 : 0.00001));

  // Carrega a barra apenas conforme a porcentagem real positiva
  const fillWidth = clamped;

  return (
    <div className={styles.tpProgressWrapper}>
      <div className={styles.tpProgressHeader}>
        <span className={styles.basketRowLabel}>Progresso ao TP</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color }}>
          {isDrawdown ? "Abaixo do PM (Drawdown)" : `+${clamped}%`}
        </span>
      </div>
      <div className={styles.progressBarOuter}>
        <div
          className={styles.progressBarInner}
          style={{
            width: `${fillWidth}%`,
            background: isDrawdown
              ? "linear-gradient(90deg, #c62828, #ff1744)"
              : "linear-gradient(90deg, #00c853, #00ff88)",
            boxShadow: `0 0 5px ${color}88`,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
        <span>Alvo a favor do PM</span>
        <span style={{ color: "var(--neon-gold)", fontWeight: 700 }}>Meta: {tpPts} pts</span>
      </div>
    </div>
  );
}

/* ── Card de um cesto ─────────────────────────────────────────── */
interface BasketCardProps {
  b: Basket;
  currencyMode: "CENT" | "BRL";
  brlRate: number;
  balance: number;
}

function BasketCard({ b, currencyMode, brlRate, balance }: BasketCardProps) {
  const isBuy    = b.direction === "COMPRA";
  const isProfit = b.totalProfit >= 0;
  const profitColor = isProfit ? "var(--neon-green)" : "var(--neon-red)";
  const level    = b.trades.length;
  const isAlert  = level >= 4;
  const sortedTrades = [...b.trades].sort((x, y) => parseFloat(x.ticket) - parseFloat(y.ticket));

  // Preço Alvo (TP) Virtual ou real
  const virtualTp = b.tpPrice && b.tpPrice > 0 ? b.tpPrice : getVirtualTp(b, balance);

  const formatBasketProfit = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT") {
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} USC`;
    } else { // BRL
      const convertedBrl = (absVal / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const formatBasketProfitSub = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT") {
      const convertedBrl = (absVal / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} flutuante`;
    } else { // BRL
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} USC flutuante`;
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

        {/* Próximo Alvo de Recompra */}
        {level < 6 && (() => {
          // Calculate next recompra price using same grid logic as MT5 EA
          // dist base = 1.2 * ATR, step = 0.30 per level, min 400pts
          // Without live ATR, we estimate based on current PM distPips
          // Use the distPips as a guide: next level triggers at ~120% of current distance
          const pipValue = b.digits <= 3 ? 0.001 : 0.00001;
          // Heuristic: use 200 pips as base step estimate if no better data
          const estimatedStepPips = 200 + (level - 1) * 60; // grows with level
          const nextPrice = isBuy
            ? b.pm - estimatedStepPips * pipValue
            : b.pm + estimatedStepPips * pipValue;
          const distToNext = isBuy
            ? Math.round((b.currentPrice - nextPrice) / pipValue)
            : Math.round((nextPrice - b.currentPrice) / pipValue);
          const distLabel = distToNext <= 0 ? "PRÓXIMO!" : `${Math.abs(distToNext)} pts`;
          const distColor = distToNext <= 0 ? "var(--neon-amber)" : "var(--text-secondary)";
          return (
            <div className={styles.basketRow} style={{ marginTop: "0.25rem", borderTop: "1px dashed var(--opacity-border-dashed)", paddingTop: "0.25rem" }}>
              <span className={styles.basketRowLabel}>Prox. Recompra</span>
              <span className={styles.basketRowValue} style={{ fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.05rem" }}>
                <span style={{ color: "var(--neon-gold)", fontWeight: 700 }}>{nextPrice.toFixed(b.digits)}</span>
                <span style={{ fontSize: "0.62rem", color: distColor, fontWeight: 700 }}>{distLabel}</span>
              </span>
            </div>
          );
        })()}

        {/* Alvo do Cesto (igual ao painel do MT5) */}
        {virtualTp && virtualTp > 0 ? (() => {
          const calculateTakeProfitLimit = (bal: number) => {
            const InpLotInitial = 0.015;
            const InpTakeProfitDinheiro = 1.50;
            const InpBancaRef = 1000.0;
            const InpLotDeceleration = 0.90;

            let ratio = bal / InpBancaRef;
            if (ratio > 1.0 && InpLotDeceleration > 0.0 && InpLotDeceleration < 1.0) {
              ratio = Math.pow(ratio, InpLotDeceleration);
            }
            const raw = InpLotInitial * ratio;
            const step = 0.01;
            const minV = 0.01;
            const maxV = 500.0;
            
            let loteBase = Math.max(minV, Math.floor(raw / step) * step);
            if (loteBase > maxV) {
              loteBase = maxV;
            }
            
            const fat = loteBase / 0.01;
            return InpTakeProfitDinheiro * fat;
          };

          const tpLimit = calculateTakeProfitLimit(balance);
          const remainingDist = isBuy ? (virtualTp - b.currentPrice) : (b.currentPrice - virtualTp);
          const remainingPts = Math.round(remainingDist / (b.digits <= 3 ? 0.001 : 0.00001));
          const remainingPtsStr = remainingPts <= 0 ? "PRONTO!" : `▲ ${remainingPts} pts`;

          const formatTargetProfit = (val: number) => {
            if (currencyMode === "CENT") {
              return `[+${val.toFixed(2)} USC]`;
            } else {
              const convertedBrl = (val / 100) * brlRate;
              return `[+R$ ${convertedBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}]`;
            }
          };

          return (
            <div className={styles.basketRow}>
              <span className={styles.basketRowLabel}>Alvo (TP)</span>
              <span className={styles.basketRowValue} style={{ fontFamily: "monospace", color: "var(--neon-gold)", fontWeight: 700 }}>
                {virtualTp.toFixed(b.digits)} <span style={{ color: "var(--text-secondary)", fontWeight: "normal", fontSize: "0.65rem" }}>({remainingPtsStr})</span> <span style={{ color: "var(--neon-green)", marginLeft: "0.3rem" }}>{formatTargetProfit(tpLimit)}</span>
              </span>
            </div>
          );
        })() : null}

        {/* Grade */}
        <div className={styles.basketRow}>
          <span className={styles.basketRowLabel}>Grade</span>
          <GradeBlocks level={level} max={6} isBuy={isBuy} />
        </div>

        {/* Progresso ao TP (se TP real ou virtual disponível) */}
        {virtualTp && virtualTp > 0 ? (
          <TpBar
            pm={b.pm}
            currentPrice={b.currentPrice}
            tpPrice={virtualTp}
            isBuy={isBuy}
            digits={b.digits}
          />
        ) : (
          <DistBar distPips={b.distPips} isBuy={isBuy} />
        )}
      </div>

      {/* ── Linha de posições individuais (mini) ── */}
      {sortedTrades.length > 1 && (
        <div className={styles.basketPositions}>
          {sortedTrades.map((t, i) => {
            const tProfit = t.currentProfit;
            const tColor  = tProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)";
            return (
              <div key={t.ticket} className={styles.basketPositionRow}>
                <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.6rem" }}>
                  #{i + 1} · {t.entryPrice.toFixed(b.digits)} · {t.volume.toFixed(2)}L
                </span>
                <span style={{ color: tColor, fontSize: "0.65rem", fontWeight: 700, fontFamily: "monospace" }}>
                  {tProfit >= 0 ? "+" : "-"}{currencyMode === "CENT" ? Math.abs(tProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ((Math.abs(tProfit) / 100) * brlRate).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyMode === "CENT" ? "USC" : "BRL"}
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
  direction: "COMPRA" | "VENDA";
}

function InactiveBasketCard({ symbol, direction }: InactiveBasketCardProps) {
  const isBuy = direction === "COMPRA";
  return (
    <div className={`${styles.basketCard} ${styles.basketCardInactive}`}>
      <div className={styles.basketHeader} style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
        <div className={styles.basketTitleGroup}>
          <span className={styles.basketSymbol} style={{ opacity: 0.35 }}>{symbol}</span>
          <span
            className={styles.symbolDirTag}
            style={{
              color: isBuy ? "var(--neon-green)" : "var(--neon-red)",
              borderColor: isBuy ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 23, 68, 0.15)",
              background: "transparent",
              opacity: 0.4,
              fontSize: "0.55rem",
              padding: "0.05rem 0.35rem",
              border: "1px solid",
              borderRadius: "3px"
            }}
          >
            {isBuy ? "▲ COMPRA" : "▼ VENDA"}
          </span>
          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", opacity: 0.4, marginLeft: "0.25rem", textTransform: "uppercase" }}>
            INATIVO
          </span>
        </div>
        <div className={styles.basketProfit} style={{ color: "var(--text-muted)", opacity: 0.35, fontSize: "0.85rem" }}>
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
  currencyMode?: "CENT" | "BRL";
  balance?: number;
}

export default function ActiveBaskets({
  trades = [],
  brlRate = 5.45,
  currencyMode = "CENT",
  balance = 0,
}: ActiveBasketsProps) {
  const baskets = buildBaskets(trades);
  const grouped = groupBySymbol(baskets);

  const totalPl      = baskets.reduce((s, b) => s + b.totalProfit, 0);

  const formatSecondaryVal = (val: number) => {
    const absVal = Math.abs(val);
    if (currencyMode === "CENT") {
      const formattedNum = absVal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} USC`;
    } else { // BRL
      const convertedBrl = (absVal / 100) * brlRate;
      return `R$ ${convertedBrl.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const ALL_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"];

  return (
    <div className={styles.basketsSection}>

      {/* ── Cabeçalho da seção ── */}
      <div className={styles.patrimonioHeader} style={{ marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div className={styles.patrimonioTitleGroup}>
          <div className={`${styles.kpiIconContainer} ${styles.blueGlow}`}>
            <Layers size={15} />
          </div>
          <span className={styles.patrimonioMainTitle}>Cestos de Moedas</span>
          <span className={styles.basketsCount}>
            {baskets.length} cesto{baskets.length !== 1 ? "s" : ""} ativo{baskets.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: totalPl >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontFamily: "monospace" }}>
            {totalPl >= 0 ? "+" : ""}{formatSecondaryVal(totalPl)}
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginTop: "0.1rem" }}>
            Global Flutuante
          </span>
        </div>
      </div>

      {baskets.length === 0 && (
        <div className={styles.emptyStateBasketsContainer}>
          <span className={styles.emptyStateBasketsIcon}>💤</span>
          <div className={styles.emptyStateBasketsTextContainer}>
            <span className={styles.emptyStateBasketsTitle}>Nenhum cesto ativo no momento</span>
            <span className={styles.emptyStateBasketsSubtitle}>
              O robô está ativamente monitorando o mercado. Aguardando confirmação do gatilho M5/H1 para novas operações.
            </span>
          </div>
        </div>
      )}

      {/* ── Grade principal fixa com 6 posições ── */}
      <div className={styles.basketsGridMain}>
        {ALL_SYMBOLS.map((sym) => {
          const symBaskets = grouped[sym] || [];
          const symPl      = symBaskets.reduce((s, b) => s + b.totalProfit, 0);
          const hasBaskets = symBaskets.length > 0;
          const symColor   = symPl >= 0 ? "var(--neon-green)" : "var(--neon-red)";

          const buyBasket  = symBaskets.find((b) => b.direction === "COMPRA");
          const sellBasket = symBaskets.find((b) => b.direction === "VENDA");

          return (
            <div key={sym} className={styles.symbolGroup}>
              {/* Cabeçalho do par */}
              <div className={styles.symbolGroupHeader} style={{ opacity: hasBaskets ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className={styles.symbolGroupName} style={{ color: hasBaskets ? "var(--text-primary)" : "var(--text-muted)" }}>{sym}</span>
                  {buyBasket && (
                    <span className={styles.symbolDirTag}
                      style={{ color: "var(--neon-green)", borderColor: "rgba(0,230,118,0.25)", background: "rgba(0,230,118,0.06)" }}>
                      ▲ COMPRA
                    </span>
                  )}
                  {sellBasket && (
                    <span className={styles.symbolDirTag}
                      style={{ color: "var(--neon-red)", borderColor: "rgba(255,23,68,0.25)", background: "rgba(255,23,68,0.06)" }}>
                      ▼ VENDA
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: hasBaskets ? symColor : "var(--text-muted)", fontFamily: "monospace" }}>
                  {symPl >= 0 ? "+" : "-"}{formatSecondaryVal(symPl)}
                </span>
              </div>

              {/* Cestos direcionais fixos do par */}
              <div className={styles.symbolBaskets}>
                {/* 1. COMPRA (topo) */}
                {buyBasket ? (
                  <BasketCard b={buyBasket} currencyMode={currencyMode} brlRate={brlRate} balance={balance} />
                ) : (
                  <InactiveBasketCard symbol={sym} direction="COMPRA" />
                )}

                {/* 2. VENDA (base) */}
                {sellBasket ? (
                  <BasketCard b={sellBasket} currencyMode={currencyMode} brlRate={brlRate} balance={balance} />
                ) : (
                  <InactiveBasketCard symbol={sym} direction="VENDA" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
