import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthStatus } from "@/components/AuthStatus";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeSelector } from "@/components/ThemeSelector";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import { hasExposureRecord } from "@/models/ExposureRecord";
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
    default: "台股曝險控制台",
    template: "%s｜台股曝險控制台",
  },
  description: "整合 00631L，或 0050 現貨與微型臺指期貨，一眼掌握淨資產、名目曝險、保證金水位與交易損益。",
};

async function getExposureSetupStatus() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    await connectToDatabase();
    return hasExposureRecord(user.id);
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, exposureSetupComplete] = await Promise.all([
    cookies(),
    getExposureSetupStatus(),
  ]);
  const theme = getTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="zh-Hant"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="cosmic-shell flex min-h-screen flex-col text-slate-100">
          <SiteHeader
            authStatus={<Suspense fallback={null}><AuthStatus /></Suspense>}
            exposureSetupComplete={exposureSetupComplete}
            themeSelector={<ThemeSelector initialTheme={theme} />}
          />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
