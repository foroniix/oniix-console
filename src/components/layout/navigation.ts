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
    title: "Exploitation",
    items: [
      {
        href: "/dashboard",
        label: "Pilotage",
        description: "Vue d'ensemble des op\u00E9rations",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Cha\u00EEnes TV",
        description: "Catalogue et distribution",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Directs",
        description: "Supervision live",
        icon: RadioTower,
      },
      {
        href: "/programming",
        label: "Programmation",
        description: "Grille et continuit\u00E9",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        href: "/ads",
        label: "Mon\u00E9tisation",
        description: "Inventaire et campagnes",
        icon: Megaphone,
      },
      {
        href: "/revenue",
        label: "Revenus",
        description: "Performance et rendement",
        icon: BadgeDollarSign,
      },
    ],
  },
  {
    title: "\u00C9quipe",
    items: [
      {
        href: "/users",
        label: "\u00C9quipe",
        description: "Acc\u00E8s, r\u00F4les et invitations",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Journal",
        description: "Audit op\u00E9rationnel",
        icon: Activity,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/settings",
        label: "Param\u00E8tres",
        description: "Workspace et s\u00E9curit\u00E9",
        icon: Settings,
      },
    ],
  },
];

const ALL_ROUTES = NAV_SECTIONS.flatMap((section) => section.items);
const AUX_ROUTES: NavItem[] = [
  {
    href: "/tenants",
    label: "\u00C9diteurs",
    description: "Portefeuille multi-\u00E9diteur",
    icon: Database,
  },
  {
    href: "/system",
    label: "Syst\u00E8me",
    description: "Outils plateforme",
    icon: Shield,
  },
  {
    href: "/catalog",
    label: "Catalogue",
    description: "Films, s\u00E9ries et publications",
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
    description: "Pilotage Oniix",
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
