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
        description: "Vue opérationnelle",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaînes",
        description: "Inventaire des chaînes",
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
    title: "Monétisation",
    items: [
      {
        href: "/ads",
        label: "Publicité",
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
    title: "Équipe",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        description: "Membres et permissions",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Activité",
        description: "Journal et audit",
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
    description: "Pilotage de diffusion",
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
