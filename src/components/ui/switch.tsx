"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all data-[state=checked]:bg-[linear-gradient(180deg,#7ab7ff,#4f8fff)] data-[state=unchecked]:bg-white/10 focus-visible:border-[#7ab7ff]/40 focus-visible:ring-[4px] focus-visible:ring-[#7ab7ff]/18 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.22)] transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
