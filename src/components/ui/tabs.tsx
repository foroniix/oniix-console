"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

function isElement<P = any>(node: unknown): node is React.ReactElement<P> {
  return React.isValidElement(node);
}

type TabsContext = {
  value: string;
  setValue: (v: string) => void;
  id: string;
};
const Ctx = React.createContext<TabsContext | null>(null);

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? (value as string) : internal;

  const setValue = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };

  const id = React.useId();

  React.useEffect(() => {
    if (!current) {
      // pick first TabsTrigger child value if not set
      const first = (() => {
        const arr = React.Children.toArray(children);

        for (const el of arr) {
          if (!isElement(el)) continue;

          // TabsList
          if ((el as any).type?.displayName === "TabsList") {
            const listKids = React.Children.toArray((el as React.ReactElement<any>).props.children).filter(isElement);
            const trig = listKids.find((k: any) => (k as any)?.type?.displayName === "TabsTrigger");
            const v = trig ? (trig.props as any)?.value : undefined;
            if (v) return String(v);
          }
        }

        return "";
      })();

      if (first) setValue(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ value: current, setValue, id }}>
      <div className={cn("w-full", className)}>{children}</div>
    </Ctx.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;
export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center justify-start gap-1 rounded-lg border border-white/10 bg-white/5 p-1",
        className
      )}
      {...props}
    />
  );
}
TabsList.displayName = "TabsList";

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };
export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");
  const selected = ctx.value === value;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();

    const container = (e.currentTarget.parentElement as HTMLElement) || null;
    if (!container) return;

    const buttons = Array.from(container.querySelectorAll("[role=tab]")) as HTMLButtonElement[];
    const idx = buttons.indexOf(e.currentTarget);
    const nextIdx =
      e.key === "ArrowRight" ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;

    buttons[nextIdx]?.focus();

    const nextVal = (buttons[nextIdx] as any)?.dataset?.value as string | undefined;
    if (nextVal) ctx.setValue(nextVal);
  };

  return (
    <button
      role="tab"
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      data-value={value}
      onClick={() => ctx.setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        "min-w-24 rounded-md px-3 py-2 text-sm font-semibold outline-none transition",
        "text-zinc-300 hover:text-white",
        "data-[state=active]:bg-white data-[state=active]:text-[#0B0B0C]",
        "data-[state=inactive]:bg-transparent",
        className
      )}
      {...props}
    />
  );
}
TabsTrigger.displayName = "TabsTrigger";

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & { value: string };
export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("TabsContent must be used inside <Tabs>");
  const selected = ctx.value === value;
  const panelId = `${ctx.id}-panel-${value}`;
  const tabId = `${ctx.id}-tab-${value}`;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!selected}
      className={cn(selected ? "block" : "hidden", className)}
      {...props}
    />
  );
}
TabsContent.displayName = "TabsContent";
