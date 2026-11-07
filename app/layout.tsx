import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstagramMoney — AI Reel Automation",
  description: "Internal dashboard for AI reel automation pipeline"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
