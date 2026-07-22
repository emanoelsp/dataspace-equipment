import "./globals.css"

export const metadata = { title: "Dimensional Inspection Station — CPS Simulator" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
