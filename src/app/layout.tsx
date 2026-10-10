import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoBanner } from "@/components/shared/demo-banner";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TravelMind — Sistema Inteligente para Turismo",
  description:
    "Recomendación, cotización y reserva de paquetes turísticos asistidos por Agentes de IA. Proyecto de investigación con presupuesto cero.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-accent/20 selection:text-foreground">
        {/* Enlace de salto accesible WCAG 2.4.1 */}
        <a
          href="#contenido-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none text-sm font-medium"
        >
          Saltar al contenido principal
        </a>
        <DemoBanner />
        <Navbar />
        <main id="contenido-principal" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
