"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listActivities, type Activity } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Activity as ActivityIcon,
  Clapperboard,
  Clock,
  Edit,
  Filter,
  Newspaper,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Signal,
  StopCircle,
  Terminal,
  Trash2,
  User as UserIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const TARGET_ICONS = {
  STREAM: Signal,
  USER: UserIcon,
  NEWS: Newspaper,
  VOD: Clapperboard,
} as const;

export default function ActivitiesPage() {
  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listActivities();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtrage dynamique
  const filtered = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(search.toLowerCase()) || 
        (item.userId || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesType = filterType === "ALL" ? true : item.targetType === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [data, search, filterType]);

  return (
    <div className="console-page font-sans">
      
      {/* --- HEADER --- */}
      <header className="console-hero flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center sm:p-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            <Terminal className="h-8 w-8 text-indigo-500" />
            Journal d&apos;Activités
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Journal d’audit et historique des actions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={load}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* --- FILTERS --- */}
      <div className="console-toolbar flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher une action, un ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="console-field pl-9 focus:ring-indigo-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="console-field w-[180px]">
              <SelectValue placeholder="Type de cible" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
              <SelectItem value="ALL">Tout voir</SelectItem>
              <SelectItem value="STREAM">Flux & Live</SelectItem>
              <SelectItem value="USER">Utilisateurs</SelectItem>
              <SelectItem value="NEWS">News & Contenu</SelectItem>
              <SelectItem value="VOD">VOD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- TIMELINE LIST --- */}
      <div className="relative space-y-4">
        {/* Ligne verticale de timeline */}
        <div className="absolute bottom-4 left-6 top-4 hidden w-px bg-slate-200 md:block dark:bg-white/10" />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
             <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
             <p>Chargement de l&apos;historique...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-slate-50/80 py-20 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
             <ActivityIcon className="w-12 h-12 mb-4 opacity-20" />
             <p>Aucune activité trouvée pour ces critères.</p>
          </div>
        ) : (
          filtered.map((activity, index) => (
            <ActivityItem key={activity.id || index} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANT : ELEMENT DE LISTE ---

function ActivityItem({ activity }: { activity: Activity }) {
  // Helpers pour le style selon l'action
  const getActionStyle = (act: string) => {
    switch (act) {
      case 'CREATE': return { icon: PlusCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'DELETE': return { icon: Trash2, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
      case 'UPDATE': return { icon: Edit, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
      case 'START': return { icon: PlayCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' };
      case 'END': return { icon: StopCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'PUBLISH': return { icon: Signal, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
      default: return { icon: ActivityIcon, color: 'text-slate-500 dark:text-slate-400', bg: 'border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]' };
    }
  };

  const style = getActionStyle(activity.action);
  const TargetIcon = TARGET_ICONS[activity.targetType as keyof typeof TARGET_ICONS] ?? Terminal;
  const dateObj = new Date(activity.createdAt);

  return (
    <div className="relative pl-0 md:pl-12 group">
      
      {/* Point sur la timeline (Desktop uniquement) */}
      <div className={`absolute left-[21px] top-6 z-10 hidden h-3 w-3 rounded-full border-2 border-[#edf3f8] ${style.color.replace('text-', 'bg-')} ring-4 ring-[#edf3f8] md:block dark:border-[#08111c] dark:ring-[#08111c]`} />

      <div className="flex flex-col items-start gap-4 rounded-[24px] border border-slate-200/80 bg-white/80 p-4 transition-all duration-200 hover:bg-white md:flex-row md:items-center dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]">
        
        {/* 1. User Info */}
        <div className="flex items-center gap-3 w-full md:w-48 shrink-0">
          <Avatar className="h-10 w-10 border border-slate-200 dark:border-white/10">
            {activity.userId ? (
               <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} />
            ) : null}
            <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-white">
               {activity.userId ? 'U' : 'SYS'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {activity.userId ? "Utilisateur" : "Système"}
            </span>
          </div>
        </div>

        {/* 2. Action Badge */}
        <div className="shrink-0">
          <Badge variant="outline" className={cn("flex items-center gap-1.5 px-2.5 py-1", style.bg, style.color)}>
            <style.icon className="w-3.5 h-3.5" />
            {activity.action}
          </Badge>
        </div>

        {/* 3. Details & Target */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
             <TargetIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
             <span className="font-medium truncate">{activity.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            <span>ID: {activity.targetId}</span>
            <span>•</span>
            <span>{activity.targetType}</span>
          </div>
        </div>

        {/* 4. Timestamp */}
        <div className="flex w-full shrink-0 items-center justify-end gap-2 text-right text-xs text-slate-500 md:w-auto md:flex-col md:items-end md:gap-0.5 dark:text-slate-400">
           <div className="flex items-center gap-1.5">
             <Clock className="h-3 w-3" />
             <span className="font-medium text-slate-600 dark:text-slate-300">
               {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
           </div>
           <span>
             {dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
           </span>
        </div>

      </div>
    </div>
  );
}
