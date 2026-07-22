import "./globals.css"

export const metadata = { title: "Central Air Compressor — CPS Simulator" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
