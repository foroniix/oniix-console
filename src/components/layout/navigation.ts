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
        description: "Audience, direct et opérations",
        icon: LayoutDashboard,
      },
      {
        href: "/channels",
        label: "Chaînes TV",
        description: "Catalogue, branding et accès",
        icon: Tv2,
      },
      {
        href: "/streams",
        label: "Directs",
        description: "Flux live et qualité de diffusion",
        icon: RadioTower,
      },
      {
        href: "/programming",
        label: "Programmation",
        description: "Grille, now/next et replays",
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
        description: "Campagnes, créations et décision",
        icon: Megaphone,
      },
      {
        href: "/revenue",
        label: "Revenus",
        description: "Suivi business et performance",
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
        description: "Membres, rôles et invitations",
        icon: Users,
      },
      {
        href: "/activities",
        label: "Journal",
        description: "Audit et opérations",
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
        description: "Compte, sécurité et organisation",
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
    description: "Portefeuille multi-éditeur",
    icon: Database,
  },
  {
    href: "/system",
    label: "Système",
    description: "Santé plateforme et supervision",
    icon: Shield,
  },
  {
    href: "/series",
    label: "Catalogue",
    description: "Séries et univers éditoriaux",
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
    description: "Pilotage OTT multi-éditeur",
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
