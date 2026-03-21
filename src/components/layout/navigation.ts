import {
  Activity,
  BadgeDollarSign,
  CalendarClock,
  Database,
  Film,
  LayoutDashboard,
  Megaphone,
  RadioTower,
  Settings,
  Shield,
  Tv2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      {
        href: "/dashboard",
        label: "Pilotage",
        description: " ",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaînes TV",
        description: " ",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Directs",
        description: " ",
        icon: RadioTower,
      },
      {
        href: "/programming",
        label: "Programmation",
        description: " ",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Monétisation",
    items: [
      {
        href: "/ads",
        label: "Monétisation",
        description: " ",
        icon: Megaphone,
      },
      {
        href: "/revenue",
        label: "Revenus",
        description: " ",
        icon: BadgeDollarSign,
      },
    ],
  },
  {
    title: "Équipe",
    items: [
      {
        href: "/users",
        label: "Équipe",
        description: " ",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Journal",
        description: " ",
        icon: Activity,
      },
    ],
  },
  {
    title: "Paramètres",
    items: [
      {
        href: "/settings",
        label: "Paramètres",
        description: " ",
        icon: Settings,
      },
    ],
  },
];

const ALL_ROUTES = NAV_SECTIONS.flatMap((section) => section.items);
const AUX_ROUTES: NavItem[] = [
  {
    href: "/tenants",
    label: "Éditeurs",
    description: " ",
    icon: Database,
  },
  {
    href: "/system",
    label: "Système",
    description: " ",
    icon: Shield,
  },
  {
    href: "/series",
    label: "Catalogue",
    description: " ",
    icon: Film,
  },
];

const ROUTE_REGISTRY = [...ALL_ROUTES, ...AUX_ROUTES];

export function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveRoute(pathname: string) {
  const direct = ROUTE_REGISTRY.find((item) => isRouteActive(pathname, item.href));
  if (direct) return direct;
  return {
    href: pathname,
    label: "Console",
    description: " ",
    icon: LayoutDashboard,
  };
}

export function findRouteByQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    ROUTE_REGISTRY.find((item) => {
      const haystack = `${item.label} ${item.description} ${item.href}`.toLowerCase();
      return haystack.includes(normalized);
    }) ?? null
  );
}
