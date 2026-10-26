"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";

/** Every half hour, starting at 06:00 so a working day reads top to bottom. */
const SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const minutes = (6 * 60 + i * 30) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** 00:00-05:30 — past midnight, which only a closing time usually lands on. */
const isNight = (slot: string) => Number(slot.slice(0, 2)) < 6;

type Props = {
  isDark: boolean;
  /** `HH:MM`, or empty until chosen. */
  value: string;
  onChange: (value: string) => void;
  /** The sheet's heading, e.g. "Ish boshlash vaqti". */
  title: string;
  placeholder?: string;
  /** The field's look, so it matches the form it sits in. */
  className?: string;
};

/**
 * A time field that opens a grid of half-hour slots in 24-hour time.
 *
 * Replaces `<input type="time">`, which each phone draws its own way and which
 * showed "07:00 PM" to people who read "19:00", behind a field that did not
 * look pressable.
 */
export function TimePicker({ isDark, value, onChange, title, placeholder = "00:00", className = "" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${className} flex items-center justify-between gap-2 cursor-pointer text-left`}>
        <span className={value ? "" : isDark ? "text-white/30 font-semibold" : "text-zinc-400 font-semibold"}>{value || placeholder}</span>
        <Clock className={`h-5 w-5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
      </button>

      {/* Portalled: an animated ancestor would otherwise become the containing
          block of `fixed` and drop the sheet below the page. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
            <div className="absolute inset-0" onClick={() => setOpen(false)} />
            <div
              className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-[32px] px-5 pt-4 pb-8 z-10 border-t relative text-left ${
                isDark ? "bg-[#2C2C2E] border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              }`}
            >
              <div className={`w-12 h-1 rounded-full mx-auto mb-3 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-base">{title}</h3>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-zinc-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SLOTS.map((slot) => {
                  const selected = slot === value;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        onChange(slot);
                        setOpen(false);
                      }}
                      className={`py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                        selected
                          ? "bg-[#FF5A00] border-[#FF5A00] text-white"
                          : isDark
                            ? "border-white/10 bg-white/5"
                            : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      {slot}
                      {isNight(slot) && <span className={`block text-[9px] font-semibold ${selected ? "text-white/80" : "text-zinc-400"}`}>tun</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** `"10:00" - "02:00"` as people say it; equal times mean round the clock. */
export function formatHours(opens: string, closes: string): string {
  if (!opens || !closes) return "";
  return opens === closes ? "24 soat" : `${opens} - ${closes}`;
}
