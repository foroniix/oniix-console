"use client";

import { useMemo, useState } from "react";
import { GlobeLock, Info, Plus, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type RestrictionMode = "blacklist" | "whitelist";

type CountryRule = {
  code: string;
  name: string;
};

const INITIAL_COUNTRIES: CountryRule[] = [
  { code: "RU", name: "Russie" },
  { code: "CN", name: "Chine" },
  { code: "KP", name: "Coree du Nord" },
];

const MODE_COPY: Record<
  RestrictionMode,
  { label: string; title: string; description: string; hint: string; icon: typeof ShieldAlert }
> = {
  blacklist: {
    label: "Liste noire",
    title: "Bloquer uniquement les pays listes",
    description: "Mode adapte quand la diffusion est autorisee globalement, sauf exceptions juridiques ou contractuelles.",
    hint: "Usage recommande pour les zones sous restriction ponctuelle.",
    icon: ShieldAlert,
  },
  whitelist: {
    label: "Liste blanche",
    title: "N autoriser que les pays listes",
    description: "Mode adapte quand la diffusion doit etre reservee a un territoire negocie ou a un perimetre B2B ferme.",
    hint: "Usage recommande pour les droits territoriaux stricts.",
    icon: ShieldCheck,
  },
};

function normalizeCountryCode(value: string) {
  return value.trim().slice(0, 2).toUpperCase();
}

export default function GeoBlockingPage() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [mode, setMode] = useState<RestrictionMode>("blacklist");
  const [query, setQuery] = useState("");
  const [draftCountry, setDraftCountry] = useState("");
  const [countries, setCountries] = useState<CountryRule[]>(INITIAL_COUNTRIES);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countries;

    return countries.filter((country) => {
      return (
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [countries, query]);

  const addCountry = () => {
    const trimmed = draftCountry.trim();
    if (!trimmed) return;

    const nextCode = normalizeCountryCode(trimmed);
    const alreadyExists = countries.some((country) => country.code === nextCode || country.name.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      setDraftCountry("");
      return;
    }

    setCountries((current) => [...current, { code: nextCode, name: trimmed }]);
    setDraftCountry("");
  };

  const removeCountry = (code: string) => {
    setCountries((current) => current.filter((country) => country.code !== code));
  };

  const resetFilter = () => setQuery("");
  const modeCopy = MODE_COPY[mode];
  const protectionLabel = isEnabled ? "Protection active" : "Protection en pause";
  const ModeIcon = modeCopy.icon;

  return (
    <PageShell>
      <PageHeader
        title="Geo-blocage"
        subtitle="Cadrez l exposition territoriale de vos flux et donnez une lecture claire des restrictions en production."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Geo-blocage" }]}
        icon={<GlobeLock className="size-5" />}
        actions={
          <Button variant="outline" onClick={() => setIsEnabled((current) => !current)}>
            {isEnabled ? "Suspendre" : "Reactiver"}
          </Button>
        }
      />

      <KpiRow>
        <KpiCard
          label="Etat"
          value={protectionLabel}
          hint="Le moteur de restriction s applique au niveau de la diffusion."
          tone={isEnabled ? "success" : "warning"}
          icon={<GlobeLock className="size-4" />}
        />
        <KpiCard
          label="Mode"
          value={modeCopy.label}
          hint={modeCopy.hint}
          tone="info"
          icon={<ModeIcon className="size-4" />}
        />
        <KpiCard
          label="Pays listes"
          value={countries.length}
          hint="Nombre total de territoires explicitement traites."
          icon={<ShieldCheck className="size-4" />}
        />
        <KpiCard
          label="Resultats visibles"
          value={filteredCountries.length}
          hint="Resultat courant selon le filtre local."
          icon={<Search className="size-4" />}
        />
      </KpiRow>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configuration de service</CardTitle>
            <CardDescription>
              Activez le controle geo-IP et choisissez la logique d application la plus adaptee aux droits en cours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Protection territoriale</p>
                <p className="text-sm text-slate-400">Coupe ou autorise l acces selon la provenance IP detectee.</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="grid gap-3">
              {(["blacklist", "whitelist"] as RestrictionMode[]).map((candidate) => {
                const copy = MODE_COPY[candidate];
                const Icon = copy.icon;
                const selected = candidate === mode;

                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setMode(candidate)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      selected
                        ? "border-[var(--brand-primary)]/35 bg-[var(--brand-primary)]/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-slate-100">
                        <Icon className="size-4" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{copy.title}</p>
                          {selected ? <Badge>Actif</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-400">{copy.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-sky-400/18 bg-sky-500/10 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-sky-400/20 bg-sky-500/14 text-sky-100">
                  <Info className="size-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-sky-50">Precision geo-IP</p>
                  <p className="text-sm text-sky-100/75">
                    Les decisions s appuient sur la geolocalisation IP. Conservez un journal des exceptions pour les flux premium ou contractuellement sensibles.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DataTableShell
          title="Territoires controles"
          description="Liste operationnelle des pays explicitement rattaches a la politique active."
          isEmpty={filteredCountries.length === 0}
          emptyTitle="Aucun pays visible"
          emptyDescription="Ajoutez un territoire ou retirez le filtre courant pour reprendre la main."
        >
          <FilterBar onReset={resetFilter} resetDisabled={!query}>
            <div className="min-w-[220px] flex-1">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher par nom ou code ISO"
              />
            </div>
            <div className="flex min-w-[260px] flex-1 items-center gap-2">
              <Input
                value={draftCountry}
                onChange={(event) => setDraftCountry(event.target.value)}
                placeholder="Ajouter un pays ou un code"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCountry();
                  }
                }}
              />
              <Button type="button" onClick={addCountry}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
          </FilterBar>

          <div className="grid gap-3 p-4">
            {filteredCountries.map((country) => (
              <div
                key={country.code}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex h-10 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-xs font-semibold tracking-[0.14em] text-slate-300">
                    {country.code}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{country.name}</p>
                    <p className="text-xs text-slate-500">
                      {mode === "blacklist" ? "Acces coupe depuis ce territoire." : "Acces autorise uniquement pour ce territoire."}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removeCountry(country.code)} title="Retirer">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </DataTableShell>
      </section>
    </PageShell>
  );
}
