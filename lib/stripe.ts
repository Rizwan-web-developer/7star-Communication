// One-time panel build: Stripe/billing not used. Stub exports kept for compatibility.

export const STRIPE_PACKAGES = [] as const;
export type StripePackageKey = string;

export function isPakistanCountry(country?: string | null): boolean {
  const c = (country || "").trim().toLowerCase();
  return c === "pakistan" || c === "pk" || c === "islamic republic of pakistan";
}

export function isInternationalBillingCountry(country?: string | null): boolean {
  return !isPakistanCountry(country);
}

export function billingModeForCountry(country?: string | null): "LOCAL_MANUAL" | "INTERNATIONAL_AUTO" {
  return isPakistanCountry(country) ? "LOCAL_MANUAL" : "INTERNATIONAL_AUTO";
}

export function getStripe(): never {
  throw new Error("Stripe is not configured in this build.");
}

export function isStripeConfigured(): boolean {
  return false;
}

export function priceIdForPackage(_packageKey: string): string | null {
  return null;
}

export function packageByKey(_packageKey: string) {
  return null;
}
