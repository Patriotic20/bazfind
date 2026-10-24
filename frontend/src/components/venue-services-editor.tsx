"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Plus, X } from "lucide-react";

import { AmountInput } from "@/components/amount-input";
import { isDasturxonSlug } from "@/components/venue-setup";
import { catalogService, venueService, ServiceCatalogRead, VenueServiceRead } from "@/lib/api";
import { formatMoney } from "@/lib/format";

type Dish = { name: string; price: string };

type Props = {
  isDark: boolean;
  venueId: number;
  groupId: number;
  /** The panel's own field style, so the form matches the settings around it. */
  fieldClass: string;
  showToast: (message: string) => void;
  errorMessage: (err: unknown, fallback: string) => string;
  /** The panel hides its bottom nav while a sheet is open, or the nav covers it. */
  onSheetChange?: (open: boolean) => void;
};

/** Digits of a decimal string from the API: `"14000000.00"` → `"14000000"`. */
const digits = (value: string | number) => String(Math.round(Number(value)));

/**
 * Qo'shimcha xizmatlar of a to'yxona branch: what it charges for each catalogue
 * service, and the dishes of its table spreads (standart and premium).
 */
export function VenueServicesEditor({ isDark, venueId, groupId, fieldClass, showToast, errorMessage, onSheetChange }: Props) {
  const [services, setServices] = useState<VenueServiceRead[] | null>(null);
  const [catalog, setCatalog] = useState<ServiceCatalogRead[]>([]);
  const [sheet, setSheet] = useState<{ editing: VenueServiceRead | null } | null>(null);
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    venueService
      .getServices(venueId, groupId)
      .then(setServices)
      .catch(() => setServices([]));
  }, [venueId, groupId]);

  useEffect(() => {
    load();
    catalogService
      .getServiceCatalog("toyxona")
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [load]);

  useEffect(() => {
    onSheetChange?.(sheet !== null);
  }, [sheet, onSheetChange]);

  const taken = new Set((services ?? []).map((s) => s.service_catalog_id));
  const available = catalog.filter((c) => !taken.has(c.id));
  const chosenSlug = sheet?.editing?.slug ?? catalog.find((c) => c.id === catalogId)?.slug ?? "";
  const withDishes = isDasturxonSlug(chosenSlug);

  const openNew = () => {
    const first = available[0];
    setCatalogId(first?.id ?? null);
    setPrice("");
    setDishes(first && isDasturxonSlug(first.slug) ? [{ name: "", price: "" }] : []);
    setSheet({ editing: null });
  };

  const openEdit = (service: VenueServiceRead) => {
    setCatalogId(service.service_catalog_id);
    setPrice(digits(service.price));
    const items = (service.items ?? []).map((i) => ({ name: i.name, price: digits(i.price) }));
    setDishes(items.length ? items : isDasturxonSlug(service.slug) ? [{ name: "", price: "" }] : []);
    setSheet({ editing: service });
  };

  const save = async () => {
    if (!sheet) return;
    if (!(Number(price) > 0)) {
      showToast("Xizmat narxini kiriting");
      return;
    }
    const filled = dishes.filter((d) => d.name.trim() || d.price);
    if (filled.some((d) => !d.name.trim() || !(Number(d.price) > 0))) {
      showToast("Har bir taomning nomi va narxini kiriting");
      return;
    }
    const items = withDishes
      ? filled.map((d, i) => ({ name: d.name.trim(), price: Number(d.price), sort_order: i }))
      : [];
    setSaving(true);
    try {
      if (sheet.editing) {
        await catalogService.updateVenueService(sheet.editing.id, { price: Number(price), items }, venueId);
        showToast("Xizmat saqlandi");
      } else {
        if (!catalogId) return;
        await catalogService.createVenueService(
          { service_catalog_id: catalogId, price: Number(price), sort_order: services?.length ?? 0, items },
          venueId,
          groupId,
        );
        showToast("Xizmat qo'shildi");
      }
      setSheet(null);
      load();
    } catch (err) {
      showToast(errorMessage(err, "Xizmatni saqlab bo'lmadi"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!sheet?.editing) return;
    setSaving(true);
    try {
      await catalogService.removeVenueService(sheet.editing.id, venueId);
      showToast("Xizmat olib tashlandi");
      setSheet(null);
      load();
    } catch (err) {
      showToast(errorMessage(err, "Olib tashlab bo'lmadi"));
    } finally {
      setSaving(false);
    }
  };

  const card = `w-full p-3.5 rounded-xl border flex items-center justify-between gap-3 text-left cursor-pointer ${
    isDark ? "bg-[#393939] border-white/10" : "bg-zinc-50 border-zinc-200"
  }`;

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold opacity-60 block">Qo&apos;shimcha xizmatlar</span>
      {services === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#FF5A00]" />
      ) : (
        <>
          {services.map((service) => (
            <button key={service.id} type="button" onClick={() => openEdit(service)} className={card}>
              <span className="min-w-0">
                <span className="text-sm font-bold block truncate">{service.name}</span>
                <span className="text-xs text-[#FF5A00] font-bold block">{formatMoney(service.price, service.currency)}</span>
                {service.items && service.items.length > 0 && (
                  <span className="text-[11px] text-zinc-400 block truncate">{service.items.map((i) => i.name).join(", ")}</span>
                )}
              </span>
              <Pencil className="h-4 w-4 text-zinc-400 shrink-0" />
            </button>
          ))}
          {available.length > 0 && (
            <button
              type="button"
              onClick={openNew}
              className={`w-full py-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark ? "border-white/20 text-white/70" : "border-zinc-300 text-zinc-600"
              }`}
            >
              <Plus className="h-4 w-4" />
              Xizmat qo&apos;shish
            </button>
          )}
        </>
      )}

      {/* Portalled: inside the settings tab an animated ancestor becomes the
          containing block of `fixed`, and the sheet lands below the page. */}
      {sheet &&
        createPortal(
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSheet(null)} />
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] px-6 pt-4 pb-8 flex flex-col gap-4 z-10 border-t relative text-left ${
              isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base">{sheet.editing ? sheet.editing.name : "Xizmat qo'shish"}</h3>
              <button onClick={() => setSheet(null)} className="p-1 rounded-lg text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!sheet.editing && (
              <label className="block">
                <span className="text-xs font-bold opacity-60 block mb-1">Xizmat</span>
                <select
                  value={catalogId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCatalogId(id);
                    const slug = catalog.find((c) => c.id === id)?.slug ?? "";
                    setDishes(isDasturxonSlug(slug) ? [{ name: "", price: "" }] : []);
                  }}
                  className={`${fieldClass} cursor-pointer`}
                >
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold opacity-60 block mb-1">Narxi (UZS)</span>
              <AmountInput value={price} onChange={setPrice} placeholder="Masalan: 14 000 000" className={fieldClass} />
            </label>

            {withDishes && (
              <div className="space-y-2">
                <span className="text-xs font-bold opacity-60 block">Taomlar</span>
                {dishes.map((dish, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={dish.name}
                      onChange={(e) => setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, name: e.target.value } : d)))}
                      placeholder="Taom nomi"
                      className={fieldClass}
                    />
                    <AmountInput
                      value={dish.price}
                      onChange={(v) => setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, price: v } : d)))}
                      placeholder="Narxi"
                      className={`${fieldClass} max-w-[9rem]`}
                    />
                    <button
                      type="button"
                      onClick={() => setDishes((prev) => prev.filter((_, i) => i !== index))}
                      className="p-1.5 text-zinc-400 hover:text-red-500 cursor-pointer shrink-0"
                      title="O'chirish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDishes((prev) => [...prev, { name: "", price: "" }])}
                  className="text-xs font-bold text-[#FF5A00] cursor-pointer"
                >
                  + Taom qo&apos;shish
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full py-3.5 bg-[#FF5A00] text-white font-extrabold text-xs rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Saqlash
            </button>
            {sheet.editing && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="w-full text-xs font-bold text-red-500 cursor-pointer disabled:opacity-50"
              >
                Xizmatni olib tashlash
              </button>
            )}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
