"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function isElement<P extends object = Record<string, unknown>>(
  node: unknown
): node is React.ReactElement<P> {
  return React.isValidElement(node);
}

type TabsListChildProps = {
  children?: React.ReactNode;
};

type TabsTriggerChildProps = {
  value?: string;
};

type TabsContextValue = {
  id: string;
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue ?? "");
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;
  const id = React.useId();

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (!controlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [controlled, onValueChange]
  );

  React.useEffect(() => {
    if (currentValue) return;

    const firstValue = (() => {
      const rootChildren = React.Children.toArray(children);

      for (const child of rootChildren) {
        if (
          !isElement<TabsListChildProps>(child) ||
          (child.type as { displayName?: string }).displayName !== "TabsList"
        ) {
          continue;
        }

        const listChildren = React.Children.toArray(child.props.children).filter((listChild) =>
          isElement<TabsTriggerChildProps>(listChild)
        );
        const trigger = listChildren.find(
          (listChild) => (listChild.type as { displayName?: string }).displayName === "TabsTrigger"
        );
        const nextValue = trigger?.props.value;
        if (nextValue) return String(nextValue);
      }

      return "";
    })();

    if (firstValue) setValue(firstValue);
  }, [children, currentValue, setValue]);

  return (
    <TabsContext.Provider value={{ id, value: currentValue, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-[20px] border border-white/10 bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
      {...props}
    />
  );
}

TabsList.displayName = "TabsList";

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");

  const selected = ctx.value === value;
  const tabId = `${ctx.id}-tab-${value}`;
  const panelId = `${ctx.id}-panel-${value}`;

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();

    const container = event.currentTarget.parentElement;
    if (!container) return;

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("[role=tab]"));
    const currentIndex = buttons.indexOf(event.currentTarget);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % buttons.length
        : (currentIndex - 1 + buttons.length) % buttons.length;

    const nextButton = buttons[nextIndex];
    nextButton?.focus();

    const nextValue = nextButton?.dataset.value;
    if (nextValue) ctx.setValue(nextValue);
  };

  return (
    <button
      role="tab"
      id={tabId}
      aria-controls={panelId}
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      data-value={value}
      onClick={() => ctx.setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        "min-w-24 rounded-[16px] px-3.5 py-2 text-sm font-semibold outline-none transition-all",
        "text-slate-400 hover:text-white data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_12px_24px_rgba(15,23,42,0.12)]",
        className
      )}
      {...props}
    />
  );
}

TabsTrigger.displayName = "TabsTrigger";

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
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
