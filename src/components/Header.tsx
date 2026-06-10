import React, { useState, useEffect, useRef } from "react";
import { Bell, Activity, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
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

interface HeaderProps {
  accountNumber: string;
  status: string;
  isMock?: boolean;
  brlRate: number;
  currencyMode: "CENT" | "BRL";
  setCurrencyMode: (mode: "CENT" | "BRL") => void;
  trades?: Trade[];
  maxDrawdown?: number;
  floatingPl?: number;
  balance?: number;
  softStopLimit?: number;
  newsActive?: boolean;
  newsName?: string;
}

export default function Header({
  accountNumber,
  status,
  isMock,
  brlRate,
  currencyMode,
  setCurrencyMode,
  trades = [],
  maxDrawdown = 0,
  floatingPl = 0,
  balance = 0,
  softStopLimit = 400.0,
  newsActive = false,
  newsName = "",
}: HeaderProps) {
  const isActive = status === "RUNNING";
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Sync timer state
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastSyncStr, setLastSyncStr] = useState("--:--:--");

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset sync timer whenever new trades data arrives
  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLastSyncStr(timeStr);
    setSecondsAgo(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades.length, status, floatingPl]);

  // Count elapsed seconds since last sync
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate dynamic system alerts/notifications from trades and risk metrics
  const getNotifications = () => {
    const alerts: { title: string; desc: string; severity: "critical" | "warning" | "info" | "success" }[] = [];

    // 1. Group trades by symbol to find levels (recompras)
    const counts: Record<string, number> = {};
    trades.forEach((t) => {
      const sym = t.symbol.toUpperCase().replace("C", "").replace("/", "");
      counts[sym] = (counts[sym] || 0) + 1;
    });

    // Add level warning alerts
    Object.entries(counts).forEach(([sym, level]) => {
      if (level >= 4) {
        alerts.push({
          title: `${sym} - Nível ${level}`,
          desc: `${level} recompras abertas (Atenção: Recompra Elevada!)`,
          severity: "critical",
        });
      } else if (level > 0) {
        alerts.push({
          title: `${sym} - Nível ${level}`,
          desc: `${level} ${level === 1 ? "recompra aberta" : "recompras abertas"}`,
          severity: "info",
        });
      }
    });

    // 2. Drawdown alerts
    if (maxDrawdown >= 20) {
      alerts.push({
        title: "Drawdown Crítico",
        desc: `Drawdown atual está em ${maxDrawdown.toFixed(2)}% (Limite máximo 40%)`,
        severity: "critical",
      });
    } else if (maxDrawdown >= 10) {
      alerts.push({
        title: "Drawdown Alerta",
        desc: `Drawdown atual está em ${maxDrawdown.toFixed(2)}%`,
        severity: "warning",
      });
    }

    // 3. SoftStop alerts
    if (floatingPl < 0) {
      const absLoss = Math.abs(floatingPl);
      const reachPct = softStopLimit > 0 ? (absLoss / softStopLimit) * 100 : 0;
      if (reachPct >= 80) {
        alerts.push({
          title: "SoftStop Crítico",
          desc: `${reachPct.toFixed(1)}% do limite de perda atingido (${absLoss.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} USC consumido)`,
          severity: "critical",
        });
      } else if (reachPct >= 50) {
        alerts.push({
          title: "SoftStop Alerta",
          desc: `${reachPct.toFixed(1)}% do limite de perda atingido`,
          severity: "warning",
        });
      }
    }

    // Sort: critical first, then warning, then info
    alerts.sort((a, b) => {
      const sevWeight = { critical: 3, warning: 2, info: 1, success: 0 };
      return sevWeight[b.severity] - sevWeight[a.severity];
    });

    // Default if no alerts
    if (alerts.length === 0) {
      alerts.push({
        title: "Orion Hedge Seguro",
        desc: "Nenhum alerta de risco ou recompra pendente no momento.",
        severity: "success",
      });
    }

    return alerts;
  };

  const notifications = getNotifications();
  // We only show badge for non-success alerts
  const activeAlertCount = notifications.filter((n) => n.severity !== "success").length;

  return (
    <header className={styles.header}>
      {/* Left logo section with new brandContainer and logoSubtitle */}
      <div className={styles.brandContainer}>
        <div className={styles.brand}>
          <Activity size={24} className={styles.logoAccent} />
          <span className={styles.logoText}>
            ORION <span className={styles.desktopOnly}>HEDGE</span>
          </span>
          {isMock && <span className="badge badge-info" style={{ marginLeft: "0.5rem", fontSize: "0.65rem" }}>MODO DEMO</span>}
        </div>
        <span className={styles.logoSubtitle}>v3.39 · PRO HEDGE</span>
      </div>

      {/* Middle live sync display */}
      <div className={`${styles.syncStatus} ${styles.desktopOnly}`} title="Sincronização com o MetaTrader 5">
        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
          Último sync: <strong style={{ color: "var(--text-primary)" }}>{lastSyncStr}</strong> · {secondsAgo}s atrás
        </span>
      </div>

      {/* Right side connection info */}
      <div className={styles.rightHeader}>
        {/* Center-Right MT5 Account display */}
        <div className={`${styles.accountDisplay} ${styles.desktopOnly}`}>
          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>CONTA MT5</span>
          <span style={{ fontSize: "0.8rem", color: "var(--neon-gold)", fontWeight: 700, fontFamily: "monospace" }}>#{accountNumber}</span>
        </div>

        {/* Currency/Layout Localization Switcher */}
        <div className={styles.currencySelector}>
          <button
            className={`${styles.currencyOption} ${currencyMode === "CENT" ? styles.currencyOptionActive : ""}`}
            onClick={() => setCurrencyMode("CENT")}
            title="Exibir valores em Dólar Cent (USC)"
          >
            CENT
          </button>
          <button
            className={`${styles.currencyOption} ${currencyMode === "BRL" ? styles.currencyOptionActive : ""}`}
            onClick={() => setCurrencyMode("BRL")}
            title="Exibir valores em Real (BRL)"
          >
            BRL
          </button>
        </div>

        {/* Exchange rate indicator - only visible/relevant when doing BRL conversions */}
        {currencyMode === "BRL" && (
          <div 
            className={styles.desktopOnly} 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.4rem", 
              background: "rgba(255, 255, 255, 0.03)", 
              padding: "0.25rem 0.6rem", 
              borderRadius: "8px", 
              border: "1px solid var(--border-light)" 
            }}
            title="Cotação em tempo real obtida via API AwesomeAPI"
          >
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>USD/BRL</span>
            <span style={{ fontSize: "0.75rem", color: "var(--neon-gold)", fontWeight: 700 }}>R$ {brlRate.toFixed(2)}</span>
          </div>
        )}

        {/* Notification Bell with pulsing animation */}
        <div 
          ref={bellRef}
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => setShowNotifications(!showNotifications)}
          title="Alertas de Recompra e Risco"
        >
          <Bell size={20} style={{ color: showNotifications ? "var(--neon-gold)" : "var(--text-secondary)", transition: "color 0.2s" }} />
          {activeAlertCount > 0 && (
            <span className={styles.bellBadge}>{activeAlertCount}</span>
          )}

          {/* Dynamic notifications drop card */}
          {showNotifications && (
            <div className={styles.notificationsDropdown} ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
              <div className={styles.notificationsHeader}>
                <span>Alertas do Robô</span>
                <span className={styles.notificationsClear} onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}>Fechar</span>
              </div>
              <div className={styles.notificationsList}>
                {notifications.map((n, idx) => {
                  const isCrit = n.severity === "critical";
                  const isWarn = n.severity === "warning";
                  const isSucc = n.severity === "success";
                  const iconColor = isCrit ? "var(--neon-red)" : isWarn ? "var(--neon-gold)" : isSucc ? "var(--neon-green)" : "#00e5ff";
                  
                  return (
                    <div key={idx} className={`${styles.notificationItem} ${styles[n.severity]}`}>
                      <div className={styles.notificationItemHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {isCrit || isWarn ? (
                            <AlertTriangle size={12} style={{ color: iconColor }} />
                          ) : isSucc ? (
                            <CheckCircle2 size={12} style={{ color: iconColor }} />
                          ) : (
                            <Info size={12} style={{ color: iconColor }} />
                          )}
                          <span className={styles.notificationTitle} style={{ color: iconColor }}>{n.title}</span>
                        </div>
                        <span className={styles.notificationTime}>Agora</span>
                      </div>
                      <p className={styles.notificationDesc}>{n.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status indicator with animated colored bullet status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className={styles.desktopOnly} style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Status</span>
          {newsActive ? (
            <span className={styles.statusNewsBadge} title={`Filtro de Notícias Ativo: ${newsName}`}>
              <span className={styles.statusBullet}>●</span> NOTÍCIA
            </span>
          ) : (
            <span className={isActive ? styles.statusActiveBadge : styles.statusPausedBadge}>
              <span className={styles.statusBullet}>●</span> {isActive ? "ATIVO" : "PAUSADO"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
