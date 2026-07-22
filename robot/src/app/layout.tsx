import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Robô — Equipment Sidecar",
  description: "AAS sidecar simulado — Robô Industrial KUKA KR 210 R2700",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-slate-900 text-white antialiased">{children}</body>
    </html>
  )
}
