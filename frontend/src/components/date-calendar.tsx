"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { toApiDate } from "@/lib/format";

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
/** Monday first, as the rest of the app counts weekdays. */
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

type Props = {
  isDark: boolean;
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (date: string) => void;
  /** The first and last selectable dates, `YYYY-MM-DD`. */
  minDate: string;
  maxDate: string;
  /** Greys a day out: booked, closed, and so on. */
  isDisabled?: (date: string) => boolean;
  /** Told the shown month's first and last day, so callers can fetch what is booked in it. */
  onMonthChange?: (first: string, last: string) => void;
};

const monthKey = (year: number, month: number) => year * 12 + month;

/**
 * A month calendar for picking an event date, with a month-and-year view behind
 * its title — a to'yxona is booked months ahead, which a strip of the next few
 * days could not reach.
 */
export function DateCalendar({ isDark, value, onChange, minDate, maxDate, isDisabled, onMonthChange }: Props) {
  const min = new Date(`${minDate}T00:00:00`);
  const max = new Date(`${maxDate}T00:00:00`);
  const start = value ? new Date(`${value}T00:00:00`) : min;
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const [view, setView] = useState<"days" | "months">("days");

  useEffect(() => {
    onMonthChange?.(toApiDate(new Date(year, month, 1)), toApiDate(new Date(year, month + 1, 0)));
    // The callback is the caller's fetch; asking again on every render of the
    // parent would refetch the same month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const minKey = monthKey(min.getFullYear(), min.getMonth());
  const maxKey = monthKey(max.getFullYear(), max.getMonth());
  const current = monthKey(year, month);
  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    if (monthKey(next.getFullYear(), next.getMonth()) < minKey || monthKey(next.getFullYear(), next.getMonth()) > maxKey) return;
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const panel = `rounded-3xl p-4 ${isDark ? "bg-white/5" : "bg-zinc-50 border border-zinc-200"}`;
  const arrow = (enabled: boolean) =>
    `p-1.5 rounded-lg ${enabled ? "text-[#FF5A00] cursor-pointer" : "text-zinc-400/40 cursor-not-allowed"}`;

  if (view === "months") {
    return (
      <div className={panel}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setView("days")} className="flex items-center gap-1 text-sm font-bold text-[#FF5A00] cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
            Orqaga
          </button>
          <span className="text-sm font-bold text-[#FF5A00]">{year}</span>
          <div className="flex">
            <button type="button" disabled={year <= min.getFullYear()} onClick={() => setYear(year - 1)} className={arrow(year > min.getFullYear())}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={year >= max.getFullYear()} onClick={() => setYear(year + 1)} className={arrow(year < max.getFullYear())}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS_SHORT.map((label, m) => {
            const key = monthKey(year, m);
            const enabled = key >= minKey && key <= maxKey;
            const selected = m === month;
            return (
              <button
                key={label}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setMonth(m);
                  setView("days");
                }}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  selected ? "bg-[#FF5A00] text-white" : enabled ? "cursor-pointer hover:bg-[#FF5A00]/10" : "text-zinc-400/40 cursor-not-allowed"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toApiDate(new Date(year, month, i + 1))),
  ];

  return (
    <div className={panel}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setView("months")} className="flex items-center gap-1 text-sm font-bold text-[#FF5A00] cursor-pointer">
          {MONTHS[month]} {year}
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex">
          <button type="button" disabled={current <= minKey} onClick={() => shift(-1)} className={arrow(current > minKey)} aria-label="Oldingi oy">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={current >= maxKey} onClick={() => shift(1)} className={arrow(current < maxKey)} aria-label="Keyingi oy">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[11px] font-bold text-zinc-400 pb-1">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const disabled = date < minDate || date > maxDate || Boolean(isDisabled?.(date));
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onChange(date)}
              className={`mx-auto w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                selected
                  ? "bg-[#FF5A00] text-white font-bold shadow-md shadow-[#FF5A00]/25"
                  : disabled
                    ? "text-zinc-400/40 line-through cursor-not-allowed"
                    : "cursor-pointer hover:bg-[#FF5A00]/10"
              }`}
            >
              {Number(date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
