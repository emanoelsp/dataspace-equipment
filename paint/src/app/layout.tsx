import "./globals.css"

export const metadata = { title: "Paint Booth Line — CPS Simulator" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
