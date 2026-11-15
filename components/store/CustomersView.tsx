"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Phone, Plus, Printer, Search, Trash2, User, Wallet, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  invoiceCount?: number;
  duePkr?: number;
  totalPkr?: number;
  paidPkr?: number;
  createdAt?: string;
};

type CustomerInvoiceItem = {
  id: string;
  productName?: string | null;
  brandName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serialOrImei?: string | null;
};

type CustomerInvoice = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  downPaymentPkr: number;
  duePkr: number;
  paymentMethod?: string | null;
  items: CustomerInvoiceItem[];
};

type CustomerDetail = Customer & {
  invoices: CustomerInvoice[];
};

function printInvoice(customer: CustomerDetail, inv: CustomerInvoice) {
  const rows = inv.items.map((it) => `<tr><td>${escapeHtml(it.productName || "Item")}${it.serialOrImei ? `<div style="font-size:11px;color:#666">Serial/IMEI: ${escapeHtml(it.serialOrImei)}</div>` : ""}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">${formatCurrency(it.lineTotal)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(inv.invoiceNumber)}</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px;font-size:20px}.muted{color:#666;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #eee;padding:8px 4px;font-size:13px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#666}.totals{margin-top:16px;max-width:320px;margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}.bold{font-weight:700}</style></head><body>
  <h1>7 Communication</h1><div class="muted">Invoice: ${escapeHtml(inv.invoiceNumber)}</div><div class="muted">Date: ${new Date(inv.createdAt).toLocaleString()}</div>
  <div style="margin-top:12px"><div><b>Customer:</b> ${escapeHtml(customer.name)}</div>${customer.phone ? `<div><b>Phone:</b> ${escapeHtml(customer.phone)}</div>` : ""}${customer.address ? `<div><b>Address:</b> ${escapeHtml(customer.address)}</div>` : ""}</div>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No items</td></tr>`}</tbody></table>
  <div class="totals"><div><span>Total</span><span>${formatCurrency(inv.totalAmount)}</span></div><div><span>Paid</span><span>${formatCurrency(inv.downPaymentPkr)}</span></div><div class="bold"><span>Due</span><span>${formatCurrency(inv.duePkr)}</span></div>${inv.paymentMethod ? `<div><span>Payment</span><span>${escapeHtml(String(inv.paymentMethod))}</span></div>` : ""}</div>
  <script>window.onload=()=>{window.print();}</script></body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function CustomersView({ businessId }: { businessId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/businesses/${businessId}/customers`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load customers.");
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);

  const loadDetail = useCallback(async (customerId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/customers/${customerId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load customer details.");
      setDetail(data.customer as CustomerDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer details.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (detailId) void loadDetail(detailId);
  }, [detailId, loadDetail]);

  const filtered = useMemo(() => customers.filter((c) => {
    const t = query.trim().toLowerCase();
    if (!t) return true;
    return [c.name, c.phone, c.address, c.notes].some((v) => String(v || "").toLowerCase().includes(t));
  }), [customers, query]);

  const openAdd = () => {
    setEditing(null); setName(""); setPhone(""); setAddress(""); setNotes(""); setError(""); setNotice(""); setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c); setName(c.name || ""); setPhone(c.phone || ""); setAddress(c.address || ""); setNotes(c.notes || ""); setError(""); setNotice(""); setOpen(true);
  };

  const save = async () => {
    if (name.trim().length < 2) { setError("Enter a customer name."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const url = editing
        ? `/api/businesses/${businessId}/customers/${editing.id}`
        : `/api/businesses/${businessId}/customers`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save customer.");
      setOpen(false);
      setNotice(editing ? "Customer updated." : "Customer added.");
      await load();
      if (editing && detailId === editing.id) await loadDetail(editing.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!del) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/businesses/${businessId}/customers/${del.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete customer.");
      if (detailId === del.id) { setDetailId(null); setDetail(null); }
      setDel(null);
      setNotice("Customer deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer.");
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!detail) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a valid payment amount."); return; }
    setPayBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/businesses/${businessId}/customers/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPkr: amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to record payment.");
      setPayAmount("");
      setNotice(`Payment received: ${formatCurrency(Number(data.appliedPkr || 0))}${Number(data.unappliedPkr || 0) > 0 ? ` (extra ${formatCurrency(Number(data.unappliedPkr || 0))} not applied)` : ""}.`);
      await loadDetail(detail.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record payment.");
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-foreground"><User className="h-5 w-5 text-accent" /> Customers</h1>
          <p className="mt-0.5 text-sm text-muted">View and manage customers. New customers are added from POS sales.</p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div> : null}

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone..." className="focus-ring h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading customers…</div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">No customers found. Customers will appear here after POS sales.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Address</th>
                  <th className="px-3 py-2.5 text-right">Invoices</th>
                  <th className="px-3 py-2.5 text-right">Due</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.notes ? <p className="text-xs text-muted">{c.notes}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{c.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {c.phone}</span> : "—"}</td>
                    <td className="px-3 py-3 text-muted">{c.address || "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{c.invoiceCount ?? 0}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(Number(c.duePkr || 0))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => { setError(""); setNotice(""); setDetailId(c.id); }} className="focus-ring inline-flex items-center gap-1 rounded-md border border-accent-line bg-accent-soft px-2 py-1.5 text-xs font-medium text-accent" aria-label={`Details ${c.name}`}><Eye className="h-3.5 w-3.5" /> Details</button>
                        <button type="button" onClick={() => openEdit(c)} className="focus-ring rounded-md border border-line bg-surface-2 p-1.5 text-muted hover:text-foreground" aria-label={`Edit ${c.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setDel(c)} className="focus-ring rounded-md border border-line bg-surface-2 p-1.5 text-muted hover:border-rose-400/40 hover:text-rose-600" aria-label={`Delete ${c.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Customer details">
          <div className="absolute inset-0 bg-overlay/65 backdrop-blur-sm" onMouseDown={() => setDetailId(null)} aria-hidden />
          <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-line bg-surface shadow-panel sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Customer details</h2>
                {detail ? <p className="text-sm text-muted">{detail.name}{detail.phone ? ` · ${detail.phone}` : ""}</p> : null}
              </div>
              <button type="button" onClick={() => { setDetailId(null); setDetail(null); }} className="rounded-md p-1 text-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(92vh - 72px)" }}>
              {detailLoading || !detail ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading details…</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2"><p className="text-[11px] text-muted">Total</p><p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(detail.totalPkr || 0)}</p></div>
                    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2"><p className="text-[11px] text-muted">Paid</p><p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrency(detail.paidPkr || 0)}</p></div>
                    <div className="rounded-lg border border-accent-line bg-accent-soft px-3 py-2"><p className="text-[11px] text-muted">Due</p><p className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(detail.duePkr || 0)}</p></div>
                  </div>
                  {detail.address ? <p className="text-sm text-muted"><b className="text-foreground">Address:</b> {detail.address}</p> : null}
                  {detail.notes ? <p className="text-sm text-muted"><b className="text-foreground">Notes:</b> {detail.notes}</p> : null}

                  <div className="rounded-lg border border-line bg-surface-2 p-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Wallet className="h-4 w-4 text-accent" /> Receive payment (update due)</h3>
                    <p className="mt-0.5 text-xs text-muted">Enter amount received now. It will be applied to pending due invoices (oldest first).</p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="text-xs font-medium text-muted"><span className="mb-1 block">Amount received</span>
                        <input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" className="focus-ring h-10 w-36 rounded-lg border border-line bg-surface px-3 text-sm tabular-nums text-foreground" />
                      </label>
                      <button type="button" disabled={payBusy || Number(detail.duePkr || 0) <= 0} onClick={() => void recordPayment()} className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
                        {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save payment
                      </button>
                      {Number(detail.duePkr || 0) <= 0 ? <span className="text-xs text-emerald-700 dark:text-emerald-300">No pending due.</span> : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Invoices & purchases</h3>
                    {detail.invoices.length === 0 ? (
                      <p className="text-sm text-muted">No invoices for this customer yet.</p>
                    ) : detail.invoices.map((inv) => (
                      <div key={inv.id} className="overflow-hidden rounded-lg border border-line">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                            <p className="text-[11px] text-muted">{new Date(inv.createdAt).toLocaleString()} · {inv.paymentMethod || "—"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">Total {formatCurrency(inv.totalAmount)} · Paid {formatCurrency(inv.downPaymentPkr)} · <b className={inv.duePkr > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}>Due {formatCurrency(inv.duePkr)}</b></span>
                            <button type="button" onClick={() => printInvoice(detail, inv)} className="focus-ring inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-accent/40"><Printer className="h-3.5 w-3.5" /> Print</button>
                          </div>
                        </div>
                        <ul className="divide-y divide-line">
                          {inv.items.map((it) => (
                            <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                              <span className="min-w-0">
                                <span className="block truncate text-foreground">{it.productName || "Item"}{it.serialOrImei ? <span className="text-muted"> [{it.serialOrImei}]</span> : null}</span>
                                <span className="block text-[11px] text-muted">Qty {it.quantity} × {formatCurrency(it.unitPrice)}</span>
                              </span>
                              <span className="shrink-0 font-medium tabular-nums text-foreground">{formatCurrency(it.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={editing ? "Edit customer" : "Add customer"}>
          <div className="absolute inset-0 bg-overlay/65 backdrop-blur-sm" onMouseDown={() => (saving ? null : setOpen(false))} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-panel sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{editing ? "Edit customer" : "Add customer"}</h2>
              <button type="button" onClick={() => (saving ? null : setOpen(false))} className="rounded-md p-1 text-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted">Customer name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ali Khan" className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted" />
              </label>
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted">Phone number</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0300 1234567" className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted" />
              </label>
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted">Address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted" />
              </label>
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted">Notes (due / remarks)</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, due details, etc." className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setOpen(false)} className="focus-ring rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground disabled:opacity-50">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void save()} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {editing ? "Save changes" : "Add customer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!del}
        onClose={() => (busy ? undefined : setDel(null))}
        onConfirm={() => void remove()}
        title="Delete customer?"
        description={del ? <span>{del.name} will be deleted. Existing invoices will remain but will no longer be linked to this customer.</span> : null}
        confirmLabel="Delete"
        tone="danger"
        loading={busy}
      />
    </div>
  );
}