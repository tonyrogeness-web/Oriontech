"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Zap, XCircle, RefreshCw } from "lucide-react";
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
  const [actionStatus, setActionStatus] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});
  const [confirmZerarGlobal, setConfirmZerarGlobal] = useState(false);
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

  // Zerar Global timer
  useEffect(() => {
    if (confirmZerarGlobal) {
      const timer = setTimeout(() => setConfirmZerarGlobal(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmZerarGlobal]);

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
    setActionStatus(prev => ({ ...prev, PAUSE: "sending" }));
    try {
      await onSendCommand("PAUSE");
      setActionStatus(prev => ({ ...prev, PAUSE: "success" }));
      trackCommand("Pausar Novas Entradas");
      setTimeout(() => setActionStatus(prev => ({ ...prev, PAUSE: "idle" })), 2000);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, PAUSE: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, PAUSE: "idle" })), 2500);
    }
  };

  const handleResume = async () => {
    setActionStatus(prev => ({ ...prev, RESUME: "sending" }));
    try {
      await onSendCommand("RESUME");
      setActionStatus(prev => ({ ...prev, RESUME: "success" }));
      trackCommand("Retomar Operações");
      setTimeout(() => setActionStatus(prev => ({ ...prev, RESUME: "idle" })), 2000);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, RESUME: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, RESUME: "idle" })), 2500);
    }
  };

  const handleZerarGlobal = async () => {
    if (!confirmZerarGlobal) {
      setConfirmZerarGlobal(true);
      return;
    }
    setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "sending" }));
    try {
      await onSendCommand("PANIC_GLOBAL");
      await onSendCommand("PAUSE");
      setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "success" }));
      trackCommand("Zerar Global + Pausar Robô");
      setConfirmZerarGlobal(false);
      setTimeout(() => setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "idle" })), 2000);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "idle" })), 2500);
    }
  };

  const handlePanicLocal = async (symbol: string) => {
    if (confirmLocalSymbol !== symbol) {
      setConfirmLocalSymbol(symbol);
      return;
    }
    const actionId = `PANIC_LOCAL_${symbol}`;
    setActionStatus(prev => ({ ...prev, [actionId]: "sending" }));
    try {
      await onSendCommand("PANIC_LOCAL", symbol);
      setActionStatus(prev => ({ ...prev, [actionId]: "success" }));
      trackCommand(`Zerar Local (${symbol.toUpperCase().replace("C", "")})`);
      setConfirmLocalSymbol(null);
      setShowLocalSelector(false);
      setTimeout(() => setActionStatus(prev => ({ ...prev, [actionId]: "idle" })), 2000);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, [actionId]: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [actionId]: "idle" })), 2500);
    }
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
            className={`${styles.btnControlMockup} ${styles.btnControlPause} ${
              actionStatus.PAUSE === "success" ? styles.btnSuccessGlow : 
              actionStatus.PAUSE === "error" ? styles.btnErrorGlow : ""
            }`}
            onClick={handlePause}
            disabled={actionStatus.PAUSE === "sending" || actionStatus.PAUSE === "success" || actionStatus.PAUSE === "error" || isPaused}
            title="Pausar todas as novas entradas"
          >
            {actionStatus.PAUSE === "sending" && <><RefreshCw className="spin" size={14} /> Enviando...</>}
            {actionStatus.PAUSE === "success" && <>✓ Pausado</>}
            {actionStatus.PAUSE === "error" && <>✕ Falhou</>}
            {(!actionStatus.PAUSE || actionStatus.PAUSE === "idle") && (
              <>
                <Pause size={14} /> Pausar
              </>
            )}
          </button>

          {/* Button 2: Retomar */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlResume} ${
              actionStatus.RESUME === "success" ? styles.btnSuccessGlow : 
              actionStatus.RESUME === "error" ? styles.btnErrorGlow : ""
            }`}
            onClick={handleResume}
            disabled={actionStatus.RESUME === "sending" || actionStatus.RESUME === "success" || actionStatus.RESUME === "error" || !isPaused}
            title="Retomar operações normais"
          >
            {actionStatus.RESUME === "sending" && <><RefreshCw className="spin" size={14} /> Enviando...</>}
            {actionStatus.RESUME === "success" && <>✓ Ativo</>}
            {actionStatus.RESUME === "error" && <>✕ Falhou</>}
            {(!actionStatus.RESUME || actionStatus.RESUME === "idle") && (
              <>
                <Play size={14} /> Retomar
              </>
            )}
          </button>

          {/* Button 3: Zerar Local */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlZerar}`}
            onClick={() => setShowLocalSelector(!showLocalSelector)}
            disabled={actionStatus.PANIC_LOCAL === "sending" || activeSymbols.length === 0}
            title="Zerar posições de um ativo específico"
          >
            <Zap size={14} /> Zerar Local
          </button>

          {/* Button 4: Zerar Global */}
          <button
            className={`${styles.btnControlMockup} ${styles.btnControlPanic} ${
              actionStatus.PANIC_GLOBAL === "success" ? styles.btnSuccessGlow : 
              actionStatus.PANIC_GLOBAL === "error" ? styles.btnErrorGlow : ""
            }`}
            onClick={handleZerarGlobal}
            disabled={actionStatus.PANIC_GLOBAL === "sending" || actionStatus.PANIC_GLOBAL === "success" || actionStatus.PANIC_GLOBAL === "error"}
            style={{
              backgroundColor: confirmZerarGlobal ? "var(--neon-red)" : actionStatus.PANIC_GLOBAL === "error" ? "rgba(210,68,68,0.2)" : "rgba(255, 23, 68, 0.05)",
              color: confirmZerarGlobal || actionStatus.PANIC_GLOBAL === "error" ? "#fff" : "var(--neon-red)",
            }}
            title="Zerar todas as posições e pausar o robô imediatamente"
          >
            {actionStatus.PANIC_GLOBAL === "sending" && <><RefreshCw className="spin" size={14} /> Zerando...</>}
            {actionStatus.PANIC_GLOBAL === "success" && <>✓ Zerado</>}
            {actionStatus.PANIC_GLOBAL === "error" && <>✕ Falhou</>}
            {(!actionStatus.PANIC_GLOBAL || actionStatus.PANIC_GLOBAL === "idle") && (
              confirmZerarGlobal ? (
                "⚠ CONFIRMAR?"
              ) : (
                <>
                  <XCircle size={14} /> Zerar Global
                </>
              )
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
                const actionId = `PANIC_LOCAL_${symbol}`;
                const isConfirming = confirmLocalSymbol === symbol;
                return (
                  <button
                    key={symbol}
                    className="btn btn-secondary"
                    onClick={() => handlePanicLocal(symbol)}
                    disabled={actionStatus[actionId] === "sending" || actionStatus[actionId] === "success" || actionStatus[actionId] === "error"}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      borderColor: actionStatus[actionId] === "success" ? "var(--neon-green)" : actionStatus[actionId] === "error" ? "var(--neon-red)" : isConfirming ? "var(--neon-amber)" : "var(--border-light)",
                      color: actionStatus[actionId] === "success" ? "var(--neon-green)" : actionStatus[actionId] === "error" ? "var(--neon-red)" : isConfirming ? "var(--neon-amber)" : "var(--text-primary)",
                      padding: "0.35rem 0.6rem",
                    }}
                  >
                    <span>{symbol.toUpperCase().replace("C", "")}</span>
                    <span>
                      {actionStatus[actionId] === "sending" && (
                        <RefreshCw className="spin" size={10} />
                      )}
                      {actionStatus[actionId] === "success" && "✓ Zerado"}
                      {actionStatus[actionId] === "error" && "✕ Falhou"}
                      {(!actionStatus[actionId] || actionStatus[actionId] === "idle") && (
                        isConfirming ? "Confirmar Fechar?" : "Zerar Par"
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
          <span>Zerar Global fecha tudo + pausa o robô</span>
        </div>
      </div>
    </div>
  );
}
