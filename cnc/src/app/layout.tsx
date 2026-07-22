import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "CNC — Equipment Sidecar",
  description: "AAS sidecar simulado — Centro de Usinagem CNC DMG MORI NHX 4000",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-slate-900 text-white antialiased">{children}</body>
    </html>
  )
}
