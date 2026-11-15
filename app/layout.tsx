import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: {
    default: "7 Communication – Mobile Accessories Shop Panel",
    template: "%s – 7 Communication",
  },
  description:
    "7 Communication mobile accessories shop panel for POS, inventory, sales, customers, and shop management.",
  applicationName: "7 Communication",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "256x256" }],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "256x256" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
};

/**
 * Runs before first paint. Light (orange & white) is default. Stored: light | dark.
 */
const themeScript = `(function(){try{var s=localStorage.getItem('omnipos-theme');var dark=(s==='dark');var root=document.documentElement;root.classList.remove('dark','theme-light');if(dark)root.classList.add('dark');root.style.colorScheme=dark?'dark':'light';if(s==='brand'||s==='default'||s==='theme-light')localStorage.setItem('omnipos-theme','light');}catch(e){document.documentElement.classList.remove('dark','theme-light');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
