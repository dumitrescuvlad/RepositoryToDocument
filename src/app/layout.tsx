import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repo → Docs",
  description: "Github repository to documentation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
