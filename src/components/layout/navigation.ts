import {
  Activity,
  BadgeDollarSign,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  RadioTower,
  Settings,
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
        label: "Dashboard",
        description: "Vue d'ensemble et analytics",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaînes",
        description: "Catalogue et branding",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Direct",
        description: "Pilotage des flux live",
        icon: RadioTower,
      },
      {
        href: "/programming",
        label: "Programmation",
        description: "Grille et diffusion",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Monetisation",
    items: [
      {
        href: "/ads",
        label: "Publicité",
        description: "Campagnes et créas",
        icon: Megaphone,
      },
      {
        href: "/revenue",
        label: "Revenus",
        description: "Monétisation et KPI",
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
        description: "Membres et invitations",
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
        description: "Compte et sécurité",
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
    description: "Pilotage SaaS OTT",
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
