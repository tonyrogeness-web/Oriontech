"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import KpiCards from "@/components/KpiCards";
import Charts from "@/components/Charts";
import RiskManagement from "@/components/RiskManagement";
import ActiveBaskets from "@/components/ActiveBaskets";
import TradesTable from "@/components/TradesTable";
import Controls from "@/components/Controls";
import styles from "@/components/components.module.css";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [brlRate, setBrlRate] = useState(5.45);

  // Fetch USD/BRL rate on mount
  useEffect(() => {
    async function fetchBrlRate() {
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
    }

    fetchBrlRate();
  }, []);

  // Poll database every 5 seconds for real-time update feel
  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/data", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao carregar dados do servidor.");
        }
        const json = await response.json();
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message);
        }
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);

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
          <button className="btn btn-secondary" onClick={() => setRefreshTrigger((p) => p + 1)}>
            Tentar Novamente
          </button>
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

  return (
    <div className="dashboard-container">
      {/* 1. Header component */}
      <Header
        accountNumber={activeAccount.account}
        status={activeAccount.status}
        isMock={data?.isMock}
        brlRate={brlRate}
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
      />

      {/* 3. Chart & Risk Management */}
      <div className={styles.mainGrid} style={{ marginBottom: "1.25rem" }}>
        <Charts history={history} />
        <RiskManagement
          floatingPl={activeAccount.floatingPl}
          maxDrawdown={activeAccount.maxDrawdown}
          tradesCount={trades.length}
          softStopLimit={400.0}
          balance={activeAccount.balance}
        />
      </div>

      {/* 4. Active Baskets (por moeda) */}
      <ActiveBaskets trades={trades} brlRate={brlRate} />

      {/* 5. Trades Table & Controls */}
      <div className={styles.mainGrid}>
        <TradesTable trades={trades} />
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
  );
}
