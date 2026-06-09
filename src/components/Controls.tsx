"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, AlertOctagon, RefreshCw, Layers, ChevronDown, ChevronUp } from "lucide-react";
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
  const [confirmPanicLocal, setConfirmPanicLocal] = useState<string | null>(null);
  const [isLocalPanicCollapsed, setIsLocalPanicCollapsed] = useState(true);

  // Global Panic timer
  useEffect(() => {
    if (confirmPanicGlobal) {
      const timer = setTimeout(() => setConfirmPanicGlobal(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmPanicGlobal]);

  // Local Panic timer
  useEffect(() => {
    if (confirmPanicLocal) {
      const timer = setTimeout(() => setConfirmPanicLocal(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmPanicLocal]);

  const handlePauseResume = async () => {
    const cmd = status === "PAUSED" ? "RESUME" : "PAUSE";
    setLoading(cmd);
    await onSendCommand(cmd);
    setLoading(null);
  };

  const handlePanicGlobal = async () => {
    if (!confirmPanicGlobal) {
      setConfirmPanicGlobal(true);
      return;
    }
    setLoading("PANIC_GLOBAL");
    await onSendCommand("PANIC_GLOBAL");
    setConfirmPanicGlobal(false);
    setLoading(null);
  };

  const handlePanicLocal = async (symbol: string) => {
    if (confirmPanicLocal !== symbol) {
      setConfirmPanicLocal(symbol);
      return;
    }
    setLoading(`PANIC_LOCAL_${symbol}`);
    await onSendCommand("PANIC_LOCAL", symbol);
    setConfirmPanicLocal(null);
    setLoading(null);
  };

  const isPaused = status === "PAUSED";

  return (
    <div className={styles.controlsCard}>
      <h3 className={styles.cardTitle}>
        <AlertOctagon size={20} className={styles.logoAccent} />
        Painel de Controle
      </h3>

      {/* Connection / Queue Status */}
      <div className={styles.controlStatusMessage}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span>Status do Robô:</span>
          <span
            className="badge"
            style={{
              backgroundColor: isPaused ? "rgba(255, 23, 68, 0.15)" : "rgba(0, 230, 118, 0.15)",
              color: isPaused ? "var(--neon-red)" : "var(--neon-green)",
              borderColor: isPaused ? "rgba(255, 23, 68, 0.3)" : "rgba(0, 230, 118, 0.3)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {isPaused ? "PAUSADO" : "EXECUTANDO"}
          </span>
        </div>
        {pendingCommandsCount > 0 && (
          <div style={{ fontSize: "0.75rem", color: "var(--neon-amber)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
            <RefreshCw size={12} className="spin" /> {pendingCommandsCount} comando(s) aguardando sincronização...
          </div>
        )}
      </div>

      {/* Pause/Resume Group */}
      <div className={styles.controlGroup}>
        <span className={styles.controlGroupTitle}>Fluxo de Operações</span>
        <button
          className={`btn ${isPaused ? "btn-primary" : "btn-secondary"}`}
          onClick={handlePauseResume}
          disabled={loading !== null}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading === "PAUSE" || loading === "RESUME" ? (
            <RefreshCw className="spin" size={16} />
          ) : isPaused ? (
            <>
              <Play size={16} /> Retomar Robô
            </>
          ) : (
            <>
              <Pause size={16} /> Pausar Robô
            </>
          )}
        </button>
      </div>

      {/* Global Panic Group */}
      <div className={styles.controlGroup}>
        <span className={styles.controlGroupTitle}>Pânico de Emergência</span>
        <button
          className={`btn btn-danger`}
          onClick={handlePanicGlobal}
          disabled={loading !== null}
          style={{
            width: "100%",
            justifyContent: "center",
            background: confirmPanicGlobal ? "var(--neon-red)" : "rgba(255, 23, 68, 0.15)",
            color: confirmPanicGlobal ? "#fff" : "var(--neon-red)",
            border: "1px solid var(--neon-red)",
          }}
        >
          {loading === "PANIC_GLOBAL" ? (
            <RefreshCw className="spin" size={16} />
          ) : confirmPanicGlobal ? (
            "CLIQUE PARA CONFIRMAR ZERAR TUDO!"
          ) : (
            <>
              <AlertOctagon size={16} /> ZERAR TUDO (GLOBAL)
            </>
          )}
        </button>
      </div>

      {/* Local Panic Group */}
      {activeSymbols.length > 0 && (
        <div className={styles.controlGroup}>
          <div 
            className={styles.collapsibleHeader}
            onClick={() => setIsLocalPanicCollapsed(!isLocalPanicCollapsed)}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={styles.controlGroupTitle}>Pânico Local por Ativo</span>
              <span className={styles.badgeCount}>{activeSymbols.length}</span>
            </div>
            <span className={styles.collapseIcon}>
              {isLocalPanicCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
          </div>

          {!isLocalPanicCollapsed && (
            <div className={styles.controlButtons}>
              {activeSymbols.map((symbol) => {
                const isConfirming = confirmPanicLocal === symbol;
                return (
                  <button
                    key={symbol}
                    className="btn btn-secondary"
                    onClick={() => handlePanicLocal(symbol)}
                    disabled={loading !== null}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      borderColor: isConfirming ? "var(--neon-amber)" : "var(--border-light)",
                      color: isConfirming ? "var(--neon-amber)" : "var(--text-primary)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Layers size={14} />
                      {symbol}
                    </span>
                    <span>
                      {loading === `PANIC_LOCAL_${symbol}` ? (
                        <RefreshCw className="spin" size={12} />
                      ) : isConfirming ? (
                        "Confirmar?"
                      ) : (
                        "Zerar Par"
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
