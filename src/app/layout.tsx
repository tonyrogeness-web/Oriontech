import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orion Hedge Dashboard | Real-Time Monitor",
  description:
    "Premium real-time mobile monitoring and execution dashboard for the Orion Hedge EA.",
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
