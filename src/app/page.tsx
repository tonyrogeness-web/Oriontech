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

// ═══════════════════════════════════════════════════════════════════════════
// REGRA DE CONVERSÃO USC ↔ BRL — ÚNICA FONTE DE VERDADE DO FRONTEND
//
// Conta cent (USC): 1 USC = 0.01 USD
// Conversão: BRL = (USC / 100) * brlRate
//
// Exemplo prático:
//   Saldo: 93.934,23 USC
//   brlRate: 5.88
//   Em USD: 93.934,23 / 100 = 939,34 USD
//   Em BRL: 939,34 * 5,88 = R$ 5.523,27
//
// Todos os valores do banco chegam em USC.
// Nenhum componente deve dividir por 100 internamente — isso é feito
// apenas na função de formatação, garantindo que USC e BRL mostrem
// exatamente o mesmo valor relativo.
// ═══════════════════════════════════════════════════════════════════════════

// Token de segurança recuperado dinamicamente no lado do cliente (Bug #1)
const getApiToken = (): string => {
  if (typeof window === "undefined") return "";
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");
  if (tokenFromUrl) {
    localStorage.setItem("orion_api_token", tokenFromUrl);
    return tokenFromUrl;
  }
  return localStorage.getItem("orion_api_token") || "";
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [brlRate, setBrlRate] = useState(5.45);
  const [currencyMode, setCurrencyMode] = useState<"CENT" | "BRL">("BRL");

  const [syncProgress, setSyncProgress] = useState(0);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(1);
  const [loadingPhase, setLoadingPhase] = useState("Conectando ao servidor...");
  const [hasFetchedFallback, setHasFetchedFallback] = useState(false);

  // Restaura preferência de moeda do usuário
  useEffect(() => {
    const saved = localStorage.getItem("orion_currency_mode");
    if (saved === "CENT" || saved === "BRL") setCurrencyMode(saved);
  }, []);

  const handleCurrencyModeChange = (mode: "CENT" | "BRL") => {
    setCurrencyMode(mode);
    localStorage.setItem("orion_currency_mode", mode);
  };

  // Taxa BRL: vem do robô (já calcula a taxa real via AwesomeAPI ou USDBRL do broker).
  // Fallback para APIs públicas apenas se o robô não enviou nada ainda.
  useEffect(() => {
    const activeAcc = data?.accounts?.[0];
    if (activeAcc?.brlRate && activeAcc.brlRate > 0) {
      setBrlRate(activeAcc.brlRate);
      return;
    }

    if (data && !hasFetchedFallback) {
      setHasFetchedFallback(true);
      const fetchBrlRate = async () => {
        try {
          const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
          if (res.ok) {
            const json = await res.json();
            const val = parseFloat(json?.USDBRL?.bid);
            if (!isNaN(val) && val > 0) { setBrlRate(val); return; }
          }
        } catch {}
        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          if (res.ok) {
            const json = await res.json();
            const val = parseFloat(json?.rates?.BRL);
            if (!isNaN(val) && val > 0) setBrlRate(val);
          }
        } catch (e) {
          console.error("Falha ao buscar taxa BRL:", e);
        }
      };
      fetchBrlRate();
    }
  }, [data, hasFetchedFallback]);

  // Polling a cada 5 segundos
  useEffect(() => {
    let active = true;
    let elapsed = 0;
    const totalTime = 5000;
    const step = 100;

    async function fetchData() {
      try {
        if (!data) {
          const phases = [
            "Conectando ao servidor...",
            "Autenticando sessão...",
            "Carregando base de dados...",
            "Verificando conexão com MT5...",
            "Sincronizando estatísticas...",
          ];
          setLoadingPhase(phases[Math.min(loadingAttempts - 1, phases.length - 1)]);
        }

        const response = await fetch("/api/dashboard/data", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar dados do servidor.");

        const json = await response.json();
        if (active) {
          setData(json);
          setError(null);
          setLoadingAttempts(1);
          setIsFlashActive(true);
          setTimeout(() => { if (active) setIsFlashActive(false); }, 600);
        }
      } catch (err: any) {
        if (active) {
          if (!data && loadingAttempts < 5) {
            setLoadingAttempts((prev) => prev + 1);
            setTimeout(() => { if (active) setRefreshTrigger((p) => p + 1); }, 1500);
          } else {
            setError(err.message || "Sem sinal do servidor após 5 tentativas.");
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
      if (active) setSyncProgress((elapsed / totalTime) * 100);
    }, step);

    return () => { active = false; clearInterval(interval); };
  }, [refreshTrigger]);

  // Envia comando ao robô com autenticação
  const handleSendCommand = async (command: string, symbol: string = "") => {
    if (!data?.accounts?.length) return;
    const activeAccount = data.accounts[0].account;

    const token = getApiToken();
    if (!token) {
      alert("Erro: Token de segurança não configurado. Por favor, acesse o painel com o parâmetro ?token=seu_token na URL para se autenticar e poder enviar comandos.");
      return;
    }

    try {
      const response = await fetch("/api/dashboard/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: activeAccount,
          command,
          symbol,
          token: token,
        }),
      });

      if (!response.ok) throw new Error("Erro ao enviar comando.");
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

  const accounts = data?.accounts || [];
  const activeAccount = accounts[0] || {
    account: "Carregando...",
    balance: 0, equity: 0, dailyProfit: 0, floatingPl: 0,
    totalProfit: 0, maxDrawdown: 0, status: "RUNNING", lastUpdated: "",
    reserveFund: 0,
    reserveCapPct: 2.0,
    sgScore: 100.0,
    sgScoreMin: 40.0,
    sgDistMultipl: 1.0,
    sgLoteFator: 1.0,
    sgBloqueado: false,
  };

  const trades = data?.trades || [];
  const history = data?.history || [];
  const pendingCommandsCount = data?.pendingCommandsCount || 0;
  const activeSymbols = Array.from(new Set(trades.map((t: any) => t.symbol))) as string[];
  const dynamicSoftStopLimit = activeAccount.softStopLimit || 400.0;

  return (
    <div className={isFlashActive ? styles.syncFlash : ""}>
      {/* Barra de progresso de sincronização */}
      <div className={styles.syncProgressBarOuter}>
        <div className={styles.syncProgressBarInner} style={{ width: `${syncProgress}%` }} />
      </div>

      <div className="dashboard-container">
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
          newsFrozen={activeAccount.newsFrozen}
          trailingActive={activeAccount.trailingActive}
          trailingPeak={activeAccount.trailingPeak}
        />

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
          trailingActive={activeAccount.trailingActive}
          trailingPeak={activeAccount.trailingPeak}
          ddReached10={activeAccount.ddReached10}
          ddReached20={activeAccount.ddReached20}
          equityCycleBase={activeAccount.equityCycleBase}
          equityCycleTargetPct={activeAccount.equityCycleTargetPct}
          reserveFund={activeAccount.reserveFund || 0}
          reserveCutsCount={activeAccount.reserveCutsCount || 0}
          reserveCutsGasto={activeAccount.reserveCutsGasto || 0.0}
          reserveCapPct={activeAccount.reserveCapPct || 2.0}
          sgScore={activeAccount.sgScore !== undefined ? activeAccount.sgScore : 100.0}
          sgScoreMin={activeAccount.sgScoreMin !== undefined ? activeAccount.sgScoreMin : 40.0}
          sgDistMultipl={activeAccount.sgDistMultipl !== undefined ? activeAccount.sgDistMultipl : 1.0}
          sgLoteFator={activeAccount.sgLoteFator !== undefined ? activeAccount.sgLoteFator : 1.0}
          sgBloqueado={activeAccount.sgBloqueado !== undefined ? activeAccount.sgBloqueado : false}
        />

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
            trades={trades}
          />
        </div>

        <ActiveBaskets
          trades={trades}
          brlRate={brlRate}
          currencyMode={currencyMode}
          balance={activeAccount.balance}
          loteBase={activeAccount.loteBase}
          takeProfitLimit={activeAccount.takeProfitLimit}
          buySosScheduled={activeAccount.buySosScheduled}
          sellSosScheduled={activeAccount.sellSosScheduled}
        />

        <div className={styles.mainGrid}>
          <TradesTable trades={trades} currencyMode={currencyMode} brlRate={brlRate} />
          <Controls
            status={activeAccount.status}
            activeSymbols={activeSymbols}
            pendingCommandsCount={pendingCommandsCount}
            onSendCommand={handleSendCommand}
          />
        </div>

        <footer className={styles.footerSection} style={{ marginTop: "1.5rem" }}>
          <span>Orion Hedge Sistema Web v1.1.0</span>
          <span>Sincronização Ativa • MetaTrader 5</span>
        </footer>
      </div>
    </div>
  );
}
