"use client";

import React, { useRef } from "react";

import { formatNational, phoneDigits, NATIONAL_PLACEHOLDER } from "@/lib/phone";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** The nine national digits. */
  value: string;
  onChange: (digits: string) => void;
};

/**
 * A phone field with `+998` fixed in front and `(99) 000 00 00` typed after it.
 *
 * The prefix is part of the field, not of the placeholder: with only a
 * placeholder people could not tell it was already there and started with `+`
 * or `998` themselves. `className` styles the whole box, so callers keep the
 * look they had; pasting a full `+998…` number still works.
 */
export function PhoneInput({ value, onChange, placeholder = NATIONAL_PLACEHOLDER, className = "", ...rest }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`flex items-center gap-1.5 cursor-text ${className}`} onClick={() => input.current?.focus()}>
      <span className="shrink-0 select-none">+998</span>
      <input
        {...rest}
        ref={input}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatNational(value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 p-0 outline-none focus:ring-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        onChange={(e) => {
          const typed = e.target.value;
          // Deleting a bracket or space should delete the digit before it, not
          // leave the cursor stuck behind the mask.
          const removedSeparator = typed.length < formatNational(value).length && phoneDigits(typed) === value;
          onChange(removedSeparator ? value.slice(0, -1) : phoneDigits(typed));
        }}
      />
    </div>
  );
}
