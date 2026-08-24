import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Mono } from "next/font/google";
import "./globals.css";

// Same three faces as olartgabo.dev, loaded the same way: Cabinet for
// display, Satoshi for prose, Space Mono for every label and dimension.
// Before this the mono token listed "Space Mono" *after* ui-monospace, so
// it never won — the whole sheet rendered in system fonts.
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

export const viewport = {
  themeColor: "#08090b",
};

export const metadata: Metadata = {
  title: "tasks.olartgabo.dev",
  description: "Olympus task dashboard — read-only view over the coordination repo.",
};

// Runs before paint so the stored theme applies before React hydrates —
// otherwise a light-mode visitor sees a dark flash on every load. The
// motion flag gates .reveal's opacity:0 on JS actually being alive, so a
// failed bundle or a reduced-motion visitor gets a visible page instead
// of an empty one.
const BOOT = `
try {
  var t = localStorage.getItem("theme");
  if (t === "light") document.documentElement.dataset.theme = "light";
} catch (e) {}
try {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.dataset.motion = "on";
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the BOOT script stamps data-theme and
    // data-motion onto <html> before React sees it, which is the point.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cabinet.variable} ${satoshi.variable} ${spaceMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
