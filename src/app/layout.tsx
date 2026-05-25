import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "La bulle de vie — Massages & créations bien‑être",
  description: "Massages personnalisés, soins énergétiques et créations décoratives à Lyon. Réservez votre séance en ligne.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          duration={4000}
          icons={{
            success: <span style={{ fontFamily: "var(--font-serif,'Cormorant Garamond',Georgia,serif)", fontStyle: "italic" }}>✓</span>,
            error:   <span style={{ fontFamily: "var(--font-serif,'Cormorant Garamond',Georgia,serif)", fontStyle: "italic" }}>!</span>,
            info:    <span style={{ fontFamily: "var(--font-serif,'Cormorant Garamond',Georgia,serif)", fontStyle: "italic" }}>i</span>,
            warning: <span style={{ fontFamily: "var(--font-serif,'Cormorant Garamond',Georgia,serif)", fontStyle: "italic" }}>!</span>,
          }}
        />
      </body>
    </html>
  );
}
