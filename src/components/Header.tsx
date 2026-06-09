import React from "react";
import { Bell, User, Activity } from "lucide-react";
import styles from "./components.module.css";

interface HeaderProps {
  accountNumber: string;
  status: string;
  isMock?: boolean;
  brlRate: number;
  currencyMode: "CENT_BRL" | "USD_STAND" | "BRL_STAND";
  setCurrencyMode: (mode: "CENT_BRL" | "USD_STAND" | "BRL_STAND") => void;
}

export default function Header({
  accountNumber,
  status,
  isMock,
  brlRate,
  currencyMode,
  setCurrencyMode,
}: HeaderProps) {
  const isActive = status === "RUNNING";

  return (
    <header className={styles.header}>
      {/* Left logo section */}
      <div className={styles.brand}>
        <Activity size={24} className={styles.logoAccent} />
        <span className={styles.logoText}>
          ORION <span className={styles.desktopOnly}>HEDGE</span>
        </span>
        {isMock && <span className="badge badge-info" style={{ marginLeft: "0.5rem", fontSize: "0.65rem" }}>MODO DEMO</span>}
      </div>

      {/* Middle dashboard title */}
      <div className={`${styles.centerTitle} ${styles.desktopOnly}`}>PAINEL</div>

      {/* Right side connection info */}
      <div className={styles.rightHeader}>
        {/* Currency/Layout Localization Switcher */}
        <div className={styles.currencySelector}>
          <button
            className={`${styles.currencyOption} ${currencyMode === "CENT_BRL" ? styles.currencyOptionActive : ""}`}
            onClick={() => setCurrencyMode("CENT_BRL")}
            title="Exibir em BRL convertido de Dólar Cent (USC)"
          >
            CENT → BRL
          </button>
          <button
            className={`${styles.currencyOption} ${currencyMode === "USD_STAND" ? styles.currencyOptionActive : ""}`}
            onClick={() => setCurrencyMode("USD_STAND")}
            title="Exibir em Dólar Standard (USD)"
          >
            USD
          </button>
          <button
            className={`${styles.currencyOption} ${currencyMode === "BRL_STAND" ? styles.currencyOptionActive : ""}`}
            onClick={() => setCurrencyMode("BRL_STAND")}
            title="Exibir em Real Standard (BRL)"
          >
            BRL
          </button>
        </div>

        {/* Exchange rate indicator - only visible/relevant when doing BRL conversions */}
        {currencyMode === "CENT_BRL" && (
          <div 
            className={styles.desktopOnly} 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.4rem", 
              background: "rgba(255, 255, 255, 0.03)", 
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

        {/* Notification Bell */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell size={20} style={{ color: "var(--text-secondary)" }} />
          <span className={styles.bellBadge}>3</span>
        </div>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className={styles.desktopOnly} style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Status</span>
          <span className={isActive ? styles.statusActiveBadge : styles.statusPausedBadge}>
            {isActive ? "ATIVO" : "PAUSADO"}
          </span>
        </div>

        {/* User icon */}
        <div className={styles.userProfile}>
          <User size={18} style={{ color: "var(--text-primary)" }} />
        </div>
      </div>
    </header>
  );
}
