"use client";

import {
  Bell,
  ChevronRight,
  Command as CommandIcon,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  Search,
  Settings,
  Tv,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- CONFIGURATION ---
const ROUTE_NAMES: Record<string, string> = {
  "/": "Vue d'ensemble",
  "/movies": "Catalogue Films",
  "/series": "Catalogue Séries",
  "/channels": "Chaînes TV",
  "/streams": "Gestion des Flux",
  "/news": "Actualités & Blog",
  "/users": "Utilisateurs",
  "/activities": "Journal d'activités",
  "/settings": "Configuration",
};

// Données de navigation pour la recherche
const SEARCH_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Tv, label: "Chaînes TV", href: "/channels" },
  { icon: Radio, label: "Flux & Streams", href: "/streams" },
  { icon: Users, label: "Utilisateurs", href: "/users" },
  { icon: FileText, label: "Actualités", href: "/news" },
  { icon: Settings, label: "Paramètres", href: "/settings" },
];

// Mock Notifications
const NOTIFICATIONS = [
  { id: 1, title: "Flux coupé", desc: "Caméra 01 a perdu le signal", time: "2 min", type: "error" },
  { id: 2, title: "Nouveau user", desc: "Jean D. s'est inscrit", time: "1h", type: "info" },
  { id: 3, title: "Backup réussi", desc: "Sauvegarde journalière ok", time: "3h", type: "success" },
];

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // ✅ Mobile drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currentPage =
    ROUTE_NAMES[pathname] || pathname.split("/").pop() || "Dashboard";

  // Gestion du raccourci clavier CMD+K / CTRL+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // ✅ Ferme le drawer quand la route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Fonction de navigation via la recherche
  const handleNavigate = (href: string) => {
    router.push(href);
    setIsSearchOpen(false);
    setQuery("");
  };

  // Filtrage des résultats de recherche
  const filteredItems = useMemo(() => {
    return SEARCH_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <>
      {/* ✅ Drawer sidebar mobile */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileNavOpen(false)}
          />
          {/* panel */}
          <div className="absolute left-0 top-0 h-full w-[280px] border-r border-white/10 bg-[#0A0B0D]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <div className="text-sm font-semibold text-zinc-100">Oniix</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="h-[calc(100%-52px)] overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-md transition-all">
        {/* --- GAUCHE: hamburger + fil d'ariane --- */}
        <div className="flex items-center gap-3 min-w-0">
          {/* ✅ Hamburger mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* --- FIL D'ARIANE --- */}
          <div className="flex items-center gap-2 text-sm text-zinc-500 min-w-0">
            <span
              className="hover:text-zinc-300 transition-colors cursor-pointer truncate"
              onClick={() => router.push("/")}
            >
              Oniix
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
            <span className="font-medium text-zinc-100 truncate">
              {currentPage}
            </span>
          </div>
        </div>

        {/* --- DROITE: actions --- */}
        <div className="flex items-center gap-4">
          {/* Déclencheur Recherche (desktop) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-md border border-white/5 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all w-64 group"
          >
            <Search className="h-3.5 w-3.5 group-hover:text-indigo-400 transition-colors" />
            <span className="flex-1 text-left">Rechercher...</span>
            <div className="flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 border border-white/5 group-hover:bg-zinc-700 group-hover:text-white transition-colors">
              <CommandIcon className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </button>

          {/* ✅ Recherche en mobile: icône */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Button>

          <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

          <div className="flex items-center gap-2">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-white/5 h-9 w-9 relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {NOTIFICATIONS.length > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border border-zinc-950 animate-pulse" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-zinc-950 border-zinc-800 text-zinc-100"
              >
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  <Badge
                    variant="outline"
                    className="text-[10px] border-zinc-700 text-zinc-400"
                  >
                    {NOTIFICATIONS.length} nouvelles
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <div className="max-h-[300px] overflow-y-auto">
                  {NOTIFICATIONS.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className="cursor-pointer focus:bg-zinc-900 p-3 flex flex-col items-start gap-1 border-b border-zinc-900 last:border-0"
                    >
                      <div className="flex justify-between w-full items-center">
                        <span
                          className={`text-xs font-bold ${
                            notif.type === "error"
                              ? "text-rose-400"
                              : notif.type === "success"
                              ? "text-emerald-400"
                              : "text-blue-400"
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {notif.time}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {notif.desc}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="justify-center text-xs text-zinc-500 focus:text-white cursor-pointer focus:bg-zinc-900">
                  Voir tout l'historique
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Aide Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-white/5 h-9 w-9"
                  aria-label="Aide"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              >
                <DropdownMenuItem className="cursor-pointer focus:bg-zinc-900">
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-zinc-900">
                  Raccourcis Clavier
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-zinc-900 text-indigo-400">
                  Contacter le Support
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* --- COMMAND PALETTE (MODAL) --- */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="p-0 gap-0 bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[550px] overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex items-center border-b border-white/10 px-4 py-3">
            <Search className="mr-2 h-5 w-5 text-zinc-500" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
              placeholder="Tapez une commande ou cherchez..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">
              ESC
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-500">
                Aucun résultat pour "{query}"
              </div>
            ) : (
              <>
                <div className="mb-2 px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Navigation Rapide
                </div>
                {filteredItems.map((item) => (
                  <div
                    key={item.href}
                    onClick={() => handleNavigate(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors group"
                  >
                    <item.icon className="h-4 w-4 text-zinc-500 group-hover:text-white/80" />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </>
            )}

            {/* Actions rapides contextuelles (Exemple) */}
            <div className="mt-4 mb-2 px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-t border-white/5 pt-2">
              Actions
            </div>
            <div
              onClick={() => {
                /* Logique déconnexion */
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:bg-rose-900/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Se déconnecter</span>
            </div>
          </div>

          <div className="border-t border-white/5 bg-zinc-900/50 px-4 py-2 text-[10px] text-zinc-500 flex justify-between">
            <span>Utilisez les flèches pour naviguer</span>
            <span>Oniix Admin v2.1</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
