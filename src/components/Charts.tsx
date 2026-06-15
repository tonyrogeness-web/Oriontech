"use client";

import React, { useState, useEffect, useRef } from "react";

interface PerformancePoint {
  date: string;
  profit: number;
  balance: number;
  equity?: number | null;
}

interface ChartsProps {
  history: PerformancePoint[];
  currencyMode?: "CENT" | "BRL";
  brlRate?: number;
}

export default function Charts({ history = [], currencyMode = "BRL", brlRate = 5.45 }: ChartsProps) {
  const [timeframe, setTimeframe] = useState<"Dia" | "7D" | "30D" | "Mês">("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 210 });
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
      if (currentTheme) {
        setTheme(currentTheme);
      }

      const observer = new MutationObserver(() => {
        const t = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
        if (t) {
          setTheme(t);
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });

      return () => observer.disconnect();
    }
  }, []);

  // 1. Safe Date Parser & Formatter
  const parseSafeDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.split("T")[0];
      const [year, month, day] = cleanDate.split("-").map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return new Date(dateStr);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseSafeDate(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      return `${day}/${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  // 2. Format Value helper
  const formatVal = (val: number, showSign = false) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : (showSign && val > 0 ? "+" : "");
    if (currencyMode === "CENT") {
      return `${sign}${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
    } else {
      return `${sign}R$${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // 3. Process raw data (handles BRL conversions)
  const mappedData = history.map((h) => {
    let daily = h.profit;
    let equity = h.equity !== null && h.equity !== undefined ? h.equity : h.balance;

    if (currencyMode === "BRL") {
      daily = (h.profit / 100) * brlRate;
      equity = ((h.equity ?? h.balance) / 100) * brlRate;
    }

    return {
      label: formatDate(h.date),
      daily: daily,
      equity: equity,
      dateRaw: h.date
    };
  });

  // 4. Timeframe filter logic
  const getFilteredData = () => {
    if (mappedData.length === 0) return [];

    if (timeframe === "Dia") {
      return mappedData.slice(-2); // Yesterday & Today
    }
    if (timeframe === "7D") {
      return mappedData.slice(-7);
    }
    if (timeframe === "30D") {
      return mappedData.slice(-30);
    }

    // "Mês" -> Filter by the month of the last date present in the history
    const lastPoint = mappedData[mappedData.length - 1];
    const lastDate = parseSafeDate(lastPoint.dateRaw);
    const lastYear = lastDate.getFullYear();
    const lastMonth = lastDate.getMonth();

    return mappedData.filter((d) => {
      const dDate = parseSafeDate(d.dateRaw);
      return dDate.getFullYear() === lastYear && dDate.getMonth() === lastMonth;
    });
  };

  const rawFilteredData = getFilteredData();

  // 5. Calculate cumulative profit on the filtered data subset
  let runningSum = 0;
  const filteredData = rawFilteredData.map((d) => {
    runningSum += d.daily;
    return {
      ...d,
      cumProfit: runningSum
    };
  });

  // 6. Summary metrics
  const totalAccumulated = filteredData.length > 0 ? filteredData[filteredData.length - 1].cumProfit : 0;
  const startEquity = filteredData.length > 0 ? filteredData[0].equity : 1000;
  const accumulatedPct = startEquity > 0 ? (totalAccumulated / startEquity) * 100 : 0;

  const tradingDays = filteredData.filter((d) => d.daily !== 0);
  const positiveDays = filteredData.filter((d) => d.daily > 0);
  const winRate = tradingDays.length > 0 ? (positiveDays.length / tradingDays.length) * 100 : 0;

  const bestDay = filteredData.length > 0 ? Math.max(...filteredData.map((d) => d.daily)) : 0;
  const worstDay = filteredData.length > 0 ? Math.min(...filteredData.map((d) => d.daily)) : 0;
  const averageDailyProfit = tradingDays.length > 0 ? totalAccumulated / tradingDays.length : 0;

  // 7. Stable Resizing using Wrapper element and Absolute positioning
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Deduct internal padding (approx 16px) to get raw drawing width
      const drawWidth = Math.max(260, width - 16);
      setCanvasSize({ width: drawWidth, height: 210 });
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Helper function to draw rounded rectangles
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // 8. Render Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const width = canvasSize.width;
    const height = canvasSize.height;

    // Colors mapping based on theme - matches globals.css tokens
    const colorBg = theme === "light" ? "#f8fafc" : "#030305";
    const colorGrid = theme === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.07)";
    const colorText = theme === "light" ? "#334155" : "#8a9ab8";
    const colorZero = theme === "light" ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.15)";
    const colorHover = theme === "light" ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.1)";
    const colorCum = theme === "light" ? "#0066cc" : "#58a6ff";
    const colorCumStroke = theme === "light" ? "#f8fafc" : "#030305";
    const areaColor = theme === "light" ? "0, 102, 204" : "88, 166, 255";

    // Clear background
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, width, height);

    // Margins
    const padLeft = 60;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 20;
    const graphWidth = width - padLeft - padRight;
    const graphHeight = height - padTop - padBottom;

    // Bounds Calculation
    let maxVal = -Infinity;
    let minVal = Infinity;

    filteredData.forEach((d) => {
      if (d.daily > maxVal) maxVal = d.daily;
      if (d.daily < minVal) minVal = d.daily;
      if (d.cumProfit > maxVal) maxVal = d.cumProfit;
      if (d.cumProfit < minVal) minVal = d.cumProfit;
    });

    if (maxVal === -Infinity) maxVal = 10;
    if (minVal === Infinity) minVal = -10;

    const span = maxVal - minVal;
    const pad = span * 0.15 || 5;
    let yMax = maxVal + pad;
    let yMin = minVal - pad;

    // Ensure zero is handled
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;

    // Y Coordinator Mapper
    const getY = (val: number) => {
      const pct = (val - yMin) / (yMax - yMin);
      return padTop + graphHeight - pct * graphHeight;
    };

    // X Coordinator Mapper
    const getX = (idx: number) => {
      const stepWidth = graphWidth / filteredData.length;
      return padLeft + (idx + 0.5) * stepWidth;
    };

    // 1. Horizontal grid lines (5 lines)
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    ctx.font = "10px Segoe UI, system-ui";
    ctx.fillStyle = colorText;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const gridLines = 5;
    for (let i = 0; i < gridLines; i++) {
      const ratio = i / (gridLines - 1);
      const y = padTop + ratio * graphHeight;
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + graphWidth, y);
      ctx.stroke();

      // Label
      const val = yMax - ratio * (yMax - yMin);
      ctx.fillText(formatVal(val).replace("R$", "").replace("USC", ""), padLeft - 10, y);
    }

    // 2. Zero Horizontal Line
    const yZero = getY(0);
    if (yZero >= padTop && yZero <= padTop + graphHeight) {
      ctx.strokeStyle = colorZero;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, yZero);
      ctx.lineTo(padLeft + graphWidth, yZero);
      ctx.stroke();
    }

    // 3. Hover Guide Line
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < filteredData.length) {
      const hX = getX(hoveredIndex);
      ctx.strokeStyle = colorHover;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hX, padTop);
      ctx.lineTo(hX, padTop + graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Daily Bars
    filteredData.forEach((d, idx) => {
      if (d.daily === 0) return;

      const x = getX(idx);
      const stepWidth = graphWidth / filteredData.length;
      const barWidth = Math.max(6, Math.min(24, stepWidth * 0.35));

      const yVal = getY(d.daily);
      const isPositive = d.daily >= 0;

      const yTop = isPositive ? yVal : yZero;
      const yBottom = isPositive ? yZero : yVal;
      const barHeight = Math.max(2, yBottom - yTop);

      const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
      if (isPositive) {
        // Green: theme-optimized
        const greenSolid = theme === "light" ? "#0d8a4e" : "#00c853";
        const greenGlow = theme === "light" ? "rgba(13, 138, 78, 0.05)" : "rgba(0, 200, 83, 0.05)";
        grad.addColorStop(0, greenSolid);
        grad.addColorStop(1, greenGlow);
      } else {
        // Red: theme-optimized
        const redSolid = theme === "light" ? "#b91c1c" : "#d24444";
        const redGlow = theme === "light" ? "rgba(185, 28, 28, 0.05)" : "rgba(210, 68, 68, 0.05)";
        grad.addColorStop(0, redGlow);
        grad.addColorStop(1, redSolid);
      }

      ctx.fillStyle = grad;
      drawRoundedRect(ctx, x - barWidth / 2, yTop, barWidth, barHeight, 4);
      ctx.fill();
    });

    // 5. Draw Area Under Cumulative Line
    ctx.beginPath();
    filteredData.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.cumProfit);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    // Close the path to the bottom of the chart
    ctx.lineTo(getX(filteredData.length - 1), padTop + graphHeight);
    ctx.lineTo(getX(0), padTop + graphHeight);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + graphHeight);
    areaGrad.addColorStop(0, `rgba(${areaColor}, 0.14)`);
    areaGrad.addColorStop(1, `rgba(${areaColor}, 0.0)`);
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 6. Draw Cumulative line
    ctx.strokeStyle = colorCum;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    filteredData.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.cumProfit);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // 7. Draw Dots
    filteredData.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.cumProfit);

      ctx.fillStyle = colorCum;
      ctx.strokeStyle = colorCumStroke;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // 8. Draw X Axis Labels
    ctx.fillStyle = colorText;
    ctx.font = "9px Segoe UI, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelInterval = Math.ceil(filteredData.length / 8);
    filteredData.forEach((d, idx) => {
      if (idx % labelInterval === 0 || idx === filteredData.length - 1) {
        const x = getX(idx);
        ctx.fillText(d.label, x, padTop + graphHeight + 6);
      }
    });
  }, [canvasSize, filteredData, hoveredIndex, currencyMode, brlRate, theme]);

  // 9. Handle mouse actions for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padLeft = 60;
    const padRight = 10;
    const graphWidth = canvasSize.width - padLeft - padRight;

    if (x >= padLeft && x <= canvasSize.width - padRight) {
      const stepWidth = graphWidth / filteredData.length;
      const idx = Math.floor((x - padLeft) / stepWidth);

      if (idx >= 0 && idx < filteredData.length) {
        setHoveredIndex(idx);
        
        // Tooltip alignment logic
        const tWidth = 160;
        let tX = e.clientX - rect.left + 15;
        if (tX + tWidth > canvasSize.width) {
          tX = e.clientX - rect.left - tWidth - 15;
        }

        setTooltipPos({
          x: tX,
          y: Math.max(10, e.clientY - rect.top - 65)
        });
      }
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Find max daily value for progress bar scaling
  const maxAbsDaily = filteredData.length > 0 ? Math.max(...filteredData.map(d => Math.abs(d.daily))) : 1;

  return (
    <div
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-light)",
        borderRadius: "14px",
        padding: "1.25rem",
        fontFamily: "Segoe UI, system-ui, sans-serif",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        boxSizing: "border-box",
        width: "100%",
        overflow: "hidden",
        boxShadow: theme === "light" ? "0 4px 20px rgba(0, 0, 0, 0.04)" : "none"
      }}
    >
      {/* 1. HEADER ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>💰</span> LUCRO REALIZADO · ORION HEDGE
          </div>
          <h2
            style={{
              fontSize: "2.1rem",
              fontWeight: 700,
              margin: "0.35rem 0 0.15rem 0",
              color: totalAccumulated >= 0 ? "var(--neon-green)" : "var(--neon-red)",
              letterSpacing: "-0.02em"
            }}
          >
            {formatVal(totalAccumulated, true)}
          </h2>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Acumulado no período · <span style={{ color: totalAccumulated >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontWeight: 600 }}>{totalAccumulated >= 0 ? "+" : ""}{accumulatedPct.toFixed(2)}%</span> sobre equity
          </div>
        </div>

        {/* Timeframe selector tabs */}
        <div
          style={{
            background: "var(--bg-deep)",
            border: "1px solid var(--border-light)",
            borderRadius: "8px",
            padding: "0.25rem",
            display: "flex",
            gap: "0.2rem"
          }}
        >
          {(["Dia", "7D", "30D", "Mês"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              style={{
                background: timeframe === t ? "var(--bg-panel-solid)" : "transparent",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                color: timeframe === t ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: timeframe === t && theme === "light" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. KPI PILLS ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          width: "100%"
        }}
      >
        {/* Positive Days Pill */}
        <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>DIAS POSITIVOS</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--neon-green)", margin: "0.25rem 0 0.05rem 0" }}>
            {positiveDays.length} {positiveDays.length === 1 ? "dia" : "dias"}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{winRate.toFixed(0)}% de acerto</div>
        </div>

        {/* Best Day Pill */}
        <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>MELHOR DIA</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--neon-green)", margin: "0.25rem 0 0.05rem 0" }}>
            {formatVal(bestDay, true)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Maior ganho diário</div>
        </div>

        {/* Worst Day Pill */}
        <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>PIOR DIA</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--neon-red)", margin: "0.25rem 0 0.05rem 0" }}>
            {formatVal(worstDay, true)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Maior perda diária</div>
        </div>

        {/* Average Daily Profit Pill */}
        <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>MÉDIA / DIA</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: averageDailyProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)", margin: "0.25rem 0 0.05rem 0" }}>
            {formatVal(averageDailyProfit, true)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>dias com trade</div>
        </div>
      </div>

      {/* 3. CANVAS CHART AND TOOLTIP */}
      <div
        ref={chartWrapperRef}
        style={{
          position: "relative",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-light)",
          borderRadius: "10px",
          padding: "0.75rem 0.5rem 0.5rem 0.5rem",
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        {/* Legend above */}
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.5rem", paddingLeft: "10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", background: "var(--neon-green)", borderRadius: "2px" }} />
            Ganho Diário
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", background: "var(--neon-red)", borderRadius: "2px" }} />
            Perda Diária
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "12px", height: "2px", background: theme === "light" ? "#0066cc" : "#58a6ff" }} />
            Acumulado
          </span>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "210px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Nenhum dado disponível no período selecionado.
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "210px", overflow: "hidden" }}>
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "block",
                cursor: "crosshair"
              }}
            />
          </div>
        )}

        {/* HTML Floating Tooltip */}
        {hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < filteredData.length && (
          <div
            style={{
              position: "absolute",
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              backgroundColor: "var(--bg-panel-solid)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "var(--text-primary)",
              fontFamily: "Segoe UI, system-ui",
              fontSize: "11px",
              pointerEvents: "none",
              boxShadow: theme === "light" ? "0 4px 14px rgba(0, 0, 0, 0.08)" : "0 4px 14px rgba(0, 0, 0, 0.6)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: "1px solid var(--border-light)", paddingBottom: "4px", marginBottom: "4px", color: "var(--text-primary)" }}>
              {filteredData[hoveredIndex].dateRaw ? formatDate(filteredData[hoveredIndex].dateRaw) : filteredData[hoveredIndex].label}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
              <span style={{ color: "var(--text-muted)" }}>
                {filteredData[hoveredIndex].daily >= 0 ? "Ganho Diário:" : "Perda Diária:"}
              </span>
              <span style={{ color: filteredData[hoveredIndex].daily >= 0 ? "var(--neon-green)" : "var(--neon-red)", fontWeight: 700 }}>
                {formatVal(filteredData[hoveredIndex].daily, true)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
              <span style={{ color: "var(--text-muted)" }}>Acumulado:</span>
              <span style={{ color: theme === "light" ? "#0066cc" : "#58a6ff", fontWeight: 700 }}>
                {formatVal(filteredData[hoveredIndex].cumProfit, true)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. DETAIL BY DAY ROW */}
      <div>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
          DETALHAMENTO POR DIA
        </div>

        {filteredData.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
            Sem registros.
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-deep)",
              border: "1px solid var(--border-light)",
              borderRadius: "10px",
              maxHeight: "280px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {[...filteredData]
              .reverse()
              .map((day, idx) => {
                const absVal = Math.abs(day.daily);
                const percentWidth = maxAbsDaily > 0 ? (absVal / maxAbsDaily) * 100 : 0;
                const isPositive = day.daily > 0;
                const isNegative = day.daily < 0;

                return (
                  <div
                     key={idx}
                     style={{
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "space-between",
                       padding: "0.65rem 0.85rem",
                       borderBottom: idx === filteredData.length - 1 ? "none" : "1px solid var(--border-light)",
                       fontSize: "0.85rem",
                       gap: "1.25rem"
                     }}
                  >
                    {/* Date label */}
                    <div style={{ width: "45px", color: "var(--text-muted)", fontWeight: 600 }}>{day.label}</div>

                    {/* Progress Bar Container */}
                    <div style={{ flex: 1, height: "6px", background: "var(--bg-card-gradient)", borderRadius: "3px", overflow: "hidden", position: "relative" }}>
                      {absVal > 0 && (
                        <div
                          style={{
                            width: `${percentWidth}%`,
                            height: "100%",
                            background: isPositive ? "var(--neon-green)" : "var(--neon-red)",
                            borderRadius: "3px"
                          }}
                        />
                      )}
                    </div>

                    {/* Right Info: Cumulative and daily badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", justifySelf: "flex-end" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        &Sigma; {formatVal(day.cumProfit, true)}
                      </span>

                      <div
                        style={{
                          minWidth: "75px",
                          textAlign: "right",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          padding: "0.22rem 0.5rem",
                          borderRadius: "6px",
                          color: isPositive ? "var(--neon-green)" : (isNegative ? "var(--neon-red)" : "var(--text-muted)"),
                          background: isPositive
                            ? "var(--neon-green-glow)"
                            : (isNegative ? "var(--neon-red-glow)" : "rgba(125, 133, 144, 0.1)"),
                          border: isPositive
                            ? "1px solid rgba(63, 185, 80, 0.15)"
                            : (isNegative ? "1px solid rgba(248, 81, 73, 0.15)" : "1px solid rgba(125, 133, 144, 0.15)")
                        }}
                      >
                        {formatVal(day.daily, true)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
