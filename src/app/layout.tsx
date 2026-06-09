import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orion Hedge | Painel de Monitoramento em Tempo Real",
  description:
    "Painel premium de monitoramento e execução em tempo real para o robô Orion Hedge no MetaTrader 5.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
