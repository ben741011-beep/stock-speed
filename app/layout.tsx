import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthStatus } from "@/components/AuthStatus";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeSelector } from "@/components/ThemeSelector";
import { getTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "00631L 曝險控制台",
    template: "%s｜00631L 曝險控制台",
  },
  description: "整合 00631L 持股、現金與交易費稅，一眼掌握名目曝險、持股成本與整體損益。",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = getTheme((await cookies()).get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="zh-Hant"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
          <SiteHeader
            authStatus={<Suspense fallback={null}><AuthStatus /></Suspense>}
            themeSelector={<ThemeSelector initialTheme={theme} />}
          />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
