import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CohortBuy — Neighbors pool. Prices drop.",
  description:
    "CohortBuy helps neighbors band together on home projects. An AI agent forms the group, gathers quotes, and shares the cost — all from a chat. Join the waitlist.",
  openGraph: {
    title: "CohortBuy — Neighbors pool. Prices drop.",
    description:
      "Band together with your neighbors on home projects. An AI agent runs it end to end — group, scope, quotes, and a fair split.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#101614" },
  ],
};

// Set the theme before paint to avoid a flash of the wrong theme.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
