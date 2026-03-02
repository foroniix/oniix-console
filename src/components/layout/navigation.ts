import {
  Activity,
  BadgeDollarSign,
  LayoutDashboard,
  RadioTower,
  Settings,
  Tv2,
  Users,
  CalendarClock,
  Megaphone,
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
        label: "Dashboard",
        description: "Vue operationnelle",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaines",
        description: "Inventaire des chaines",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Direct",
        description: "Supervision des flux HLS",
        icon: RadioTower,
      },
      {
        href: "/programming",
        label: "Programmation",
        description: "Grille et pilotage",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Monetisation",
    items: [
      {
        href: "/ads",
        label: "Publicite",
        description: "Inventaire ad & campagnes",
        icon: Megaphone,
      },
      {
        href: "/revenue",
        label: "Revenus",
        description: "Performance business",
        icon: BadgeDollarSign,
      },
    ],
  },
  {
    title: "Equipe",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        description: "Membres et permissions",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Activite",
        description: "Journal et audit",
        icon: Activity,
      },
    ],
  },
  {
    title: "Parametres",
    items: [
      {
        href: "/settings",
        label: "Parametres",
        description: "Configuration du workspace",
        icon: Settings,
      },
    ],
  },
];

const ALL_ROUTES = NAV_SECTIONS.flatMap((section) => section.items);

export function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveRoute(pathname: string) {
  const direct = ALL_ROUTES.find((item) => isRouteActive(pathname, item.href));
  if (direct) return direct;
  return {
    href: pathname,
    label: "Console",
    description: "Pilotage diffusion",
    icon: LayoutDashboard,
  };
}

export function findRouteByQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return (
    ALL_ROUTES.find((item) => {
      const haystack = `${item.label} ${item.description} ${item.href}`.toLowerCase();
      return haystack.includes(normalized);
    }) ?? null
  );
}
