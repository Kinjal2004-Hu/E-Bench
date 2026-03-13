import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-BENCH — Digital Justice",
  description:
    "AI-Powered Legal Intelligence Platform. Analyze cases, review contracts, and understand laws instantly using advanced AI and trusted legal data.",
  keywords: ["legal AI", "contract analysis", "case analyzer", "Indian law", "legal tech"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
