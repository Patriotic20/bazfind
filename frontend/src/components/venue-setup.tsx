"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Pencil, Users, X } from "lucide-react";

import { AmountInput } from "@/components/amount-input";
import { TimePicker, formatHours } from "@/components/time-picker";
import { catalogService, ServiceCatalogRead } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** One tap for the usual days; equal times are round the clock. */
const HOUR_PRESETS = [
  { label: "09:00 - 18:00", opens: "09:00", closes: "18:00" },
  { label: "10:00 - 23:00", opens: "10:00", closes: "23:00" },
  { label: "10:00 - 02:00", opens: "10:00", closes: "02:00" },
  { label: "24 soat", opens: "00:00", closes: "00:00" },
];

/** Monday first, as the API numbers them (`weekday` 0 = Dushanba). */
export const WEEKDAY_SHORT = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

export interface VenueServiceDraft {
  catalogId: number;
  name: string;
  slug: string;
  /** Digits only. */
  price: string;
  /** The dishes of "Dasturxon tuzash"; empty for every other service. */
  items: { name: string; price: string }[];
}

/** What is being signed up: a restaurant, a to'yxona, or one of each. */
export type SetupKind = "restoran" | "toyxona" | "both";

/** Table sizes the restaurant screen asks about; `10` stands for 10 and more. */
export const TABLE_SIZES = [2, 4, 6, 8, 10] as const;

/** Everything the sign-up screens collect before the account exists. */
export interface VenueSetupDraft {
  /** Restaurant: how many tables of each size, digits only. */
  tableCounts: Record<number, string>;
  /** To'yxona: the guest range a hall booking must fall in. */
  capacityMin: string;
  capacityMax: string;
  /** `HH:MM`, or empty until chosen. */
  opens: string;
  closes: string;
  weekdays: number[];
  minAdvanceDays: 1 | 2 | 3;
  services: VenueServiceDraft[];
}

export const EMPTY_VENUE_SETUP: VenueSetupDraft = {
  tableCounts: { 2: "", 4: "", 6: "", 8: "", 10: "" },
  capacityMin: "",
  capacityMax: "",
  opens: "",
  closes: "",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  minAdvanceDays: 3,
  services: [],
};

/** A contiguous run reads `Dush / Shan`; anything else is listed. */
export function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return WEEKDAY_SHORT[sorted[0]];
  const contiguous = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  return contiguous
    ? `${WEEKDAY_SHORT[sorted[0]]} / ${WEEKDAY_SHORT[sorted[sorted.length - 1]]}`
    : sorted.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

/** Seats across all tables, counting a 10+ table as ten. */
export function tableSeats(draft: VenueSetupDraft): number {
  return TABLE_SIZES.reduce((sum, size) => sum + size * (Number(draft.tableCounts[size]) || 0), 0);
}

/** `{2: 4, 4: 6}` — only the sizes that have tables, as the API takes them. */
export function tableCountsPayload(draft: VenueSetupDraft): Record<number, number> {
  return Object.fromEntries(
    TABLE_SIZES.filter((size) => Number(draft.tableCounts[size]) > 0).map((size) => [size, Number(draft.tableCounts[size])]),
  );
}

export function isVenueSetupComplete(draft: VenueSetupDraft, kind: SetupKind): boolean {
  const restaurantReady = kind === "toyxona" || tableSeats(draft) > 0;
  const hallReady = kind === "restoran" || Number(draft.capacityMax) > 0;
  return Boolean(restaurantReady && hallReady && draft.opens && draft.closes && draft.weekdays.length);
}

/** Standart is `dasturxon_tuzash`, premium `dasturxon_premium`; both list dishes. */
export const isDasturxonSlug = (slug: string) => slug.startsWith("dasturxon");

type Screen = "hub" | "tables" | "capacity" | "hours" | "days" | "services" | "catalog" | "service_form";

type Props = {
  isDark: boolean;
  kind: SetupKind;
  value: VenueSetupDraft;
  onChange: (next: VenueSetupDraft) => void;
  /** Leaves these screens backwards, to the name-and-address step. */
  onBack: () => void;
  /** Leaves them forwards. */
  onDone: () => void;
  /** Where to open: the services list when coming back from a later step. */
  initialScreen?: "hub" | "services";
};

