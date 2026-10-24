"use client";

import React from "react";

import { formatAmount } from "@/lib/format";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Digits only, e.g. `"50000"`. */
  value: string;
  onChange: (digits: string) => void;
};

/** A price field that shows `50 000` while it holds `50000`. */
export function AmountInput({ value, onChange, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={formatAmount(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
    />
  );
}
