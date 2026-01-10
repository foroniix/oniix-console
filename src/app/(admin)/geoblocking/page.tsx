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
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <GlobeLock className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Géo-blocage</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Gérez les restrictions d'accès à votre contenu basées sur la localisation IP des utilisateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE: CONFIGURATION GÉNÉRALE */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Statut du Service</CardTitle>
              <CardDescription className="text-xs">Activez ou désactivez globalement les restrictions.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Protection Active</span>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-rose-400">Mode de Restriction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-md bg-white/5 border border-white/10">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase">Liste Noire (Blacklist)</p>
                  <p className="text-[11px] text-zinc-400">Bloquer uniquement les pays sélectionnés.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md hover:bg-white/5 border border-transparent transition-all cursor-pointer">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase">Liste Blanche (Whitelist)</p>
                  <p className="text-[11px] text-zinc-400">Autoriser uniquement les pays sélectionnés.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLONNE DROITE: GESTION DES PAYS */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900/50 border-zinc-800 h-full">
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
                  className="pl-10 bg-zinc-950 border-zinc-800 text-sm focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                {/* Exemple de pays */}
                {["Russie", "Chine", "Corée du Nord"].map((country) => (
                  <div key={country} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-6 bg-zinc-800 rounded flex items-center justify-center text-[10px] font-bold">
                        {country.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{country}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-rose-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                  Note : Le géo-blocage est basé sur les bases de données MaxMind GeoIP. La précision est d'environ 99.8% au niveau national.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}