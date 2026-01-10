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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-8 font-sans">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-indigo-500" />
            Journal d'Activités
          </h1>
          <p className="text-zinc-400 mt-1 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            Audit trail & Historique des actions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={load}
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* --- FILTERS --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/30 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Rechercher une action, un ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 focus:ring-indigo-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-500" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Type de cible" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
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
        <div className="absolute left-6 top-4 bottom-4 w-px bg-white/5 md:block hidden" />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
             <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
             <p>Chargement de l'historique...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/20 rounded-xl border border-dashed border-white/5">
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
      default: return { icon: ActivityIcon, color: 'text-zinc-400', bg: 'bg-zinc-800 border-white/5' };
    }
  };

  // Helper pour l'icône de cible
  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'STREAM': return Signal;
      case 'USER': return UserIcon;
      case 'NEWS': return Newspaper;
      case 'VOD': return Clapperboard;
      default: return Terminal;
    }
  };

  const style = getActionStyle(activity.action);
  const TargetIcon = getTargetIcon(activity.targetType);
  const dateObj = new Date(activity.createdAt);

  return (
    <div className="relative pl-0 md:pl-12 group">
      
      {/* Point sur la timeline (Desktop uniquement) */}
      <div className={`absolute left-[21px] top-6 w-3 h-3 rounded-full border-2 border-zinc-950 ${style.color.replace('text-', 'bg-')} z-10 hidden md:block ring-4 ring-zinc-950`} />

      <div className="bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/5 rounded-xl p-4 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center gap-4 group-hover:border-white/10">
        
        {/* 1. User Info */}
        <div className="flex items-center gap-3 w-full md:w-48 shrink-0">
          <Avatar className="h-10 w-10 border border-white/10">
            {activity.userId ? (
               <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} />
            ) : null}
            <AvatarFallback className="bg-zinc-800">
               {activity.userId ? 'U' : 'SYS'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-zinc-200 truncate">
              {activity.userId ? 'Admin User' : 'System'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {activity.userId ? activity.userId.slice(0, 8) : 'AUTO'}
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
          <div className="flex items-center gap-2 text-zinc-300">
             <TargetIcon className="w-4 h-4 text-zinc-500" />
             <span className="font-medium truncate">{activity.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-mono">
            <span>ID: {activity.targetId}</span>
            <span>•</span>
            <span>{activity.targetType}</span>
          </div>
        </div>

        {/* 4. Timestamp */}
        <div className="w-full md:w-auto text-right shrink-0 flex items-center justify-end gap-2 text-zinc-500 text-xs md:flex-col md:items-end md:gap-0.5">
           <div className="flex items-center gap-1.5">
             <Clock className="w-3 h-3" />
             <span className="font-medium text-zinc-400">
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