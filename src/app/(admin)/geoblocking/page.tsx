"use client";

import React, { useState } from "react";
import { 
  GlobeLock, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Plus, 
  Trash2, 
  Info 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GeoBlockingPage() {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <div className="console-page">
      {/* HEADER SECTION */}
      <div className="console-hero flex flex-col gap-2 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.05]">
            <GlobeLock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Géo-blocage</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gérez les restrictions d'accès à votre contenu basées sur la localisation IP des utilisateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE: CONFIGURATION GÉNÉRALE */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Statut du Service</CardTitle>
              <CardDescription className="text-xs">Activez ou désactivez globalement les restrictions.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">Protection active</span>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-rose-400">Mode de Restriction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase">Liste Noire (Blacklist)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Bloquer uniquement les pays sélectionnés.</p>
                </div>
              </div>
              <div className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase">Liste Blanche (Whitelist)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Autoriser uniquement les pays sélectionnés.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLONNE DROITE: GESTION DES PAYS */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Pays Restreints</CardTitle>
                <CardDescription className="text-xs">Ajoutez les pays qui ne pourront pas accéder au flux.</CardDescription>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un pays
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input 
                  placeholder="Rechercher un pays..." 
                  className="console-field pl-10 text-sm focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                {/* Exemple de pays */}
                {["Russie", "Chine", "Corée du Nord"].map((country) => (
                  <div key={country} className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition-all hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-8 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-white/[0.08] dark:text-white">
                        {country.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{country}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-500 dark:text-slate-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                <p className="text-[11px] leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
                  Note : Le géo-blocage est basé sur les bases de données MaxMind GeoIP. La précision est d'environ 99,8 % au niveau national.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
