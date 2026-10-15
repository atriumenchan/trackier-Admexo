import type { Metadata } from "next";
import "./globals.css";

const fonts = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: { default: "ADMEXO Track", template: "%s · ADMEXO Track" },
  description: "Internal affiliate tracking for ADMEXO.",
};

export const dynamic = "force-dynamic";

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
