import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerBridge from "@/components/ServiceWorkerBridge";

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerBridge />
        {children}
      </body>
    </html>
  );
}
