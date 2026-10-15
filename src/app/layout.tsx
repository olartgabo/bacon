import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

// Cabinet for the one display title per view, Satoshi for everything a
// person reads, Space Mono only for machine values (refs, tokens, times).
const cabinet = localFont({
  src: "../fonts/CabinetGrotesk-Variable.woff2",
  variable: "--font-cabinet",
  weight: "100 900",
  display: "swap",
});

const satoshi = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf5ea" },
    { media: "(prefers-color-scheme: dark)", color: "#202024" },
  ],
};

export const metadata: Metadata = {
  title: { default: "bacon", template: "%s · bacon" },
  description: "Agent-first task tracker.",
  manifest: "/manifest.webmanifest",
};

// Runs before paint so a stored theme applies before React hydrates.
// With nothing stored, CSS follows prefers-color-scheme.
const BOOT = `
try {
  var t = localStorage.getItem("theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the BOOT script stamps data-theme onto
    // <html> before React sees it, which is the point.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cabinet.variable} ${satoshi.variable} ${spaceMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
