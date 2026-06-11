"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Play, Pause, Zap, XCircle, RefreshCw, Lock, Delete } from "lucide-react";
import styles from "./components.module.css";

const CORRECT_PIN = "4141";
const PIN_SESSION_MS = 3 * 60 * 1000; // 3 minutes of unlocked session

interface ControlsProps {
  status: string;
  activeSymbols: string[];
  pendingCommandsCount: number;
  onSendCommand: (command: string, symbol?: string) => Promise<void>;
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────
function PinModal({
  onSuccess,
  onCancel,
  actionLabel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  actionLabel: string;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const handleDigit = useCallback(
    (d: string) => {
      if (digits.length >= 4) return;
      const next = [...digits, d];
      setDigits(next);

      if (next.length === 4) {
        const pin = next.join("");
        if (pin === CORRECT_PIN) {
          setTimeout(() => onSuccess(), 300);
        } else {
          setShake(true);
          setWrongAttempt(true);
          setTimeout(() => {
            setDigits([]);
            setShake(false);
            setWrongAttempt(false);
          }, 700);
        }
      }
    },
    [digits, onSuccess]
  );

  const handleDelete = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    /* Overlay */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Card */}
      <div
        style={{
          background: "var(--bg-panel-solid)",
          border: "1px solid var(--border-light)",
          borderRadius: "20px",
          padding: "2rem 1.75rem",
          width: "min(320px, 90vw)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(129,140,248,0.15)",
            border: "1px solid rgba(129,140,248,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 0.75rem",
          }}>
            <Lock size={22} color="#818cf8" />
          </div>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Confirmação de Segurança
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>
            Digite o PIN para: <strong style={{ color: "var(--neon-gold)" }}>{actionLabel}</strong>
          </p>
        </div>

        {/* Dots indicator */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            animation: shake ? "shake 0.35s ease" : "none",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: `2px solid ${wrongAttempt ? "var(--neon-red)" : "rgba(129,140,248,0.5)"}`,
                background:
                  digits.length > i
                    ? wrongAttempt
                      ? "var(--neon-red)"
                      : "#818cf8"
                    : "transparent",
                transition: "background 0.15s, border-color 0.15s",
                boxShadow: digits.length > i && !wrongAttempt
                  ? "0 0 8px rgba(129,140,248,0.6)"
                  : "none",
              }}
            />
          ))}
        </div>

        {wrongAttempt && (
          <p style={{ fontSize: "0.7rem", color: "var(--neon-red)", fontWeight: 700, margin: "-0.5rem 0 -0.5rem" }}>
            PIN incorreto. Tente novamente.
          </p>
        )}

        {/* Keypad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.6rem",
            width: "100%",
          }}
        >
          {keys.map((k, idx) => {
            if (k === "") {
              return <div key={idx} />;
            }
            const isDelete = k === "⌫";
            return (
              <button
                key={idx}
                onClick={() => (isDelete ? handleDelete() : handleDigit(k))}
                style={{
                  height: "52px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-light)",
                  background: isDelete
                    ? "rgba(210,68,68,0.1)"
                    : "var(--opacity-bg-hover)",
                  color: isDelete ? "var(--neon-red)" : "var(--text-primary)",
                  fontSize: isDelete ? "1rem" : "1.25rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)";
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }}
              >
                {isDelete ? <Delete size={18} /> : k}
              </button>
            );
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            width: "100%",
            padding: "0.6rem",
            borderRadius: "10px",
            border: "1px solid var(--border-light)",
            background: "var(--opacity-bg-soft)",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main Controls ─────────────────────────────────────────────────────────────
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

  // PIN state
  const [pinUnlockedUntil, setPinUnlockedUntil] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<null | { label: string; fn: () => Promise<void> }>(null);

  const isUnlocked = pinUnlockedUntil !== null && Date.now() < pinUnlockedUntil;

  // Load last command
  useEffect(() => {
    const saved = localStorage.getItem("orion_last_command");
    if (saved) setLastCommand(saved);
  }, []);

  // Zerar Global timer
  useEffect(() => {
    if (confirmZerarGlobal) {
      const t = setTimeout(() => setConfirmZerarGlobal(false), 4000);
      return () => clearTimeout(t);
    }
  }, [confirmZerarGlobal]);

  // Local Panic timer
  useEffect(() => {
    if (confirmLocalSymbol) {
      const t = setTimeout(() => setConfirmLocalSymbol(null), 4000);
      return () => clearTimeout(t);
    }
  }, [confirmLocalSymbol]);

  const trackCommand = (cmdName: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const logStr = `✓ Último: ${cmdName} às ${timeStr}`;
    setLastCommand(logStr);
    localStorage.setItem("orion_last_command", logStr);
  };

  /** Wrap any action behind PIN gate */
  const withPin = (label: string, fn: () => Promise<void>) => {
    if (isUnlocked) {
      fn();
    } else {
      setPendingAction({ label, fn });
    }
  };

  const handlePinSuccess = async () => {
    // Grant 3-min session
    setPinUnlockedUntil(Date.now() + PIN_SESSION_MS);
    const action = pendingAction;
    setPendingAction(null);
    if (action) await action.fn();
  };

  const handlePinCancel = () => {
    setPendingAction(null);
  };

  // ── Action handlers ──────────────────────────────────────────────────────────

  const execPause = async () => {
    setActionStatus(prev => ({ ...prev, PAUSE: "sending" }));
    try {
      await onSendCommand("PAUSE");
      setActionStatus(prev => ({ ...prev, PAUSE: "success" }));
      trackCommand("Pausar Novas Entradas");
      setTimeout(() => setActionStatus(prev => ({ ...prev, PAUSE: "idle" })), 2000);
    } catch {
      setActionStatus(prev => ({ ...prev, PAUSE: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, PAUSE: "idle" })), 2500);
    }
  };

  const execResume = async () => {
    setActionStatus(prev => ({ ...prev, RESUME: "sending" }));
    try {
      await onSendCommand("RESUME");
      setActionStatus(prev => ({ ...prev, RESUME: "success" }));
      trackCommand("Retomar Operações");
      setTimeout(() => setActionStatus(prev => ({ ...prev, RESUME: "idle" })), 2000);
    } catch {
      setActionStatus(prev => ({ ...prev, RESUME: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, RESUME: "idle" })), 2500);
    }
  };

  const execZerarGlobal = async () => {
    setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "sending" }));
    try {
      await onSendCommand("PANIC_GLOBAL");
      await onSendCommand("PAUSE");
      setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "success" }));
      trackCommand("Zerar Global + Pausar Robô");
      setConfirmZerarGlobal(false);
      setTimeout(() => setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "idle" })), 2000);
    } catch {
      setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, PANIC_GLOBAL: "idle" })), 2500);
    }
  };

  const execPanicLocal = async (symbol: string) => {
    const actionId = `PANIC_LOCAL_${symbol}`;
    setActionStatus(prev => ({ ...prev, [actionId]: "sending" }));
    try {
      await onSendCommand("PANIC_LOCAL", symbol);
      setActionStatus(prev => ({ ...prev, [actionId]: "success" }));
      trackCommand(`Zerar Local (${symbol.toUpperCase().replace("C", "")})`);
      setConfirmLocalSymbol(null);
      setShowLocalSelector(false);
      setTimeout(() => setActionStatus(prev => ({ ...prev, [actionId]: "idle" })), 2000);
    } catch {
      setActionStatus(prev => ({ ...prev, [actionId]: "error" }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [actionId]: "idle" })), 2500);
    }
  };

  const isPaused = status === "PAUSED";

  // Remaining session time display
  const sessionSecondsLeft = pinUnlockedUntil
    ? Math.max(0, Math.floor((pinUnlockedUntil - Date.now()) / 1000))
    : 0;

  return (
    <>
      {/* PIN Modal overlay */}
      {pendingAction && (
        <PinModal
          actionLabel={pendingAction.label}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}

      <div className={styles.controlsCard} style={{ display: "flex", flexDirection: "column", height: "fit-content", justifyContent: "space-between" }}>
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 className={styles.cardTitle} style={{ textTransform: "none", fontSize: "1.1rem", margin: 0 }}>
              Controles do Robô
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Lock / unlock indicator */}
              <div
                title={isUnlocked ? `Sessão ativa (${sessionSecondsLeft}s restantes)` : "Bloqueado — PIN necessário"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: isUnlocked ? "var(--neon-green)" : "var(--opacity-text-muted)",
                  border: `1px solid ${isUnlocked ? "rgba(0,230,118,0.25)" : "var(--opacity-border)"}`,
                  borderRadius: "6px",
                  padding: "0.15rem 0.4rem",
                  cursor: "default",
                }}
              >
                <Lock size={9} />
                {isUnlocked ? "DESBLOQUEADO" : "PIN"}
              </div>
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

          {/* 2×2 Grid of Actions */}
          <div className={styles.controlsGrid2x2}>
            {/* Pausar */}
            <button
              className={`${styles.btnControlMockup} ${styles.btnControlPause} ${
                actionStatus.PAUSE === "success" ? styles.btnSuccessGlow :
                actionStatus.PAUSE === "error" ? styles.btnErrorGlow : ""
              }`}
              onClick={() => withPin("Pausar Novas Entradas", execPause)}
              disabled={actionStatus.PAUSE === "sending" || actionStatus.PAUSE === "success" || actionStatus.PAUSE === "error" || isPaused}
              title="Pausar todas as novas entradas"
            >
              {actionStatus.PAUSE === "sending" && <><RefreshCw className="spin" size={14} /> Enviando...</>}
              {actionStatus.PAUSE === "success" && <>✓ Pausado</>}
              {actionStatus.PAUSE === "error" && <>✕ Falhou</>}
              {(!actionStatus.PAUSE || actionStatus.PAUSE === "idle") && (
                <><Pause size={14} /> Pausar</>
              )}
            </button>

            {/* Retomar */}
            <button
              className={`${styles.btnControlMockup} ${styles.btnControlResume} ${
                actionStatus.RESUME === "success" ? styles.btnSuccessGlow :
                actionStatus.RESUME === "error" ? styles.btnErrorGlow : ""
              }`}
              onClick={() => withPin("Retomar Operações", execResume)}
              disabled={actionStatus.RESUME === "sending" || actionStatus.RESUME === "success" || actionStatus.RESUME === "error" || !isPaused}
              title="Retomar operações normais"
            >
              {actionStatus.RESUME === "sending" && <><RefreshCw className="spin" size={14} /> Enviando...</>}
              {actionStatus.RESUME === "success" && <>✓ Ativo</>}
              {actionStatus.RESUME === "error" && <>✕ Falhou</>}
              {(!actionStatus.RESUME || actionStatus.RESUME === "idle") && (
                <><Play size={14} /> Retomar</>
              )}
            </button>

            {/* Zerar Local */}
            <button
              className={`${styles.btnControlMockup} ${styles.btnControlZerar}`}
              onClick={() => withPin("Zerar Posições Locais", async () => setShowLocalSelector(!showLocalSelector))}
              disabled={actionStatus.PANIC_LOCAL === "sending" || activeSymbols.length === 0}
              title="Zerar posições de um ativo específico"
            >
              <Zap size={14} /> Zerar Local
            </button>

            {/* Zerar Global */}
            <button
              className={`${styles.btnControlMockup} ${styles.btnControlPanic} ${
                actionStatus.PANIC_GLOBAL === "success" ? styles.btnSuccessGlow :
                actionStatus.PANIC_GLOBAL === "error" ? styles.btnErrorGlow : ""
              }`}
              onClick={() => {
                if (!confirmZerarGlobal) {
                  withPin("ZERAR GLOBAL — Fechar Tudo + Pausar", async () => {
                    setConfirmZerarGlobal(true);
                  });
                } else {
                  execZerarGlobal();
                }
              }}
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
                confirmZerarGlobal ? "⚠ CONFIRMAR?" : <><XCircle size={14} /> Zerar Global</>
              )}
            </button>
          </div>

          {/* Expandable local symbol selector */}
          {showLocalSelector && activeSymbols.length > 0 && (
            <div style={{
              marginTop: "1rem",
              background: "var(--opacity-bg-soft)",
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
                      onClick={() => {
                        if (!isConfirming) {
                          setConfirmLocalSymbol(symbol);
                        } else {
                          withPin(`Zerar Local — ${symbol.toUpperCase().replace("C", "")}`, () => execPanicLocal(symbol));
                        }
                      }}
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
                        {actionStatus[actionId] === "sending" && <RefreshCw className="spin" size={10} />}
                        {actionStatus[actionId] === "success" && "✓ Zerado"}
                        {actionStatus[actionId] === "error" && "✕ Falhou"}
                        {(!actionStatus[actionId] || actionStatus[actionId] === "idle") && (
                          isConfirming ? "Confirmar + PIN?" : "Zerar Par"
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {lastCommand && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "1rem", borderTop: "1px solid var(--opacity-divider)", paddingTop: "0.5rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--neon-gold)", fontWeight: 700, letterSpacing: "0.02em" }}>
              {lastCommand}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
