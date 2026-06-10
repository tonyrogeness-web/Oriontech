import React, { useState, useEffect, useRef } from "react";
import { Bell, Activity, AlertTriangle, Info, CheckCircle2, Sun, Moon } from "lucide-react";
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
  // Theme state and toggle logic
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("orion_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("orion_theme", nextTheme);
  };

  interface RecentNotification {
    id: string;
    title: string;
    desc: string;
    createdAt: number;
    expiresAt: number;
    read: boolean;
  }

  interface CriticalNotification {
    id: string;
    severity: "critical" | "warning";
    title: string;
    desc: string;
    createdAt: number;
    read: boolean;
  }

  const isActive = status === "RUNNING";
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Sync timer state
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastSyncStr, setLastSyncStr] = useState("--:--:--");

  // Notifications states
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [readCriticalIds, setReadCriticalIds] = useState<string[]>([]);
  const [criticalTimestamps, setCriticalTimestamps] = useState<Record<string, number>>({});

  // 1. Generate active critical alerts list dynamically
  const activeCriticals: CriticalNotification[] = [];

  // Group trades by symbol to find levels
  const counts: Record<string, number> = {};
  const symbolPl: Record<string, number> = {};
  trades.forEach((t) => {
    const sym = t.symbol.toUpperCase().replace("C", "").replace("/", "");
    counts[sym] = (counts[sym] || 0) + 1;
    symbolPl[sym] = (symbolPl[sym] || 0) + t.currentProfit;
  });

  // Find worst performing symbol for drawdown label
  let worstSymbol = "GLOBAL";
  let worstPl = 0;
  Object.entries(symbolPl).forEach(([sym, pl]) => {
    if (pl < worstPl) {
      worstPl = pl;
      worstSymbol = sym;
    }
  });

  // A. Recompras >= 4
  Object.entries(counts).forEach(([sym, level]) => {
    if (level >= 4) {
      activeCriticals.push({
        id: `crit_recompra_${sym}`,
        severity: "critical",
        title: `🔴 RECOMPRA ELEVADA — ${sym}`,
        desc: `Grade atingiu nível ${level} de recompras`,
        createdAt: 0,
        read: false,
      });
    }
  });

  // B. Drawdown
  if (maxDrawdown >= 20) {
    activeCriticals.push({
      id: "crit_dd_red",
      severity: "critical",
      title: `🔴 DD VERMELHO — ${worstSymbol}`,
      desc: `Drawdown atingiu ${maxDrawdown.toFixed(2)}%`,
      createdAt: 0,
      read: false,
    });
  } else if (maxDrawdown >= 10) {
    activeCriticals.push({
      id: "crit_dd_yellow",
      severity: "warning",
      title: `🟡 DD AMARELO — ${worstSymbol}`,
      desc: `Drawdown atingiu ${maxDrawdown.toFixed(2)}%`,
      createdAt: 0,
      read: false,
    });
  }

  // C. SoftStop (reach 50% / 80%)
  if (floatingPl < 0 && softStopLimit > 0) {
    const absLoss = Math.abs(floatingPl);
    const reachPct = (absLoss / softStopLimit) * 100;
    if (reachPct >= 80) {
      activeCriticals.push({
        id: "crit_softstop_80",
        severity: "critical",
        title: `🔴 SOFTSTOP CRÍTICO`,
        desc: `Rebaixamento acumulado atingiu ${reachPct.toFixed(1)}% do limite de perda (${absLoss.toFixed(2)} USC)`,
        createdAt: 0,
        read: false,
      });
    } else if (reachPct >= 50) {
      activeCriticals.push({
        id: "crit_softstop_50",
        severity: "warning",
        title: `🟡 SOFTSTOP ALERTA`,
        desc: `Rebaixamento acumulado atingiu ${reachPct.toFixed(1)}% do limite de perda (${absLoss.toFixed(2)} USC)`,
        createdAt: 0,
        read: false,
      });
    }
  }

  // Assign timestamps and read status to activeCriticals
  const now = Date.now();
  const currentCriticalTimestamps = { ...criticalTimestamps };
  let timestampsChanged = false;

  activeCriticals.forEach((crit) => {
    if (currentCriticalTimestamps[crit.id]) {
      crit.createdAt = currentCriticalTimestamps[crit.id];
    } else {
      crit.createdAt = now;
      currentCriticalTimestamps[crit.id] = now;
      timestampsChanged = true;
    }
    
    // Check read state
    crit.read = readCriticalIds.includes(crit.id);
  });

  // Clean up old timestamps for resolved criticals
  const activeIds = activeCriticals.map((c) => c.id);
  Object.keys(currentCriticalTimestamps).forEach((key) => {
    if (!activeIds.includes(key)) {
      delete currentCriticalTimestamps[key];
      timestampsChanged = true;
    }
  });

  // Sync critical timestamps
  useEffect(() => {
    if (timestampsChanged) {
      setCriticalTimestamps(currentCriticalTimestamps);
      localStorage.setItem("orion_critical_timestamps", JSON.stringify(currentCriticalTimestamps));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds.join(",")]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedReadCrits = localStorage.getItem("orion_read_critical_ids");
      if (savedReadCrits) setReadCriticalIds(JSON.parse(savedReadCrits));

      const savedCritTimes = localStorage.getItem("orion_critical_timestamps");
      if (savedCritTimes) setCriticalTimestamps(JSON.parse(savedCritTimes));

      const savedRecents = localStorage.getItem("orion_recent_notifications");
      if (savedRecents) {
        setRecentNotifications(JSON.parse(savedRecents));
      } else {
        setRecentNotifications([]);
        localStorage.setItem("orion_recent_notifications", JSON.stringify([]));
      }
    } catch (e) {
      console.error("Erro ao carregar notificações", e);
    }
  }, []);

  // Sync helper functions
  const saveReadCrits = (ids: string[]) => {
    setReadCriticalIds(ids);
    localStorage.setItem("orion_read_critical_ids", JSON.stringify(ids));
  };

  const saveRecentNotifications = (recents: RecentNotification[]) => {
    setRecentNotifications(recents);
    localStorage.setItem("orion_recent_notifications", JSON.stringify(recents));
  };

  // Detect trade closures in real-time
  const prevTradesRef = useRef<Trade[]>([]);
  useEffect(() => {
    if (!trades || isMock) {
      prevTradesRef.current = trades || [];
      return;
    }
    if (prevTradesRef.current.length === 0 && trades.length > 0) {
      prevTradesRef.current = trades;
      return;
    }

    const currentTickets = new Set(trades.map((t) => t.ticket));
    const closedTrades = prevTradesRef.current.filter((t) => !currentTickets.has(t.ticket));

    if (closedTrades.length > 0) {
      const updated = [...recentNotifications];
      closedTrades.forEach((t) => {
        const symbol = t.symbol.toUpperCase().replace("C", "").replace("/", "");
        const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
        const direction = isBuy ? "BUY" : "SELL";
        
        // Compute level (count of trades for this symbol in previous state)
        const level = prevTradesRef.current.filter(
          (pt) => pt.symbol.toUpperCase().replace("C", "").replace("/", "") === symbol
        ).length;

        const profitVal = t.currentProfit;
        const profit = profitVal >= 0 ? `+${profitVal.toFixed(2)}` : `${profitVal.toFixed(2)}`;
        
        // Expiration: N1 = 1m, N2 = 3m, N3+ = 5m
        const expiryMins = level === 1 ? 1 : level === 2 ? 3 : 5;
        const nowTick = Date.now();

        updated.unshift({
          id: `trade_close_${t.ticket}_${nowTick}`,
          title: `✅ ${symbol} ${direction} fechou — ${profit} USC`,
          desc: `TP atingido N${level}`,
          createdAt: nowTick,
          expiresAt: nowTick + expiryMins * 60 * 1000,
          read: false,
        });
      });
      saveRecentNotifications(updated);
    }

    prevTradesRef.current = trades;
  }, [trades, recentNotifications]);

  // Clean expired recent notifications every tick
  useEffect(() => {
    const nowTick = Date.now();
    const expiredIds = recentNotifications.filter((r) => r.expiresAt <= nowTick).map((r) => r.id);
    if (expiredIds.length > 0) {
      const nonExpired = recentNotifications.filter((r) => !expiredIds.includes(r.id));
      saveRecentNotifications(nonExpired);
    }
  }, [secondsAgo, recentNotifications]);

  // Handle auto-mark as read on dropdown open
  useEffect(() => {
    if (showNotifications) {
      // Mark all active criticals as read
      const currentActiveIds = activeCriticals.map((c) => c.id);
      const newReadCrits = Array.from(new Set([...readCriticalIds, ...currentActiveIds]));
      saveReadCrits(newReadCrits);

      // Mark all recents as read
      const newRecents = recentNotifications.map((r) => ({ ...r, read: true }));
      saveRecentNotifications(newRecents);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]);

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
    const nowSync = new Date();
    const timeStr = nowSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

  // Actions
  const dismissRecent = (id: string) => {
    const filtered = recentNotifications.filter((r) => r.id !== id);
    saveRecentNotifications(filtered);
  };

  const clearAllRecent = () => {
    saveRecentNotifications([]);
  };

  const markAllReadExplicit = () => {
    const currentActiveIds = activeCriticals.map((c) => c.id);
    const newReadCrits = Array.from(new Set([...readCriticalIds, ...currentActiveIds]));
    saveReadCrits(newReadCrits);

    const newRecents = recentNotifications.map((r) => ({ ...r, read: true }));
    saveRecentNotifications(newRecents);
  };

  // Format helpers
  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `há ${diffHours} h`;
  };

  const formatTimeLeft = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins <= 0) return "expirando...";
    return `some em ${diffMins}min`;
  };

  const unreadCriticalCount = activeCriticals.filter((c) => !c.read).length;
  const unreadRecentCount = recentNotifications.filter((r) => !r.read).length;

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
      <div className={`${styles.syncStatusBadgeContainer} ${styles.desktopOnly}`} title="Sincronização com o MetaTrader 5">
        {secondsAgo < 30 ? (
          <span className={styles.syncStatusGreen}>
            <span className={`${styles.statusBullet} ${styles.bulletPulse}`}>●</span> Conectado · Sync {secondsAgo}s atrás
          </span>
        ) : secondsAgo < 60 ? (
          <span className={styles.syncStatusAmber}>
            ⚠️ Lento · Último sync {secondsAgo}s atrás
          </span>
        ) : (
          <span className={styles.syncStatusRed}>
            ✕ Offline · Sem sinal {secondsAgo}s atrás
          </span>
        )}
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
              background: "var(--opacity-bg-header)", 
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

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={styles.themeToggleBtn}
          title={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          style={{ marginRight: "0.25rem" }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell with pulsing animation */}
        <div 
          ref={bellRef}
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => setShowNotifications(!showNotifications)}
          title="Alertas de Recompra e Risco"
        >
          <Bell 
            size={20} 
            style={{ 
              color: !isActive ? "#64748b" : showNotifications ? "var(--neon-gold)" : "var(--text-secondary)", 
              transition: "color 0.2s" 
            }} 
          />
          
          {/* Badge render state */}
          {!isActive ? (
            <span className={styles.bellBadgeMuted} />
          ) : unreadCriticalCount > 0 ? (
            <span className={styles.bellBadgeRedPulse}>{unreadCriticalCount}</span>
          ) : unreadRecentCount > 0 ? (
            <span className={styles.bellBadge}>{unreadRecentCount}</span>
          ) : null}

          {/* Dynamic notifications drop card */}
          {showNotifications && (
            <div className={styles.notificationsDropdown} ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
              <div className={styles.notificationsHeader}>
                <span>Notificações</span>
                <span className={styles.notificationsClear} onClick={(e) => { e.stopPropagation(); markAllReadExplicit(); }}>
                  Marcar todas lidas
                </span>
              </div>
              
              <div className={styles.notificationsList}>
                {/* 1. Critical Alerts Section */}
                <div className={styles.notificationsSectionHeader}>
                  CRÍTICAS (persistem até resolver)
                </div>
                
                {activeCriticals.length === 0 ? (
                  <div className={styles.emptyNotifications}>
                    Nenhuma crítica ativa
                  </div>
                ) : (
                  activeCriticals.map((c) => (
                    <div 
                      key={c.id} 
                      className={`${styles.notificationItem} ${c.severity === "critical" ? styles.critical : styles.warning}`}
                    >
                      <div className={styles.notificationItemHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <AlertTriangle 
                            size={12} 
                            style={{ color: c.severity === "critical" ? "var(--neon-red)" : "var(--neon-gold)" }} 
                          />
                          <span 
                            className={styles.notificationTitle} 
                            style={{ color: c.severity === "critical" ? "var(--neon-red)" : "var(--neon-gold)" }}
                          >
                            {c.title}
                          </span>
                        </div>
                        <span className={styles.notificationTime}>
                          {formatTimeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className={styles.notificationDesc}>{c.desc}</p>
                    </div>
                  ))
                )}

                {/* 2. Recent Alerts Section */}
                <div className={styles.notificationsSectionHeader}>
                  RECENTES (somem em breve)
                </div>
                
                {recentNotifications.length === 0 ? (
                  <div className={styles.emptyNotifications}>
                    Nenhum alerta recente
                  </div>
                ) : (
                  recentNotifications.map((r) => (
                    <div key={r.id} className={`${styles.notificationItem} ${styles.recent}`}>
                      <div className={styles.notificationItemHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <CheckCircle2 size={12} style={{ color: "var(--neon-green)" }} />
                          <span className={styles.notificationTitle} style={{ color: "var(--neon-green)" }}>
                            {r.title}
                          </span>
                        </div>
                      </div>
                      <p className={styles.notificationDesc}>
                        {r.desc} &rarr; {formatTimeLeft(r.expiresAt)}
                      </p>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.2rem" }}>
                        <span 
                          className={styles.notificationDismiss} 
                          onClick={(e) => { e.stopPropagation(); dismissRecent(r.id); }}
                        >
                          [dispensar]
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentNotifications.length > 0 && (
                <div className={styles.notificationsFooter}>
                  <button className={styles.clearAllButton} onClick={(e) => { e.stopPropagation(); clearAllRecent(); }}>
                    Limpar todas as recentes
                  </button>
                </div>
              )}
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
