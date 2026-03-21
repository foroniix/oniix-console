import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[16px] border text-sm font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-[#7ab7ff]/40 focus-visible:ring-[4px] focus-visible:ring-[#7ab7ff]/18 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-[#8ebeff]/10 bg-[linear-gradient(180deg,#7ab7ff,#4f8fff)] text-[#04111f] shadow-[0_16px_30px_rgba(79,143,255,0.28)] hover:-translate-y-px hover:brightness-105",
        destructive:
          "border-rose-500/30 bg-rose-500/14 text-rose-100 hover:bg-rose-500/20 focus-visible:ring-rose-500/16",
        outline:
          "border-white/10 bg-white/[0.04] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#406489] hover:bg-white/[0.08]",
        secondary:
          "border-white/8 bg-white/[0.07] text-slate-100 hover:bg-white/[0.11]",
        ghost:
          "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white",
        link: "border-transparent px-0 text-[var(--brand-primary)] hover:text-white hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-8 rounded-[14px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-[18px] px-5 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-8 rounded-[14px]",
        "icon-lg": "size-11 rounded-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
