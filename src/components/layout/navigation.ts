import {
  Activity,
  BadgeDollarSign,
  LayoutDashboard,
  RadioTower,
  Settings,
  ShieldCheck,
  Tv2,
  Users,
  Building2,
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
    title: "Control Plane",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Vue plateforme multi-tenant",
        icon: LayoutDashboard,
      },
      {
        href: "/tenants",
        label: "Tenants",
        description: "Portefeuille editeurs TV",
        icon: Building2,
      },
      {
        href: "/activities",
        label: "Activites",
        description: "Audit et operationnel",
        icon: Activity,
      },
    ],
  },
  {
    title: "Broadcast",
    items: [
      {
        href: "/channels",
        label: "Chaines",
        description: "Inventaire des chaines",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Streams",
        description: "Etat flux & signaux",
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
    title: "Gouvernance",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        description: "IAM et roles",
        icon: Users,
      },
      {
        href: "/system",
        label: "Systeme",
        description: "Sante plateforme",
        icon: ShieldCheck,
      },
      {
        href: "/settings",
        label: "Configuration",
        description: "Parametres globaux",
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
    description: "Pilotage plateforme",
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

