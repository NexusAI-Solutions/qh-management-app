import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { Nunito_Sans } from "next/font/google";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_PRODUCTNAME,
  description: "The best way to build your SaaS product.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = process.env.NEXT_PUBLIC_THEME
  if(!theme) {
    theme = "theme-qh"
  }
  {/* const gaID = process.env.NEXT_PUBLIC_GOOGLE_TAG; */}
  return (
    <html lang="en" className={nunito.variable}>
      <body className={`${theme} font-sans bg-background`}>
        {children}
        <Analytics />
        {/* <CookieConsent />
        {gaID && <GoogleAnalytics gaId={gaID} />} */}
      </body>
    </html>
  );
}