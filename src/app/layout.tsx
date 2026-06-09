import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aura-FX Dashboard | Real-Time Orion EA Monitor",
  description:
    "Premium real-time mobile monitoring and execution dashboard for the Orion U2 EA.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
