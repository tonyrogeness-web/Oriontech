import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Activity, AlertTriangle, Info, CheckCircle2, Sun, Moon, X } from "lucide-react";
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
  trailingActive?: boolean;
  trailingPeak?: number;
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
  trailingActive = false,
  trailingPeak = 0,
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
    type?: "close" | "open" | "recompra";
    profitVal?: number;
    symbol?: string;
    direction?: string;
    level?: number;
    volume?: number;
  }

  const formatValue = (val: number, includeSign = false) => {
    const absVal = Math.abs(val);
    const isNeg = val < 0;
    const sign = isNeg ? "-" : (includeSign && val > 0 ? "+" : "");

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

  // Calendar Economic Dropdown States
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState<"ALL" | "HIGH">("HIGH");
  const [showPastEvents, setShowPastEvents] = useState(false);
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);

  // Sync timer state
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastSyncStr, setLastSyncStr] = useState("--:--:--");

  // Notifications states
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [readCriticalIds, setReadCriticalIds] = useState<string[]>([]);
  const [criticalTimestamps, setCriticalTimestamps] = useState<Record<string, number>>({});

  interface Toast {
    id: string;
    title: string;
    desc: string;
    type: "success" | "warning" | "error" | "info";
  }

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((title: string, desc: string, type: "success" | "warning" | "error" | "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, desc, type }]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Generate active critical alerts list dynamically
  const activeCriticals: CriticalNotification[] = [];

  // Group trades by symbol to find levels
  const counts: Record<string, number> = {};
  const symbolPl: Record<string, number> = {};
  trades.forEach((t) => {
    const sym = t.symbol.toUpperCase().replace(/C$/i, "").replace("/", "");
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
        desc: `Rebaixamento acumulado atingiu ${reachPct.toFixed(1)}% do limite de perda (${formatValue(absLoss)} de ${formatValue(softStopLimit)})`,
        createdAt: 0,
        read: false,
      });
    } else if (reachPct >= 50) {
      activeCriticals.push({
        id: "crit_softstop_50",
        severity: "warning",
        title: `🟡 SOFTSTOP ALERTA`,
        desc: `Rebaixamento acumulado atingiu ${reachPct.toFixed(1)}% do limite de perda (${formatValue(absLoss)} de ${formatValue(softStopLimit)})`,
        createdAt: 0,
        read: false,
      });
    }
  }

  // Assign timestamps and read status to activeCriticals
  activeCriticals.forEach((crit) => {
    crit.createdAt = criticalTimestamps[crit.id] || Date.now();
    crit.read = readCriticalIds.includes(crit.id);
  });

  // Sync critical timestamps inside useEffect to keep state pure during render
  const activeIdsStr = activeCriticals.map((c) => c.id).join(",");
  useEffect(() => {
    const current = { ...criticalTimestamps };
    let changed = false;
    const now = Date.now();

    // 1. Add timestamps for new criticals
    activeCriticals.forEach((crit) => {
      if (!current[crit.id]) {
        current[crit.id] = now;
        changed = true;
      }
    });

    // 2. Clean up old timestamps for resolved criticals
    const activeIds = activeCriticals.map((c) => c.id);
    Object.keys(current).forEach((key) => {
      if (!activeIds.includes(key)) {
        delete current[key];
        changed = true;
      }
    });

    if (changed) {
      setCriticalTimestamps(current);
      localStorage.setItem("orion_critical_timestamps", JSON.stringify(current));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdsStr]);

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

  // Detect trade changes (new entries, recompras, closures) in real-time
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

    const prevTickets = new Set(prevTradesRef.current.map((t) => t.ticket));
    const currentTickets = new Set(trades.map((t) => t.ticket));
    
    const closedTrades = prevTradesRef.current.filter((t) => !currentTickets.has(t.ticket));
    const newTrades = trades.filter((t) => !prevTickets.has(t.ticket));

    if (closedTrades.length > 0 || newTrades.length > 0) {
      const nowTick = Date.now();
      const newItems: RecentNotification[] = [];

      // 1. Process closed trades
      closedTrades.forEach((t) => {
        const symbol = t.symbol.toUpperCase().replace(/C$/i, "").replace("/", "");
        const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
        const direction = isBuy ? "BUY" : "SELL";
        
        // Compute level (count of trades for this symbol/direction in previous state)
        const level = prevTradesRef.current.filter((pt) => {
          const ptSymbol = pt.symbol.toUpperCase().replace(/C$/i, "").replace("/", "");
          const ptIsBuy = pt.type.toUpperCase() === "BUY" || pt.type === "0";
          return ptSymbol === symbol && ptIsBuy === isBuy;
        }).length;

        const profitVal = t.currentProfit;
        
        // Expiration: N1 = 1m, N2 = 3m, N3+ = 5m
        const expiryMins = level === 1 ? 1 : level === 2 ? 3 : 5;

        newItems.push({
          id: `trade_close_${t.ticket}_${nowTick}`,
          title: `✅ ${symbol} ${direction} fechou — ${formatValue(profitVal, true)}`,
          desc: `TP atingido N${level}`,
          createdAt: nowTick,
          expiresAt: nowTick + 24 * 60 * 60 * 1000, // Expires after 24 hours (1 day) to cover market cycle if unread
          read: false,
          type: "close",
          profitVal: profitVal,
          symbol: symbol,
          direction: direction,
          level: level,
        });
      });

      // 2. Process new trades (Nova entrada / Recompra)
      newTrades.forEach((t) => {
        const symbol = t.symbol.toUpperCase().replace(/C$/i, "").replace("/", "");
        const isBuy = t.type.toUpperCase() === "BUY" || t.type === "0";
        const direction = isBuy ? "BUY" : "SELL";

        // Compute level in the *current* trades state
        const sameGroupTrades = trades
          .filter((ct) => {
            const ctSymbol = ct.symbol.toUpperCase().replace(/C$/i, "").replace("/", "");
            const ctIsBuy = ct.type.toUpperCase() === "BUY" || ct.type === "0";
            return ctSymbol === symbol && ctIsBuy === isBuy;
          })
          .sort((a, b) => parseInt(a.ticket) - parseInt(b.ticket));

        const index = sameGroupTrades.findIndex((ct) => ct.ticket === t.ticket);
        const level = index !== -1 ? index + 1 : 1;

        if (level === 1) {
          newItems.push({
            id: `trade_open_${t.ticket}_${nowTick}`,
            title: `🔵 ${symbol} ${direction} iniciada — Lote ${t.volume.toFixed(2)}`,
            desc: `Nova entrada no mercado (N1)`,
            createdAt: nowTick,
            expiresAt: nowTick + 24 * 60 * 60 * 1000, // Expires after 24 hours (1 day) if unread
            read: false,
            type: "open",
            volume: t.volume,
            symbol: symbol,
            direction: direction,
            level: 1,
          });
        } else {
          newItems.push({
            id: `trade_recompra_${t.ticket}_${nowTick}`,
            title: `🟡 ${symbol} ${direction} recompra — Lote ${t.volume.toFixed(2)}`,
            desc: `Recompra efetuada N${level}`,
            createdAt: nowTick,
            expiresAt: nowTick + 24 * 60 * 60 * 1000, // Expires after 24 hours (1 day) if unread
            read: false,
            type: "recompra",
            volume: t.volume,
            symbol: symbol,
            direction: direction,
            level: level,
          });
        }
      });

      if (newItems.length > 0) {
        setRecentNotifications((prev) => {
          const updated = [...newItems, ...prev];
          localStorage.setItem("orion_recent_notifications", JSON.stringify(updated));
          return updated;
        });
        newItems.forEach((item) => {
          let toastType: "success" | "warning" | "error" | "info" = "info";
          if (item.id.startsWith("trade_close_")) {
            toastType = "success";
          } else if (item.id.startsWith("trade_recompra_")) {
            toastType = "warning";
          }
          
          let displayTitle = item.title;
          if (item.type === "close" && item.profitVal !== undefined && item.symbol) {
            displayTitle = `✅ ${item.symbol} ${item.direction} fechou — ${formatValue(item.profitVal, true)}`;
          }
          addToast(displayTitle, item.desc, toastType);
        });
      }
    }

    prevTradesRef.current = trades;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, addToast]);

  // Clean expired recent notifications every tick
  useEffect(() => {
    const nowTick = Date.now();
    const today = new Date();
    // Expire read notifications that finished their countdown, unread ones after 24h, or any notification from a different calendar day
    const expiredIds = recentNotifications
      .filter((r) => {
        if (r.expiresAt <= nowTick) return true;
        const d = new Date(r.createdAt);
        const isDiffDay = d.getDate() !== today.getDate() || 
                          d.getMonth() !== today.getMonth() || 
                          d.getFullYear() !== today.getFullYear();
        return isDiffDay;
      })
      .map((r) => r.id);

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

      // Mark all recents as read and activate their expiration timers to 20 minutes
      const newRecents = recentNotifications.map((r) => {
        if (!r.read) {
          return { ...r, read: true, expiresAt: Date.now() + 20 * 60 * 1000 };
        }
        return r;
      });
      saveRecentNotifications(newRecents);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]);

  // Fetch calendar events
  useEffect(() => {
    if (showCalendar && calendarEvents.length === 0) {
      setCalendarLoading(true);
      fetch("/api/dashboard/calendar")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCalendarEvents(data);
          } else {
            console.error("Formato inválido de dados do calendário:", data);
          }
        })
        .catch((err) => console.error("Erro ao buscar calendário:", err))
        .finally(() => setCalendarLoading(false));
    }
  }, [showCalendar, calendarEvents.length]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Notifications outside click
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      
      // Calendar outside click
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        calendarBtnRef.current &&
        !calendarBtnRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
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

  // Drawdown changes tracker
  const isFirstDrawdownRef = useRef(true);
  const prevDrawdownRef = useRef<number>(0);
  useEffect(() => {
    if (maxDrawdown === undefined) return;
    if (isFirstDrawdownRef.current) {
      isFirstDrawdownRef.current = false;
      prevDrawdownRef.current = maxDrawdown;
      return;
    }
    const prev = prevDrawdownRef.current;
    if (prev < 10 && maxDrawdown >= 10 && maxDrawdown < 20) {
      addToast("🟡 Alerta de Drawdown", `Drawdown atingiu ${maxDrawdown.toFixed(1)}% (Zona Amarela)`, "warning");
    } else if (prev < 20 && maxDrawdown >= 20) {
      addToast("🔴 Drawdown Crítico", `Perigo: Drawdown atingiu ${maxDrawdown.toFixed(1)}% (Zona Vermelha)`, "error");
    } else if (prev >= 10 && maxDrawdown < 10) {
      addToast("🟢 Risco Normalizado", `Drawdown reduziu para ${maxDrawdown.toFixed(1)}% (Zona Verde)`, "success");
    }
    prevDrawdownRef.current = maxDrawdown;
  }, [maxDrawdown, addToast]);

  // SoftStop changes tracker
  const isFirstSoftStopRef = useRef(true);
  const prevSoftStopReachRef = useRef<number>(0);
  useEffect(() => {
    if (floatingPl === undefined || softStopLimit === undefined || softStopLimit <= 0) return;
    const absLoss = Math.abs(floatingPl);
    const reachPct = (absLoss / softStopLimit) * 100;

    if (isFirstSoftStopRef.current) {
      isFirstSoftStopRef.current = false;
      prevSoftStopReachRef.current = reachPct;
      return;
    }

    const prev = prevSoftStopReachRef.current;
    if (floatingPl < 0) {
      if (prev < 50 && reachPct >= 50 && reachPct < 80) {
        addToast("🟡 Alerta SoftStop", `Rebaixamento atingiu ${reachPct.toFixed(0)}% do limite de perda (${formatValue(absLoss)} de ${formatValue(softStopLimit)})`, "warning");
      } else if (prev < 80 && reachPct >= 80 && reachPct < 100) {
        addToast("🔴 SoftStop Crítico", `Rebaixamento atingiu ${reachPct.toFixed(0)}% do limite de perda (${formatValue(absLoss)} de ${formatValue(softStopLimit)})`, "error");
      } else if (prev < 100 && reachPct >= 100) {
        addToast("🛑 SoftStop Ativado", `Limite de perda atingido (${formatValue(absLoss)} / ${formatValue(softStopLimit)}). Novas ordens bloqueadas!`, "error");
      }
    }
    prevSoftStopReachRef.current = reachPct;
  }, [floatingPl, softStopLimit, addToast]);

  // Trailing active / peak cycle tracker
  const isFirstTrailingActiveRef = useRef(true);
  const prevTrailingActiveRef = useRef<boolean>(false);
  useEffect(() => {
    if (trailingActive === undefined) return;
    if (isFirstTrailingActiveRef.current) {
      isFirstTrailingActiveRef.current = false;
      prevTrailingActiveRef.current = trailingActive;
      return;
    }
    const prevActive = prevTrailingActiveRef.current;
    
    if (!prevActive && trailingActive) {
      addToast("🎯 Ciclo Equity Iniciado", `Novo ciclo de Trailing de Patrimônio foi ativado (Base: ${formatValue(balance || 0)}).`, "success");
    } else if (prevActive && !trailingActive) {
      addToast("🏁 Ciclo Equity Concluído", "O ciclo de trailing atual foi encerrado (alvo alcançado ou resetado).", "info");
    }
    prevTrailingActiveRef.current = trailingActive;
  }, [trailingActive, balance, currencyMode, brlRate, addToast]);

  const isFirstTrailingPeakRef = useRef(true);
  const prevTrailingPeakRef = useRef<number>(0);
  useEffect(() => {
    if (trailingPeak === undefined || !trailingActive) return;
    if (isFirstTrailingPeakRef.current) {
      isFirstTrailingPeakRef.current = false;
      prevTrailingPeakRef.current = trailingPeak;
      return;
    }
    const prevPeak = prevTrailingPeakRef.current;
    
    if (prevPeak < 2.5 && trailingPeak >= 2.5 && trailingPeak < 4.5) {
      addToast("📈 Progresso do Ciclo", `Alcançou +${trailingPeak.toFixed(2)}% de lucro flutuante (metade do caminho para o alvo!).`, "info");
    } else if (prevPeak < 4.5 && trailingPeak >= 4.5) {
      addToast("🚀 Quase lá!", `Lucro flutuante atingiu +${trailingPeak.toFixed(2)}%. Próximo de bater o alvo do ciclo!`, "success");
    }
    prevTrailingPeakRef.current = trailingPeak;
  }, [trailingPeak, trailingActive, addToast]);

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
        <span className={styles.logoSubtitle}>v3.40 · PRO HEDGE</span>
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

        {/* Unified Premium Control Capsule */}
        <div className={styles.headerCapsule}>
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
                background: "rgba(255, 255, 255, 0.02)", 
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

          <div className={styles.capsuleDivider} />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={styles.themeToggleBtn}
            title={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className={styles.capsuleDivider} />

          {/* Forex Factory Economic Calendar Button */}
          <div className={styles.calendarContainer}>
            <button
              ref={calendarBtnRef}
              onClick={() => {
                setShowCalendar(!showCalendar);
                setShowNotifications(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                cursor: "pointer",
                background: "none",
                border: "none",
                opacity: showCalendar ? 1 : 0.8,
                transition: "opacity 0.2s",
                fontSize: "1.1rem",
                outline: "none"
              }}
              title="Calendário Econômico Forex Factory"
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = showCalendar ? "1" : "0.8"}
            >
              📅
            </button>

            {showCalendar && (
              <div className={styles.calendarDropdown} ref={calendarRef}>
                <div className={styles.calendarHeader}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.825rem", color: "var(--text-primary)" }}>
                      Notícias Econômicas
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                      Fonte: Forex Factory (Esta Semana)
                    </span>
                  </div>
                  <div className={styles.calendarFilterGroup}>
                    <button
                      className={`${styles.calendarFilterBtn} ${calendarFilter === "HIGH" ? styles.calendarFilterBtnActive : ""}`}
                      onClick={() => setCalendarFilter("HIGH")}
                    >
                      Alto Impacto 🔥
                    </button>
                    <button
                      className={`${styles.calendarFilterBtn} ${calendarFilter === "ALL" ? styles.calendarFilterBtnActive : ""}`}
                      onClick={() => setCalendarFilter("ALL")}
                    >
                      Todas
                    </button>
                  </div>
                </div>

                <div className={styles.calendarList}>
                  {calendarLoading ? (
                    <div className={styles.calendarLoadingContainer}>
                      <div className={styles.spinner} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Carregando eventos...</span>
                    </div>
                  ) : (() => {
                    const filteredEvents = calendarEvents.filter((ev) => {
                      if (calendarFilter === "HIGH") {
                        return ev.impact?.toLowerCase() === "high";
                      }
                      return true;
                    });

                    if (filteredEvents.length === 0) {
                      return (
                        <div className={styles.emptyCalendar}>
                          Nenhum evento relevante esta semana.
                        </div>
                      );
                    }

                    const now = new Date();
                    const upcomingEvents: any[] = [];
                    const pastEvents: any[] = [];

                    filteredEvents.forEach((ev) => {
                      if (ev.date) {
                        const evDate = new Date(ev.date);
                        if (evDate >= now) {
                          upcomingEvents.push(ev);
                        } else {
                          pastEvents.push(ev);
                        }
                      } else {
                        upcomingEvents.push(ev);
                      }
                    });

                    // Sort upcoming ascending (closest first)
                    upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    
                    // Sort past descending (most recent first)
                    pastEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    const renderEventItem = (ev: any, itemKey: string, isUpcoming: boolean) => {
                      let impactColor = "var(--text-muted)";
                      let impactBg = "rgba(255, 255, 255, 0.05)";
                      let impactBorder = "rgba(255, 255, 255, 0.1)";
                      const imp = ev.impact?.toLowerCase();
                      
                      if (imp === "high") {
                        impactColor = "var(--neon-red)";
                        impactBg = "rgba(255, 23, 68, 0.08)";
                        impactBorder = "rgba(255, 23, 68, 0.2)";
                      } else if (imp === "medium") {
                        impactColor = "var(--neon-gold)";
                        impactBg = "rgba(255, 184, 0, 0.08)";
                        impactBorder = "rgba(255, 184, 0, 0.2)";
                      } else if (imp === "low") {
                        impactColor = "#eab308";
                        impactBg = "rgba(234, 179, 8, 0.06)";
                        impactBorder = "rgba(234, 179, 8, 0.15)";
                      }

                      let formattedTime = ev.time || "";
                      let dateStr = ev.date || "";
                      try {
                        if (ev.date) {
                          const d = new Date(ev.date);
                          const day = String(d.getDate()).padStart(2, '0');
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          dateStr = `${day}/${month}`;
                          formattedTime = `${hours}:${minutes}`;
                        }
                      } catch (e) {
                        console.error("Error parsing date:", ev.date);
                      }

                      return (
                        <div key={itemKey} className={`${styles.calendarItem} ${!isUpcoming ? styles.calendarItemPast : ""}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span className={styles.calendarCountry}>{ev.country}</span>
                                <span 
                                  className={styles.calendarImpactBadge}
                                  style={{
                                    color: impactColor,
                                    backgroundColor: impactBg,
                                    borderColor: impactBorder
                                  }}
                                >
                                  {ev.impact}
                                </span>
                              </div>
                              <span className={styles.calendarEventTitle}>{ev.title}</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem", flexShrink: 0 }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                                {formattedTime}
                              </span>
                              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>
                                {dateStr}
                              </span>
                            </div>
                          </div>

                          {(ev.forecast || ev.previous) && (
                            <div className={styles.calendarDetailsRow}>
                              {ev.forecast && (
                                <span style={{ display: "flex", gap: "0.2rem" }}>
                                  <span style={{ color: "var(--text-muted)" }}>Proj:</span>
                                  <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{ev.forecast}</span>
                                </span>
                              )}
                              {ev.previous && (
                                <span style={{ display: "flex", gap: "0.2rem" }}>
                                  <span style={{ color: "var(--text-muted)" }}>Prév:</span>
                                  <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{ev.previous}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                        {/* Exibir Histórico Anterior no topo do dropdown */}
                        {pastEvents.length > 0 && (
                          <>
                            <div 
                              className={styles.calendarPastToggle} 
                              onClick={() => setShowPastEvents(!showPastEvents)}
                              style={{ borderTop: "none" }}
                            >
                              <span>{showPastEvents ? "▼ Ocultar" : "▶ Exibir"} Histórico Anterior ({pastEvents.length})</span>
                            </div>

                            {showPastEvents && (
                              <div className={styles.calendarPastList}>
                                {pastEvents.map((ev, idx) => renderEventItem(ev, `past_${idx}`, false))}
                              </div>
                            )}
                          </>
                        )}

                        <div className={styles.calendarSectionHeader}>
                          Próximos Eventos
                        </div>

                        {upcomingEvents.length === 0 ? (
                          <div className={styles.emptyCalendar} style={{ padding: "1.5rem 1rem" }}>
                            Nenhum evento agendado para esta semana.
                          </div>
                        ) : (
                          upcomingEvents.map((ev, idx) => renderEventItem(ev, `up_${idx}`, true))
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className={styles.capsuleDivider} />

          {/* Notification Bell with pulsing animation */}
          <div 
            ref={bellRef}
            className={styles.bellContainer}
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
                    recentNotifications.map((r) => {
                      let displayTitle = r.title;
                      if (r.type === "close" && r.profitVal !== undefined && r.symbol) {
                        displayTitle = `✅ ${r.symbol} ${r.direction} fechou — ${formatValue(r.profitVal, true)}`;
                      }
                      return (
                        <div key={r.id} className={`${styles.notificationItem} ${styles.recent}`}>
                          <div className={styles.notificationItemHeader}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <CheckCircle2 size={12} style={{ color: "var(--neon-green)" }} />
                              <span className={styles.notificationTitle} style={{ color: "var(--neon-green)" }}>
                                {displayTitle}
                              </span>
                            </div>
                          </div>
                          <p className={styles.notificationDesc}>
                            {r.desc}
                            {r.read ? (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.62rem", marginLeft: "0.5rem" }}>
                                &rarr; {formatTimeLeft(r.expiresAt)}
                              </span>
                            ) : (
                              <span className="badge badge-info" style={{ fontSize: "0.6rem", padding: "1px 4px", marginLeft: "0.5rem", display: "inline-block" }}>
                                NOVO
                              </span>
                            )}
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
                      );
                    })
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

          <div className={styles.capsuleDivider} />

          {/* Status indicator with animated colored bullet status */}
          <div className={styles.statusContainer}>
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
      </div>
      {/* Toasts Container */}
      <div className={styles.toastContainer}>
        {toasts.map((t) => {
          let IconComp = Info;
          let toastClass = styles.toastInfo;
          if (t.type === "success") {
            IconComp = CheckCircle2;
            toastClass = styles.toastSuccess;
          } else if (t.type === "warning") {
            IconComp = AlertTriangle;
            toastClass = styles.toastWarning;
          } else if (t.type === "error") {
            IconComp = AlertTriangle;
            toastClass = styles.toastError;
          }
          return (
            <div key={t.id} className={`${styles.toast} ${toastClass}`}>
              <div className={styles.toastHeader}>
                <div className={styles.toastTitleGroup}>
                  <IconComp size={14} />
                  <span className={t.type === "error" ? styles.valueRed : styles.toastTitle}>
                    {t.title}
                  </span>
                </div>
                <button className={styles.toastCloseBtn} onClick={() => removeToast(t.id)}>
                  <X size={14} />
                </button>
              </div>
              <p className={styles.toastDesc}>{t.desc}</p>
            </div>
          );
        })}
      </div>
    </header>
  );
}
