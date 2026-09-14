import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureX — Metadata Privacy Scanner",
  description: "Discover hidden metadata, remove what you choose, and verify your file before sharing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans tech-grid portal-glow selection:bg-red-500/20 selection:text-red-700"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
