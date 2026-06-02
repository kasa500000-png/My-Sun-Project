import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerBridge from "@/components/ServiceWorkerBridge";

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
        <link rel="preload" href="/images/mysun-login-hero.webp" as="image" type="image/webp" />
        <link rel="preload" href="/images/mysun-home-hero.webp" as="image" type="image/webp" />
      </head>
      <body>
        <ServiceWorkerBridge />
        {children}
      </body>
    </html>
  );
}
