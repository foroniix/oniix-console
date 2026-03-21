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
        description: "Vue d'ensemble des operations",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaînes TV",
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
        description: "Grille et continuite",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        href: "/ads",
        label: "Monetisation",
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
    title: "Equipe",
    items: [
      {
        href: "/users",
        label: "Equipe",
        description: "Acces, roles et invites",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Journal",
        description: "Audit operationnel",
        icon: Activity,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/settings",
        label: "Parametres",
        description: "Workspace et securite",
        icon: Settings,
      },
    ],
  },
];

const ALL_ROUTES = NAV_SECTIONS.flatMap((section) => section.items);
const AUX_ROUTES: NavItem[] = [
  {
    href: "/tenants",
    label: "Editeurs",
    description: "Portefeuille multi-editeur",
    icon: Database,
  },
  {
    href: "/system",
    label: "Systeme",
    description: "Outils plateforme",
    icon: Shield,
  },
  {
    href: "/series",
    label: "Catalogue",
    description: "Actifs programmes",
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
