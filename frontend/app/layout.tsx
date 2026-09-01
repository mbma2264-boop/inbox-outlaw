import "./globals.css";
import "./polish.css";
import "./actions.css";
import "./insights.css";
import "./fixes.css";
import "./vibrant.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Outlaw",
  description: "Inbox triage with read-only Gmail sync, scam scoring, and explainable recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
