import React from "react";
import { Bell, User, Activity } from "lucide-react";
import styles from "./components.module.css";

interface HeaderProps {
  accountNumber: string;
  status: string;
  isMock?: boolean;
}

export default function Header({ accountNumber, status, isMock }: HeaderProps) {
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
