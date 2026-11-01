"use client";

import { useState } from "react";
import { NativeSelect, NativeSelectOption } from "./native-select";

export function rideTime(hour: string, minute: string, period: string) {
  if (!/^(0?[1-9]|1[0-2])$/.test(hour) || !/^[0-5]\d$/.test(minute) || !/^(AM|PM)$/.test(period)) return "";
  return `${String(Number(hour) % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute}`;
}

export function TimePicker({ id, invalid, describedBy, onChange, onBlur }: {
  id: string;
  invalid?: boolean;
  describedBy: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [parts, setParts] = useState({ hour: "", minute: "00", period: "AM" });
  function update(part: keyof typeof parts, value: string) {
    const next = { ...parts, [part]: value };
    setParts(next);
    onChange(rideTime(next.hour, next.minute, next.period));
  }
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Preferred ride time (IST)">
      <NativeSelect id={id} aria-label="Hour" value={parts.hour} required aria-invalid={invalid || undefined} aria-describedby={describedBy} onBlur={onBlur} onChange={(event) => update("hour", event.target.value)}>
        <NativeSelectOption value="" disabled>Hour</NativeSelectOption>
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => (
          <NativeSelectOption key={hour} value={hour}>{hour}</NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Minute" value={parts.minute} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(event) => update("minute", event.target.value)}>
        {["00", "15", "30", "45"].map((minute) => (
          <NativeSelectOption key={minute} value={minute}>{minute}</NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="AM or PM" value={parts.period} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(event) => update("period", event.target.value)}>
        <NativeSelectOption value="AM">AM</NativeSelectOption>
        <NativeSelectOption value="PM">PM</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
