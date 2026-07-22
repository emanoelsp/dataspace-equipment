import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Prensa — Equipment Sidecar",
  description: "AAS sidecar simulado — Prensa Hidráulica Schuler MSP 160",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-slate-900 text-white antialiased">{children}</body>
    </html>
  )
}
