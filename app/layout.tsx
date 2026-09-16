import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Balcones de la Riviera | Reservas del quincho",
  description: "Calendario de disponibilidad, reservas del quincho y reglamento de Balcones de la Riviera.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
