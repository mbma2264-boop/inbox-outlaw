import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Guardian Starter",
  description: "Starter dashboard for an AI + rules email triage app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
