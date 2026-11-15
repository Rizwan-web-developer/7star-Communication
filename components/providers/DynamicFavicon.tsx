"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function setFavicon(href: string) {
  const rels = ["icon", "shortcut icon", "apple-touch-icon"];
  for (const rel of rels) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
    if (href.startsWith("data:image")) {
      link.type = href.slice(5, href.indexOf(";")) || "image/png";
    } else if (href.endsWith(".png")) {
      link.type = "image/png";
    }
  }
}

export function DynamicFavicon() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = async () => {
      try {
        const match = pathname.match(/^\/store\/([^/]+)/);
        if (match?.[1]) {
          const res = await fetch(`/api/businesses/${match[1]}/profile`, { cache: "no-store" });
          const data = await res.json().catch(() => ({}));
          const logo = data?.business?.logoDataUrl;
          if (res.ok && logo) { setFavicon(logo); return; }
        }
      } catch { /* ignore */ }
      setFavicon("/favicon.png");
    };
    void apply();
    const onProfile = () => void apply();
    window.addEventListener("omnipos-shop-profile", onProfile);
    return () => window.removeEventListener("omnipos-shop-profile", onProfile);
  }, [pathname]);

  return null;
}