import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tasks.olartgabo.dev",
  description: "Olympus task dashboard — read-only view over the coordination repo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