/**
 * The middle of partner sign-up: seats, hours, working days and the minimum
 * notice on one screen, then — for a to'yxona — the extra services and their
 * prices. A restaurant counts its tables by size; a to'yxona gives the guest
 * range of its hall; "both" asks for each.
 *
 * Nothing here talks to the API except the service catalogue: the account does
 * not exist yet, so the draft is handed up and written once at the end.
 */
export function VenueSetup({ isDark, kind, value, onChange, onBack, onDone, initialScreen = "hub" }: Props) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [error, setError] = useState("");
  const hasRestaurant = kind !== "toyxona";
  const hasHall = kind !== "restoran";

  // Sub-screen drafts, so backing out of one does not change the hub.
  const [tables, setTables] = useState<Record<number, string>>(value.tableCounts);
  const [capMin, setCapMin] = useState(value.capacityMin);
  const [capMax, setCapMax] = useState(value.capacityMax);
  const [opens, setOpens] = useState(value.opens);
  const [closes, setCloses] = useState(value.closes);
  const [weekdays, setWeekdays] = useState<number[]>(value.weekdays);

  const [catalog, setCatalog] = useState<ServiceCatalogRead[] | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formService, setFormService] = useState<ServiceCatalogRead | null>(null);
  const [formPrice, setFormPrice] = useState("");
  const [formItems, setFormItems] = useState<{ name: string; price: string }[]>([]);

  useEffect(() => {
    catalogService
      .getServiceCatalog("toyxona")
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const go = (next: Screen) => {
    setError("");
    setScreen(next);
  };

  const fieldClass = `w-full px-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold tracking-wide ${
    isDark
      ? "bg-[#2C2C2E]/60 border-white/10 text-white focus-within:border-[#FF5A00] focus:border-[#FF5A00]"
      : "bg-white border-zinc-200 text-black focus-within:border-[#FF5A00] focus:border-[#FF5A00]"
  }`;
  const labelClass = `block text-sm font-bold mb-2 ${isDark ? "text-white/80" : "text-zinc-800"}`;
  const muted = isDark ? "text-white/30" : "text-zinc-400";

  const primaryButton = (label: string, enabled: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
        enabled
          ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
          : isDark
            ? "bg-white/10 text-white/30 cursor-not-allowed"
            : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );

  const header = (title: string, back: () => void) => (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center gap-1.5 -ml-2">
        <button
          type="button"
          onClick={back}
          className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
        >
          <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
        </button>
        <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>{title}</h2>
      </div>
      <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
        Ma&apos;lumotlarni to&apos;g&apos;ri kiritilishiga e&apos;tiborli bo&apos;ling!
      </p>
    </div>
  );

  const errorBox = error && (
    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
      {error}
    </div>
  );

  const layout = (top: React.ReactNode, bottom: React.ReactNode) => (
    <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
      <div className="space-y-5">{top}</div>
      <div className="space-y-4 pt-4">{bottom}</div>
    </div>
  );

  const pickerRow = (text: string, placeholder: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className={`${fieldClass} flex items-center justify-between text-left cursor-pointer`}>
      <span className={text ? "" : `${muted} font-semibold`}>{text || placeholder}</span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </button>
  );

  // --- hub -------------------------------------------------------------------

  if (screen === "hub") {
    const capacityText = value.capacityMax
      ? `${value.capacityMin ? `${value.capacityMin} - ` : ""}${value.capacityMax} ta joy`
      : "";
    const hoursText = formatHours(value.opens, value.closes);
    return layout(
      <>
        {header("Vaqt & Zal sozlamalari", onBack)}
        {errorBox}
        <div className="space-y-5 text-left">
          {hasRestaurant && (
            <div>
              <span className={labelClass}>Restorandagi umumiy joylar sonini kiriting</span>
              {pickerRow(tableSeats(value) ? `${tableSeats(value)} ta` : "", "00", () => {
                setTables(value.tableCounts);
                go("tables");
              })}
            </div>
          )}
          {hasHall && (
            <div>
              <span className={labelClass}>To&apos;yxonadagi umumiy joylar sonini belgilang</span>
              {pickerRow(capacityText, "00", () => {
                setCapMin(value.capacityMin);
                setCapMax(value.capacityMax);
                go("capacity");
              })}
            </div>
          )}
          <div>
            <span className={labelClass}>Ish vaqtini belgilang</span>
            {pickerRow(hoursText, "00 : 00", () => {
              setOpens(value.opens);
              setCloses(value.closes);
              go("hours");
            })}
          </div>
          <div>
            <span className={labelClass}>Ish kunlarini belgilang</span>
            {pickerRow(formatWeekdays(value.weekdays), "Dush /", () => {
              setWeekdays(value.weekdays);
              go("days");
            })}
          </div>
          <div>
            <span className={labelClass}>Minimal oldindan band qilish vaqti</span>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((days) => {
                const selected = value.minAdvanceDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => onChange({ ...value, minAdvanceDays: days })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-full border text-sm font-bold cursor-pointer transition-all ${
                      selected
                        ? "bg-[#FF5A00] border-[#FF5A00] text-white"
                        : isDark
                          ? "border-white/15 text-white/80"
                          : "border-zinc-200 text-zinc-700"
                    }`}
                  >
                    {days} kun
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selected ? "border-white bg-white text-[#FF5A00]" : isDark ? "border-white/40" : "border-zinc-400"
                      }`}
                    >
                      {selected && <X className="h-2.5 w-2.5 stroke-[4px]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>,
      primaryButton("Keyingisi", isVenueSetupComplete(value, kind), () => (hasHall ? go("services") : onDone())),
    );
  }

  // --- restaurant tables -----------------------------------------------------

  if (screen === "tables") {
    const draft = { ...value, tableCounts: tables };
    return layout(
      <>
        {header("Stollar", () => go("hub"))}
        {errorBox}
        <div className="space-y-5 text-left">
          {TABLE_SIZES.map((size) => (
            <label key={size} className="block">
              <span className={labelClass}>{`${size === 10 ? "10+" : size} kishilik sig'imdagi stollar soni`}</span>
              <div className={`${fieldClass} flex items-center gap-2`}>
                <AmountInput
                  value={tables[size] ?? ""}
                  onChange={(digits) => setTables((prev) => ({ ...prev, [size]: digits }))}
                  placeholder="0"
                  className="flex-1 min-w-0 bg-transparent outline-none"
                />
                <LayoutGrid className={`h-5 w-5 ${muted}`} />
              </div>
            </label>
          ))}
          <p className={`text-xs font-bold ${isDark ? "text-white/70" : "text-zinc-600"}`}>
            Jami: {tableSeats(draft)} ta joy
          </p>
        </div>
      </>,
      primaryButton("Keyingisi", tableSeats(draft) > 0, () => {
        onChange(draft);
        go("hub");
      }),
    );
  }

  // --- hall size -------------------------------------------------------------

  if (screen === "capacity") {
    const min = Number(capMin) || 0;
    const max = Number(capMax) || 0;
    return layout(
      <>
        {header("Zal sig'imi", () => go("hub"))}
        {errorBox}
        <div className="space-y-5 text-left">
          <label className="block">
            <span className={labelClass}>Minimal sig&apos;im</span>
            <div className={`${fieldClass} flex items-center gap-2`}>
              <AmountInput value={capMin} onChange={setCapMin} placeholder="0" className="flex-1 min-w-0 bg-transparent outline-none" />
              <Users className={`h-5 w-5 ${muted}`} />
            </div>
            <span className={`block text-[11px] mt-1.5 ${muted}`}>Kamida nechta mehmon bilan buyurtma qabul qilasiz</span>
          </label>
          <label className="block">
            <span className={labelClass}>Maksimal sig&apos;im</span>
            <div className={`${fieldClass} flex items-center gap-2`}>
              <AmountInput value={capMax} onChange={setCapMax} placeholder="0" className="flex-1 min-w-0 bg-transparent outline-none" />
              <Users className={`h-5 w-5 ${muted}`} />
            </div>
            <span className={`block text-[11px] mt-1.5 ${muted}`}>Zal eng ko&apos;pi bilan nechta mehmonni sig&apos;diradi</span>
          </label>
        </div>
      </>,
      primaryButton("Keyingisi", max > 0, () => {
        if (min > max) {
          setError("Minimal sig'im maksimaldan katta bo'lmasligi kerak!");
          return;
        }
        onChange({ ...value, capacityMin: capMin, capacityMax: capMax });
        go("hub");
      }),
    );
  }

  // --- hours -----------------------------------------------------------------

  if (screen === "hours") {
    return layout(
      <>
        {header("Vaqt sozlamalari", () => go("hub"))}
        {errorBox}
        <div className="space-y-5 text-left">
          <div className="flex flex-wrap gap-2">
            {HOUR_PRESETS.map((preset) => {
              const selected = preset.opens === opens && preset.closes === closes;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setOpens(preset.opens);
                    setCloses(preset.closes);
                  }}
                  className={`px-3.5 py-2 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                    selected
                      ? "bg-[#FF5A00] border-[#FF5A00] text-white"
                      : isDark
                        ? "border-white/20 text-white/80"
                        : "border-zinc-300 text-zinc-700"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {[
            { label: "Ish boshlash vaqti", value: opens, set: setOpens },
            { label: "Ish tugash vaqti", value: closes, set: setCloses },
          ].map((field) => (
            <div key={field.label}>
              <span className={labelClass}>{field.label}</span>
              <TimePicker isDark={isDark} value={field.value} onChange={field.set} title={field.label} className={fieldClass} />
            </div>
          ))}
          {opens && closes && closes < opens && (
            <p className={`text-[11px] ${muted}`}>Tun yarmidan keyin yopiladi — ertasi kuni {closes} gacha ishlaydi.</p>
          )}
        </div>
      </>,
      primaryButton("Tasdiqlash", Boolean(opens && closes), () => {
        onChange({ ...value, opens, closes });
        go("hub");
      }),
    );
  }

  // --- working days ----------------------------------------------------------

  if (screen === "days") {
    const toggle = (day: number) =>
      setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    return layout(
      <>
        {header("Vaqt sozlamalari", () => go("hub"))}
        {errorBox}
        <div className="space-y-3 text-left">
          <span className={labelClass}>Hafta davomidagi ish kunlarini kiriting</span>
          <div className={`${fieldClass} flex items-center justify-between`}>
            <span className={weekdays.length ? "" : `${muted} font-semibold`}>{formatWeekdays(weekdays) || "Dush /"}</span>
            <CalendarDays className={`h-5 w-5 ${muted}`} />
          </div>
          <div className={`flex flex-wrap gap-2 p-3 rounded-2xl border ${isDark ? "border-white/10" : "border-zinc-200"}`}>
            {WEEKDAY_SHORT.map((label, day) => {
              const selected = weekdays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggle(day)}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    selected
                      ? "bg-[#FF5A00] border-[#FF5A00] text-white"
                      : isDark
                        ? "border-white/20 text-white/80"
                        : "border-zinc-300 text-zinc-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </>,
      primaryButton("Tasdiqlash", weekdays.length > 0, () => {
        onChange({ ...value, weekdays: [...weekdays].sort((a, b) => a - b) });
        go("hub");
      }),
    );
  }

  // --- services --------------------------------------------------------------

  const openServiceForm = (service: ServiceCatalogRead, index: number | null) => {
    const existing = index === null ? null : value.services[index];
    setFormService(service);
    setEditingIndex(index);
    setFormPrice(existing?.price ?? "");
    setFormItems(existing?.items.length ? existing.items : isDasturxonSlug(service.slug) ? [{ name: "", price: "" }] : []);
    go("service_form");
  };

  const addServiceButton = (
    <button
      type="button"
      onClick={() => go("catalog")}
      className={`${fieldClass} text-center cursor-pointer`}
    >
      Xizmat qo&apos;shish +
    </button>
  );

  if (screen === "services") {
    return layout(
      <>
        {header("Qo'shimcha xizmatlar", () => go("hub"))}
        {errorBox}
        <div className="space-y-3 text-left">
          <span className={labelClass}>Qo&apos;shimcha xizmatlar</span>
          {value.services.map((service, index) => {
            const edit = () => {
              const entry = catalog?.find((c) => c.id === service.catalogId);
              openServiceForm(
                entry ?? { id: service.catalogId, slug: service.slug, name: service.name, icon_url: null, applies_to_venue_type: null, sort_order: 0 },
                index,
              );
            };
            return (
              <div key={service.catalogId} className="space-y-2">
                <button type="button" onClick={edit} className={`${fieldClass} flex items-center justify-between cursor-pointer`}>
                  <span>{service.name}</span>
                  <Pencil className={`h-4 w-4 ${muted}`} />
                </button>
                <button type="button" onClick={edit} className={`${fieldClass} flex items-center justify-between cursor-pointer`}>
                  <span>
                    {formatMoney(service.price)}
                    {service.items.length > 0 && <span className={`ml-2 text-xs ${muted}`}>· {service.items.length} ta taom</span>}
                  </span>
                  <Pencil className={`h-4 w-4 ${muted}`} />
                </button>
              </div>
            );
          })}
          {addServiceButton}
          {value.services.length === 0 && (
            <p className={`text-[11px] ${muted}`}>Ixtiyoriy — xizmatlarni keyin ham qo&apos;shish mumkin.</p>
          )}
        </div>
      </>,
      primaryButton("Keyingisi", true, onDone),
    );
  }

  if (screen === "catalog") {
    const taken = new Set(value.services.map((s) => s.catalogId));
    const available = (catalog ?? []).filter((c) => !taken.has(c.id));
    return layout(
      <>
        {header("Qo'shimcha xizmatlar", () => go("services"))}
        <div className="space-y-2.5 text-left">
          {catalog === null && <p className={`text-xs ${muted}`}>Yuklanmoqda...</p>}
          {catalog !== null && available.length === 0 && (
            <p className={`text-xs ${muted}`}>Barcha xizmatlar qo&apos;shilgan.</p>
          )}
          {available.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => openServiceForm(service, null)}
              className={`${fieldClass} flex items-center justify-between cursor-pointer`}
            >
              <span>{service.name}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ))}
        </div>
      </>,
      null,
    );
  }

  // service_form
  const isDasturxon = isDasturxonSlug(formService?.slug ?? "");
  const saveService = () => {
    if (!formService) return;
    if (!(Number(formPrice) > 0)) {
      setError("Xizmat narxini kiriting!");
      return;
    }
    const items = formItems.filter((item) => item.name.trim() || item.price);
    if (items.some((item) => !item.name.trim() || !(Number(item.price) > 0))) {
      setError("Har bir taomning nomi va narxini kiriting!");
      return;
    }
    const draft: VenueServiceDraft = {
      catalogId: formService.id,
      name: formService.name,
      slug: formService.slug,
      price: formPrice,
      items: items.map((item) => ({ name: item.name.trim(), price: item.price })),
    };
    const services =
      editingIndex === null
        ? [...value.services, draft]
        : value.services.map((service, index) => (index === editingIndex ? draft : service));
    onChange({ ...value, services });
    go("services");
  };

  return layout(
    <>
      {header("Qo'shimcha xizmatlar", () => go(editingIndex === null ? "catalog" : "services"))}
      {errorBox}
      <div className="space-y-3 text-left">
        <span className={labelClass}>Qo&apos;shimcha xizmatlar</span>
        <div className={`${fieldClass} ${isDark ? "text-white/80" : "text-zinc-700"}`}>{formService?.name}</div>
        <AmountInput value={formPrice} onChange={setFormPrice} placeholder="Xizmat narxini yozing" className={fieldClass} />

        {isDasturxon && (
          <div className="space-y-3 pt-2">
            <span className={labelClass}>Taomlar</span>
            {formItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) =>
                      setFormItems((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))
                    }
                    placeholder="Taom nomini yozing"
                    className={fieldClass}
                  />
                  {formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== index))}
                      className={`p-2 rounded-full cursor-pointer ${muted} hover:text-red-500`}
                      title="O'chirish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <AmountInput
                  value={item.price}
                  onChange={(digits) =>
                    setFormItems((prev) => prev.map((row, i) => (i === index ? { ...row, price: digits } : row)))
                  }
                  placeholder="Taom narxini yozing"
                  className={fieldClass}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormItems((prev) => [...prev, { name: "", price: "" }])}
              className={`${fieldClass} text-center cursor-pointer`}
            >
              Taom qo&apos;shish +
            </button>
          </div>
        )}

        {editingIndex !== null && (
          <button
            type="button"
            onClick={() => {
              onChange({ ...value, services: value.services.filter((_, i) => i !== editingIndex) });
              go("services");
            }}
            className="w-full text-xs font-bold text-red-500 cursor-pointer pt-1"
          >
            Xizmatni olib tashlash
          </button>
        )}
      </div>
    </>,
    primaryButton(editingIndex === null ? "Qo'shish +" : "Saqlash", Number(formPrice) > 0, saveService),
  );
}
