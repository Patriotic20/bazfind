"use client";

import React from "react";

import { formatPhone, phoneDigits, PHONE_PLACEHOLDER } from "@/lib/phone";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** The nine national digits. */
  value: string;
  onChange: (digits: string) => void;
};

/**
 * A phone field that shows `+998 (99) 000 00 00` while it holds only the nine
 * national digits. Pasting a full `+998…` number works too.
 */
export function PhoneInput({ value, onChange, placeholder = PHONE_PLACEHOLDER, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={formatPhone(value)}
      placeholder={placeholder}
      onChange={(e) => {
        const typed = e.target.value;
        // Deleting a bracket or space should delete the digit before it, not
        // leave the cursor stuck behind the mask.
        const removedSeparator = typed.length < formatPhone(value).length && phoneDigits(typed) === value;
        onChange(removedSeparator ? value.slice(0, -1) : phoneDigits(typed));
      }}
    />
  );
}
