import React from "react";
import { Activity, ShieldCheck } from "lucide-react";
import styles from "./components.module.css";

interface HeaderProps {
  accountNumber: string;
  lastUpdated: string;
  isMock?: boolean;
}

export default function Header({ accountNumber, lastUpdated, isMock }: HeaderProps) {
  const isOnline = () => {
    if (!lastUpdated) return false;
    const updateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    // Online if updated in the last 30 seconds
    return now - updateTime < 30000;
  };

  const formattedTime = () => {
    if (!lastUpdated) return "N/A";
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString();
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Activity size={28} className={styles.logoAccent} />
        <span className={styles.logoText}>
          Aura-FX<span className={styles.logoAccent}>.io</span>
        </span>
        {isMock && <span className="badge badge-info" style={{ marginLeft: "0.5rem" }}>MOCK MODE</span>}
      </div>

      <div className={styles.connection}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            Conta: {accountNumber || "Carregando..."}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Último Sync: {formattedTime()}
          </span>
        </div>
        <div
          className={`${styles.statusIndicator} ${
            isOnline() || isMock ? styles.statusOnline : styles.statusOffline
          }`}
          title={isOnline() || isMock ? "Online" : "Desconectado do MT5"}
        />
      </div>
    </header>
  );
}
