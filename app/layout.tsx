import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Roboto } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
})

export const metadata: Metadata = {
  title: "TruthLens - AI Media Integrity Platform",
  description: "AI-powered platform to identify misinformation, analyze bias, and detect manipulated content",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} antialiased`}>
      <body>{children}</body>
    </html>
  )
}
