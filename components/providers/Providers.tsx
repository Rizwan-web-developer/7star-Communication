"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { DynamicFavicon } from "@/components/providers/DynamicFavicon";
import { OverlayProvider } from "@/components/providers/OverlayProvider";
import { TenantProvider } from "@/components/providers/TenantProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <TenantProvider>
          <OverlayProvider>
            <DynamicFavicon />
            <AppShell>{children}</AppShell>
          </OverlayProvider>
        </TenantProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
