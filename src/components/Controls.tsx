"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Zap, Skull, RefreshCw } from "lucide-react";
import styles from "./components.module.css";

interface ControlsProps {
  status: string;
  activeSymbols: string[];
  pendingCommandsCount: number;
  onSendCommand: (command: string, symbol?: string) => Promise<void>;
}

export default function Controls({
  status = "RUNNING",
  activeSymbols = [],
  pendingCommandsCount = 0,
  onSendCommand,
}: ControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmPanicGlobal, setConfirmPanicGlobal] = useState(false);
  const [showLocalSelector, setShowLocalSelector] = useState(false);
  const [confirmLocalSymbol, setConfirmLocalSymbol] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  // Load last executed command on mount
  useEffect(() => {
    const saved = localStorage.getItem("orion_last_command");
    if (saved) {
      setLastCommand(saved);
    }
  }, []);

  // Global Panic timer
  useEffect(() => {
    if (confirmPanicGlobal) {
      const timer = setTimeout(() => setConfirmPanicGlobal(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmPanicGlobal]);

  // Local Panic timer
  useEffect(() => {
    if (confirmLocalSymbol) {
      const timer = setTimeout(() => setConfirmLocalSymbol(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmLocalSymbol]);

  const trackCommand = (cmdName: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const logStr = `✓ Último: ${cmdName} às ${timeStr}`;
    setLastCommand(logStr);
    localStorage.setItem("orion_last_command", logStr);
  };

  const handlePause = async () => {
    setLoading("PAUSE");
    await onSendCommand("PAUSE");
    trackCommand("Pausar Novas Entradas");
    setLoading(null);
  };

  const handleResume = async () => {
    setLoading("RESUME");
    await onSendCommand("RESUME");
    trackCommand("Retomar Operações");
    setLoading(null);
  };

  const handlePanicGlobal = async () => {
    if (!confirmPanicGlobal) {
      setConfirmPanicGlobal(true);
      return;
    }
    setLoading("PANIC_GLOBAL");
    await onSendCommand("PANIC_GLOBAL");
    trackCommand("Pânico Global");
    setConfirmPanicGlobal(false);
    setLoading(null);
  };

  const handlePanicLocal = async (symbol: string) => {
    if (confirmLocalSymbol !== symbol) {
      setConfirmLocalSymbol(symbol);
      return;
    }
    setLoading(`PANIC_LOCAL_${symbol}`);
    await onSendCommand("PANIC_LOCAL", symbol);
    trackCommand(`Zerar Local (${symbol.toUpperCase().replace("C", "")})`);
    setConfirmLocalSymbol(null);
    setShowLocalSelector(false);
    setLoading(null);
  };

  const isPaused = status === "PAUSED";

  return (
    <div className={styles.controlsCard} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", margin: 0 }}>
            Controles do Robô
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span className={isPaused ? styles.controlStatusDotPaused : styles.controlStatusDotActive} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isPaused ? "var(--neon-red)" : "var(--neon-green)", textTransform: "uppercase" }}>
              {isPaused ? "PAUSADO" : "EXECUTANDO"}
            </span>
          </div>
        </div>

        {pendingCommandsCount > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--neon-amber)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <RefreshCw size={11} className="spin" /> {pendingCommandsCount} comando(s) pendente(s)...
            </div>
            <div className={styles.pendingProgressBarOuter}>
              <div className={styles.pendingProgressBarInner} />
            </div>
          </div>
        )}

        {/* 2x2 Grid of Actions */}
        <div className={styles.controlsGrid2x2}>
          {/* Button 1: Pausar */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlPause}`}
            onClick={handlePause}
            disabled={loading !== null || isPaused}
            title="Pausar todas as novas entradas"
          >
            {loading === "PAUSE" ? (
              <RefreshCw className="spin" size={14} />
            ) : (
              <>
                <Pause size={14} /> Pausar
              </>
            )}
          </button>

          {/* Button 2: Retomar */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlResume}`}
            onClick={handleResume}
            disabled={loading !== null || !isPaused}
            title="Retomar operações normais"
          >
            {loading === "RESUME" ? (
              <RefreshCw className="spin" size={14} />
            ) : (
              <>
                <Play size={14} /> Retomar
              </>
            )}
          </button>

          {/* Button 3: Zerar Local */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlZerar}`}
            onClick={() => setShowLocalSelector(!showLocalSelector)}
            disabled={loading !== null || activeSymbols.length === 0}
            title="Zerar posições de um ativo específico"
          >
            <Zap size={14} /> Zerar Local
          </button>

          {/* Button 4: Pânico Global */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlPanic}`}
            onClick={handlePanicGlobal}
            disabled={loading !== null}
            style={{
              backgroundColor: confirmPanicGlobal ? "var(--neon-red)" : "rgba(255, 23, 68, 0.05)",
              color: confirmPanicGlobal ? "#fff" : "var(--neon-red)",
            }}
            title="Fechar todas as ordens abertas da conta imediatamente"
          >
            {loading === "PANIC_GLOBAL" ? (
              <RefreshCw className="spin" size={14} />
            ) : confirmPanicGlobal ? (
              "CONFIRMAR?"
            ) : (
              <>
                <Skull size={14} /> Pânico Global
              </>
            )}
          </button>
        </div>

        {/* Expandable active symbols list selector for "Zerar Local" */}
        {showLocalSelector && activeSymbols.length > 0 && (
          <div style={{
            marginTop: "1rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-light)",
            borderRadius: "8px",
            padding: "0.5rem",
          }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", textTransform: "uppercase" }}>
              Selecione o Par para fechar:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {activeSymbols.map((symbol) => {
                const isConfirming = confirmLocalSymbol === symbol;
                return (
                  <button
                    key={symbol}
                    className="btn btn-secondary"
                    onClick={() => handlePanicLocal(symbol)}
                    disabled={loading !== null}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      borderColor: isConfirming ? "var(--neon-amber)" : "var(--border-light)",
                      color: isConfirming ? "var(--neon-amber)" : "var(--text-primary)",
                      padding: "0.35rem 0.6rem",
                    }}
                  >
                    <span>{symbol.toUpperCase().replace("C", "")}</span>
                    <span>
                      {loading === `PANIC_LOCAL_${symbol}` ? (
                        <RefreshCw className="spin" size={10} />
                      ) : isConfirming ? (
                        "Confirmar Fechar?"
                      ) : (
                        "Zerar Par"
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.03)", paddingTop: "0.5rem" }}>
        {lastCommand && (
          <span style={{ fontSize: "0.68rem", color: "var(--neon-gold)", fontWeight: 700, letterSpacing: "0.02em" }}>
            {lastCommand}
          </span>
        )}
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
          <span>Sincronizado via MetaTrader 5</span>
          <span>Ações seguras com dupla confirmação</span>
        </div>
      </div>
    </div>
  );
}
