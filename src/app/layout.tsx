import type { Metadata } from "next";
import { Geist, Geist_Mono, Cookie } from "next/font/google";
import "./globals.css";
import ExtensionSafeWrapper from '@/components/ExtensionSafeWrapper';
import Footer from '@/components/common/Footer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const cookie = Cookie({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cookie",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "3I/ATLAS Comet Dashboard - Observation Tracking",
  description: "Comprehensive tracking dashboard for interstellar comet 3I/ATLAS with astronomical observations and brightness analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cookie.variable} antialiased flex flex-col min-h-screen`}
      >
        <ExtensionSafeWrapper suppressWarnings={process.env.NODE_ENV === 'production'}>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ExtensionSafeWrapper>

      </body>
    </html>
  );
}
