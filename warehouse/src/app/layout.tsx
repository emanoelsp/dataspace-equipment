import "./globals.css"

export const metadata = { title: "Automated Storage (AS/RS) — CPS Simulator" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
