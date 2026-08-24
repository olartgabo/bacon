import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tasks.olartgabo.dev",
  description: "Olympus task dashboard — read-only view over the coordination repo.",
};

// Runs before paint so the stored theme applies before React hydrates —
// otherwise a light-mode visitor sees a dark flash on every load.
const THEME_INIT = `
try {
  var t = localStorage.getItem("theme");
  if (t === "light") document.documentElement.dataset.theme = "light";
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
