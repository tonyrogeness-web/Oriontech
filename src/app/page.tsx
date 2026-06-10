"use client";

import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import Header from "@/components/Header";
import KpiCards from "@/components/KpiCards";
import Charts from "@/components/Charts";
import RiskManagement from "@/components/RiskManagement";
import ActiveBaskets from "@/components/ActiveBaskets";
import TradesTable from "@/components/TradesTable";
import Controls from "@/components/Controls";
import styles from "@/components/components.module.css";

// Dynamic SoftStop limit calculation matching MT5 robot formula
const calculateSoftStopLimit = (bal: number) => {
  const InpLotInitial = 0.015;
  const InpSoftStopEquity = 400.0;
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
  return InpSoftStopEquity * fat;
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [brlRate, setBrlRate] = useState(5.45);
  const [currencyMode, setCurrencyMode] = useState<"CENT" | "BRL">("BRL");

  // Visual polling timer state
  const [syncProgress, setSyncProgress] = useState(0);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(1);
  const [loadingPhase, setLoadingPhase] = useState("Conectando ao servidor...");
  const [hasFetchedFallback, setHasFetchedFallback] = useState(false);

  // Load currency mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("orion_currency_mode");
    if (saved === "CENT" || saved === "BRL") {
      setCurrencyMode(saved);
    }
  }, []);

  const handleCurrencyModeChange = (mode: "CENT" | "BRL") => {
    setCurrencyMode(mode);
    localStorage.setItem("orion_currency_mode", mode);
  };

  // Sync BRL rate from robot, fallback to internet APIs if not available
  useEffect(() => {
    const activeAcc = data?.accounts?.[0];
    if (activeAcc && activeAcc.brlRate && activeAcc.brlRate > 0) {
      setBrlRate(activeAcc.brlRate);
      return;
    }

    // Fallback: fetch from public APIs if no rate is sent by the robot yet
    if (data && !hasFetchedFallback) {
      setHasFetchedFallback(true);
      const fetchBrlRate = async () => {
        try {
          const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
          if (res.ok) {
            const json = await res.json();
            if (json && json.USDBRL && json.USDBRL.bid) {
              const val = parseFloat(json.USDBRL.bid);
              if (!isNaN(val) && val > 0) {
                setBrlRate(val);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Falha ao buscar taxa no AwesomeAPI, tentando fallback...", e);
        }

        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          if (res.ok) {
            const json = await res.json();
            if (json && json.rates && json.rates.BRL) {
              const val = parseFloat(json.rates.BRL);
              if (!isNaN(val) && val > 0) {
                setBrlRate(val);
              }
            }
          }
        } catch (e) {
          console.error("Falha ao buscar taxa em todos os serviços", e);
        }
      };
      fetchBrlRate();
    }
  }, [data, hasFetchedFallback]);

  // Poll database every 5 seconds for real-time update feel with smooth progress tracking
  useEffect(() => {
    let active = true;
    let elapsed = 0;
    const totalTime = 5000; // 5 seconds
    const step = 100; // Update progress bar every 100ms

    async function fetchData() {
      try {
        if (!data) {
          if (loadingAttempts === 1) setLoadingPhase("Conectando ao servidor...");
          else if (loadingAttempts === 2) setLoadingPhase("Autenticando sessão...");
          else if (loadingAttempts === 3) setLoadingPhase("Carregando base de dados...");
          else if (loadingAttempts === 4) setLoadingPhase("Verificando conexão com MT5...");
          else setLoadingPhase("Sincronizando estatísticas...");
        }

        const response = await fetch("/api/dashboard/data", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao carregar dados do servidor.");
        }
        const json = await response.json();
        if (active) {
          setData(json);
          setError(null);
          setLoadingAttempts(1); // reset attempts on success
          // Trigger sync flash effect
          setIsFlashActive(true);
          setTimeout(() => {
            if (active) setIsFlashActive(false);
          }, 600);
        }
      } catch (err: any) {
        if (active) {
          if (!data && loadingAttempts < 5) {
            setLoadingAttempts((prev) => prev + 1);
            setTimeout(() => {
              if (active) setRefreshTrigger((prev) => prev + 1);
            }, 1500);
          } else {
            setError(err.message || "Sem sinal do servidor após 5 tentativas de conexão. Verifique se o banco de dados está online.");
          }
        }
      }
    }

    fetchData();

    const interval = setInterval(() => {
      elapsed += step;
      if (elapsed >= totalTime) {
        elapsed = 0;
        fetchData();
      }
      if (active) {
        setSyncProgress((elapsed / totalTime) * 100);
      }
    }, step);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  const handleSendCommand = async (command: string, symbol: string = "") => {
    if (!data || !data.accounts || data.accounts.length === 0) return;
    const activeAccount = data.accounts[0].account;

    try {
      const response = await fetch("/api/dashboard/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: activeAccount,
          command,
          symbol,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar comando.");
      }

      // Trigger immediate refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (error && !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "2rem" }}>
        <div className="glass-card glow-red" style={{ maxWidth: "480px", textAlign: "center" }}>
          <h2 style={{ color: "var(--neon-red)", marginBottom: "1rem" }}>Erro de Sincronização</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => { setLoadingAttempts(1); setRefreshTrigger((p) => p + 1); }}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Premium loading screen when data is not yet loaded
  if (!data && !error) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingLogoContainer}>
            <Activity className={styles.loadingLogoIcon} size={36} />
          </div>
          <div>
            <h2 className={styles.loadingTitle}>ORION HEDGE</h2>
            <span className={styles.loadingSubtitle}>Painel de Sincronização Web</span>
          </div>
          <div className={styles.loadingBarContainer}>
            <div className={styles.loadingBarProgress} style={{ width: `${(loadingAttempts / 5) * 100}%` }} />
          </div>
          <span className={styles.loadingStatusText}>{loadingPhase}</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Tentativa {loadingAttempts} de 5
          </span>
        </div>
      </div>
    );
  }

  // Set default initial state values
  const accounts = data?.accounts || [];
  const activeAccount = accounts[0] || {
    account: "Carregando...",
    balance: 0,
    equity: 0,
    dailyProfit: 0,
    floatingPl: 0,
    totalProfit: 0,
    maxDrawdown: 0,
    status: "RUNNING",
    lastUpdated: "",
  };

  const mockReason = data?.mockReason || null;
  const dbError = data?.dbError || null;



  const trades = data?.trades || [];
  const history = data?.history || [];
  const pendingCommandsCount = data?.pendingCommandsCount || 0;

  // Extract unique active symbols from trades to allow targeted local panic triggers
  const activeSymbols = Array.from(new Set(trades.map((t: any) => t.symbol))) as string[];



  const dynamicSoftStopLimit = calculateSoftStopLimit(activeAccount.balance);

  return (
    <div className={isFlashActive ? styles.syncFlash : ""}>
      {/* Sleek Polling Sync Progress Line */}
      <div className={styles.syncProgressBarOuter}>
        <div
          className={styles.syncProgressBarInner}
          style={{ width: `${syncProgress}%` }}
        />
      </div>

      <div className="dashboard-container">
        {/* Contextual Alert Banners */}
        <div className={styles.alertBannersContainer}>
          {activeAccount.newsActive && (
            <div className={`${styles.newsAlertBanner} ${styles.alertBannerWarning}`}>
              <div className={styles.newsAlertContent}>
                <span className={styles.newsAlertIcon}>⚠️</span>
                <span className={styles.newsAlertText}>
                  <strong>FILTRO DE NOTÍCIAS ATIVO:</strong> {activeAccount.newsName || "Proteção ativada."}
                  {activeAccount.newsFrozen ? " (Novas recompras bloqueadas e grade congelada)" : " (Novas entradas bloqueadas)"}
                </span>
              </div>
            </div>
          )}

          {activeAccount.ddReached20 && (
            <div className={`${styles.newsAlertBanner} ${styles.alertBannerCritical}`}>
              <div className={styles.newsAlertContent}>
                <span className={styles.newsAlertIcon}>🔴</span>
                <span className={styles.newsAlertText}>
                  <strong>DD VERMELHO ATIVO ({activeAccount.maxDrawdown.toFixed(1)}%):</strong> Rebaixamento crítico de 20% alcançado no ciclo de equity.
                </span>
              </div>
            </div>
          )}

          {!activeAccount.ddReached20 && activeAccount.ddReached10 && (
            <div className={`${styles.newsAlertBanner} ${styles.alertBannerWarning}`}>
              <div className={styles.newsAlertContent}>
                <span className={styles.newsAlertIcon}>🟡</span>
                <span className={styles.newsAlertText}>
                  <strong>DD AMARELO ATIVO ({activeAccount.maxDrawdown.toFixed(1)}%):</strong> Rebaixamento intermediário de 10% alcançado no ciclo de equity.
                </span>
              </div>
            </div>
          )}

          {activeAccount.floatingPl < 0 && Math.abs(activeAccount.floatingPl) >= dynamicSoftStopLimit && (
            <div className={`${styles.newsAlertBanner} ${styles.alertBannerCritical}`}>
              <div className={styles.newsAlertContent}>
                <span className={styles.newsAlertIcon}>🔴</span>
                <span className={styles.newsAlertText}>
                  <strong>SOFTSTOP ATIVADO:</strong> Perda flutuante ({Math.abs(activeAccount.floatingPl).toFixed(2)} USC) atingiu ou superou o limite SoftStop de {dynamicSoftStopLimit.toFixed(2)} USC. Abertura de novos cestos bloqueada!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 1. Header component */}
        <Header
          accountNumber={activeAccount.account}
          status={activeAccount.status}
          isMock={data?.isMock}
          brlRate={brlRate}
          currencyMode={currencyMode}
          setCurrencyMode={handleCurrencyModeChange}
          trades={trades}
          maxDrawdown={activeAccount.maxDrawdown}
          floatingPl={activeAccount.floatingPl}
          balance={activeAccount.balance}
          softStopLimit={dynamicSoftStopLimit}
          newsActive={activeAccount.newsActive}
          newsName={activeAccount.newsName}
        />

        {/* 2. Row of 5 KPI Cards */}
        <KpiCards
          balance={activeAccount.balance}
          equity={activeAccount.equity}
          dailyProfit={activeAccount.dailyProfit}
          floatingPl={activeAccount.floatingPl}
          totalProfit={activeAccount.totalProfit}
          maxDrawdown={activeAccount.maxDrawdown}
          brlRate={brlRate}
          currencyMode={currencyMode}
          history={history}
        />

        {/* 3. Chart & Risk Management */}
        <div className={styles.mainGrid} style={{ marginBottom: "1.25rem" }}>
          <Charts history={history} currencyMode={currencyMode} brlRate={brlRate} />
          <RiskManagement
            floatingPl={activeAccount.floatingPl}
            maxDrawdown={activeAccount.maxDrawdown}
            tradesCount={trades.length}
            softStopLimit={dynamicSoftStopLimit}
            balance={activeAccount.balance}
            currencyMode={currencyMode}
            brlRate={brlRate}
            history={history}
            trailingActive={activeAccount.trailingActive}
            trailingPeak={activeAccount.trailingPeak}
            ddReached10={activeAccount.ddReached10}
            ddReached20={activeAccount.ddReached20}
          />


        </div>

        {/* 4. Active Baskets (por moeda) */}
        <ActiveBaskets trades={trades} brlRate={brlRate} currencyMode={currencyMode} balance={activeAccount.balance} />

        {/* 5. Trades Table & Controls */}
        <div className={styles.mainGrid}>
          <TradesTable trades={trades} currencyMode={currencyMode} brlRate={brlRate} />
          <Controls
            status={activeAccount.status}
            activeSymbols={activeSymbols}
            pendingCommandsCount={pendingCommandsCount}
            onSendCommand={handleSendCommand}
          />
        </div>

        {/* 6. Rodapé */}
        <footer className={styles.footerSection} style={{ marginTop: "1.5rem" }}>
          <span>Orion Hedge Sistema Web v1.0.0</span>
          <span>Sincronização Ativa • MetaTrader 5</span>
        </footer>
      </div>
    </div>
  );
}
