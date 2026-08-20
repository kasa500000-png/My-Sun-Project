import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./uiux-foundation.css";
import "./uiux-accessibility.css";
import "./uiux-responsive.css";
import "./uiux-components.css";
import "./uiux-navigation.css";
import "./uiux-loading.css";
import "./uiux-auth.css";
import "./uiux-dashboard.css";
import "./uiux-workout.css";
import "./uiux-search.css";
import "./uiux-analysis.css";
import "./uiux-goals.css";
import "./uiux-forms.css";
import "./uiux-data.css";
import "./uiux-pwa.css";
import "./uiux-settings.css";
import "./uiux-motion.css";
import "./uiux-performance.css";
import ServiceWorkerBridge from "@/components/ServiceWorkerBridge";
import ScrollableRegionAccessBridge from "@/components/ScrollableRegionAccessBridge";

const PRETENDARD_STYLESHEET = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://my-sun-project.vercel.app"),
  title: "마이썬 운동일지",
  description: "운동 기록과 주간 근육 밸런스를 한눈에 보는 마이썬 전용 운동 일지입니다.",
  applicationName: "마이썬 운동일지",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "마이썬",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "마이썬 운동일지",
    description: "운동 기록과 주간 근육 밸런스를 모바일에서 빠르게 확인하는 운동 일지입니다.",
    url: "/",
    siteName: "마이썬 운동일지",
    images: [{ url: "/icons/mysun-512.png", width: 512, height: 512, alt: "마이썬 운동일지" }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "마이썬 운동일지",
    description: "운동 기록과 주간 근육 밸런스를 모바일에서 빠르게 확인하는 운동 일지입니다.",
    images: ["/icons/mysun-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/mysun-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/mysun-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/mysun-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/mysun-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#fffdfb",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preload" as="style" href={PRETENDARD_STYLESHEET} crossOrigin="anonymous" />
      </head>
      <body>
        <ServiceWorkerBridge />
        <ScrollableRegionAccessBridge />
        <a className="mysun-skip-link" href="#app-content">
          본문으로 건너뛰기
        </a>
        <div id="app-content" data-app-content tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
