export function normalizeWaPhone(raw: string | null | undefined, defaultCountryCode = "92"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");
  if (!digits) return null;

  const cc = (defaultCountryCode || "92").replace(/\D/g, "") || "92";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = cc + digits.slice(1);
  if (!digits.startsWith(cc) && digits.length <= 10) digits = cc + digits;
  return digits.length >= 8 ? digits : null;
}

type ReceiptItem = {
  productName?: string | null;
  name?: string | null;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  serialOrImei?: string | null;
};

type ReceiptInvoice = {
  invoiceNumber?: string;
  createdAt?: string | Date | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items?: ReceiptItem[];
  subtotalPkr?: number;
  discountPkr?: number;
  totalAmount?: number;
  downPaymentPkr?: number;
  duePkr?: number;
  paymentMethod?: string | null;
};

export function formatReceiptMessage(shopName: string, inv: ReceiptInvoice, currency = "PKR") {
  const fmt = (n: number | undefined | null) => {
    const val = Number(n || 0);
    try { return new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 2 }).format(val); }
    catch { return `${currency} ${val.toFixed(2)}`; }
  };
  const lines: string[] = [];
  lines.push(`*${shopName || "Receipt"}*`);
  if (inv.invoiceNumber) lines.push(`Invoice: ${inv.invoiceNumber}`);
  if (inv.createdAt) {
    const d = new Date(inv.createdAt);
    if (!Number.isNaN(d.getTime())) lines.push(`Date: ${d.toLocaleString()}`);
  }
  if (inv.customerName) lines.push(`Customer: ${inv.customerName}`);
  if (inv.customerPhone) lines.push(`Phone: ${inv.customerPhone}`);
  lines.push("");
  lines.push("*Items:*");
  for (const it of inv.items || []) {
    const name = it.productName || it.name || "Item";
    const qty = Number(it.quantity || 0);
    const line = Number(it.lineTotal ?? (Number(it.unitPrice || 0) * qty));
    const serial = it.serialOrImei ? ` [${it.serialOrImei}]` : "";
    lines.push(`- ${name} x${qty}${serial}: ${fmt(line)}`);
  }
  lines.push("");
  if ((inv.discountPkr || 0) > 0) lines.push(`Discount: -${fmt(inv.discountPkr)}`);
  lines.push(`Total: ${fmt(inv.totalAmount)}`);
  lines.push(`Paid amount: ${fmt(inv.downPaymentPkr)}`);
  const due = Number(inv.duePkr || 0);
  lines.push(`Due: ${due > 0 ? fmt(due) : "Paid in full"}`);
  if (inv.paymentMethod) lines.push(`Payment: ${inv.paymentMethod}`);
  lines.push("");
  lines.push("Thank you for your purchase.");
  return lines.join("\n");
}

export function buildWhatsAppReceiptUrl(opts: {
  customerPhone?: string | null;
  defaultCountryCode?: string | null;
  shopName: string;
  invoice: ReceiptInvoice;
  currency?: string;
}) {
  const phone = normalizeWaPhone(opts.customerPhone, opts.defaultCountryCode || "92");
  if (!phone) return null;
  const text = formatReceiptMessage(opts.shopName, opts.invoice, opts.currency || "PKR");
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}