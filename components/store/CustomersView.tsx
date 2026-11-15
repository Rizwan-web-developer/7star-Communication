"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Phone, Plus, Search, Trash2, User, X } from "lucide-react";
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
  createdAt?: string;
};

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

  const filtered = customers.filter((c) => {
    const t = query.trim().toLowerCase();
    if (!t) return true;
    return [c.name, c.phone, c.address, c.notes].some((v) => String(v || "").toLowerCase().includes(t));
  });

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
      setDel(null);
      setNotice("Customer deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer.");
    } finally {
      setBusy(false);
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
            <table className="w-full min-w-[700px] text-left text-sm">
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
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted">Notes</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted" />
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