import type { Metadata, Viewport } from "next";
import "./globals.css";

const fonts = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

export const metadata: Metadata = {
  title: { default: "Adcliqx", template: "%s · Adcliqx" },
  description: "Adcliqx is a click, conversion and payout tracker for affiliate campaigns.",
};

export const viewport: Viewport = { themeColor: "#0b1222" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={fonts} rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
