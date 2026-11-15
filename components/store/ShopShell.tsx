"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Wrench,
  X,
} from "lucide-react";

import { cn, currencyForCountry, setDisplayCurrency } from "@/lib/utils";

type Shop = {
  id: string; uid?: string | null; businessName: string; industryType?: string; status?: string; accountType?: string;
  email?: string | null; phone?: string | null; country?: string | null; location?: string | null; logoDataUrl?: string | null;
  subscriptionPaidUntil?: string | null;
};

const NAV = [
  { key: "overview", label: "Overview", href: "", icon: LayoutDashboard },
  { key: "pos", label: "POS / Sell", href: "/pos", icon: ShoppingCart },
  { key: "inventory", label: "Inventory / Stock", href: "/inventory", icon: Boxes },
  { key: "service-jobs", label: "Service Jobs", href: "/service-jobs", icon: Wrench, feature: "SERVICE_JOBS" },
  { key: "suppliers", label: "Suppliers", href: "/suppliers", icon: Truck, feature: "SUPPLIER_LEDGER" },
  { key: "brands", label: "Brands", href: "/brands", icon: Tag },
  { key: "categories", label: "Categories", href: "/categories", icon: Layers },
  { key: "sales", label: "Sales / Invoices", href: "/sales", icon: ReceiptText },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
] as const;

const INDUSTRY_LABEL: Record<string, string> = {
  MOBILE_ACCESSORIES: "Mobile Accessories Shop",
  PHARMACY: "Pharmacy",
  GROCERY: "Grocery",
  ELECTRONICS: "Electronics Shop",
  HARDWARE_SHOP: "Hardware Shop",
  PAINT_SHOP: "Paint Shop",
  COSMETICS_SHOP: "Cosmetics Shop",
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p[0]?.[0] || "S") + (p[1]?.[0] || "");
}

export function ShopShell({ businessId, children }: { businessId: string; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [featureKeys, setFeatureKeys] = useState<string[]>([]);
  const [me, setMe] = useState<{ role?: string; name?: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setMe(data.user || null);
      } catch { /* ignore */ }
    })();
  }, []);

  const isPosOnly = me?.role === "CASHIER";

  const refreshShop = async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/profile`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.business) {
        const b = data.business as Shop;
        setShop(b);
        setDisplayCurrency(currencyForCountry(b.country ?? b.location));
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { void refreshShop(); }, [businessId]);
  useEffect(() => {
    const h = () => { void refreshShop(); };
    window.addEventListener("omnipos-shop-profile", h);
    return () => window.removeEventListener("omnipos-shop-profile", h);
  }, [businessId]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const base = `/store/${businessId}`;
  const shopName = shop?.businessName || "7 Communication";
  const panelLabel = INDUSTRY_LABEL[String(shop?.industryType || "")] || "Mobile Accessories Shop";

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/businesses/${businessId}/features`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.features)) setFeatureKeys(data.features.map((k: unknown) => String(k)));
      } catch { /* ignore */ }
    })();
  }, [businessId]);

  const nav = useMemo(
    () => NAV
      .filter((n) => !isPosOnly || n.key === "pos")
      .filter((n) => !("feature" in n) || featureKeys.includes((n as any).feature))
      .map((n) => ({ ...n, full: `${base}${n.href}` })),
    [base, featureKeys, isPosOnly],
  );
  const active = (full: string) => (full === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(full));

  useEffect(() => {
    if (!me) return;
    if (isPosOnly) {
      const allowed = `${base}/pos`;
      if (!pathname.startsWith(allowed)) {
        window.location.replace(allowed);
      }
    }
  }, [me, isPosOnly, pathname, base]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("border-b border-line", collapsed && !onNavigate ? "px-2 py-3" : "px-4 py-4")}>
        <div className={cn("flex items-center", collapsed && !onNavigate ? "justify-center" : "justify-between gap-2")}>
          {!(collapsed && !onNavigate) ? (
            <div className="flex min-w-0 items-center gap-2.5">
              {shop?.logoDataUrl ? (
                <img src={shop.logoDataUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">{initials(shopName).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">{shopName}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted">{panelLabel}</p>
              </div>
            </div>
          ) : (
            shop?.logoDataUrl ? (
              <img src={shop.logoDataUrl} alt={shopName} className="h-12 w-12 rounded-lg object-cover" title={shopName} />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent" title={shopName}>{initials(shopName).toUpperCase()}</span>
            )
          )}
          {!onNavigate ? (
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="focus-ring hidden rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground lg:inline-flex" aria-label={collapsed ? "Open sidebar" : "Close sidebar"}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      <nav aria-label="Shop navigation" className={cn("min-h-0 flex-1 overflow-y-auto py-4", collapsed && !onNavigate ? "px-2" : "px-3")}>
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon; const isA = active(item.full); const isCol = collapsed && !onNavigate;
            return (
              <li key={item.key}>
                <Link href={item.full} onClick={onNavigate} aria-current={isA ? "page" : undefined} title={item.label}
                  className={cn("focus-ring group flex items-center gap-3 rounded-lg border text-sm transition-colors", isCol ? "justify-center px-2 py-2.5" : "px-3 py-2.5", isA ? "border-accent-line bg-accent-soft font-medium text-foreground" : "border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-foreground")}>
                  <Icon className={cn("h-4 w-4 shrink-0", isA ? "text-accent" : "text-muted group-hover:text-foreground")} aria-hidden />
                  {!isCol ? <span className="truncate">{item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-line", collapsed && !onNavigate ? "p-2" : "p-3")}>
        <div className={cn("rounded-lg border border-line bg-surface-2/60", collapsed && !onNavigate ? "p-2" : "p-3")}>
          {!(collapsed && !onNavigate) ? (
            <button type="button" onClick={() => void logout()}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted hover:border-line-strong hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          ) : (
            <button type="button" onClick={() => void logout()}
              className="focus-ring flex w-full items-center justify-center rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground" title="Log out" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-[272px]")}>
        <SidebarBody />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-overlay/65 backdrop-blur-sm" onMouseDown={() => setMobileOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="relative z-10 h-full w-[288px] max-w-[86vw] border-r border-line bg-surface shadow-panel">
            <button type="button" onClick={() => setMobileOpen(false)} className="focus-ring absolute right-3 top-4 z-20 rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close"><X className="h-4 w-4" /></button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className={cn("flex min-w-0 flex-1 flex-col", collapsed ? "lg:pl-[72px]" : "lg:pl-[272px]")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="focus-ring -ml-1 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <p className="truncate text-sm font-semibold text-foreground">{shopName}</p>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
