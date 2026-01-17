"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, UserPlus, Link as LinkIcon, RefreshCw, Search, MoreVertical, Mail, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Si tu utilises "sonner" (shadcn), c'est top pour les toasts.
// Sinon tu peux remplacer toast(...) par setMsg(...)
import { toast } from "sonner";

type Member = { user_id: string; email: string | null; role: string; created_at: string };
type Invite = {
  id: string;
  email: string;
  role: string;
  code: string;
  status: string;
  created_at: string;
  expires_at: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) ? t < Date.now() : false;
}

function statusBadge(inv: Invite) {
  const s = (inv.status || "").toLowerCase();
  const expired = isExpired(inv.expires_at);

  if (expired) return <Badge variant="destructive">Expirée</Badge>;
  if (s.includes("accepted")) return <Badge variant="secondary">Acceptée</Badge>;
  if (s.includes("pending")) return <Badge>En attente</Badge>;
  if (s.includes("revoked") || s.includes("canceled")) return <Badge variant="outline">Révoquée</Badge>;

  return <Badge variant="outline">{inv.status || "-"}</Badge>;
}

function roleLabel(role?: string | null) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "Administrateur";
  if (r === "member") return "Membre";
  return role || "-";
}

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busyInvite, setBusyInvite] = useState(false);

  // ui state
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "invites" | "create">("members");

  // search + pagination
  const [qMembers, setQMembers] = useState("");
  const [qInvites, setQInvites] = useState("");
  const [membersPage, setMembersPage] = useState(1);
  const [invitesPage, setInvitesPage] = useState(1);
  const PAGE_SIZE = 10;

  // actions busy
  const [busyDeleteMember, setBusyDeleteMember] = useState<string | null>(null);
  const [busyInviteAction, setBusyInviteAction] = useState<string | null>(null);

  // confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMember, setConfirmMember] = useState<Member | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const inviteLink = (code: string) => `${origin}/accept-invite?code=${encodeURIComponent(code)}`;

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [mRes, iRes] = await Promise.all([
        fetch("/api/tenant/members", { cache: "no-store" }),
        fetch("/api/tenant/invites", { cache: "no-store" }),
      ]);

      const mJson = await mRes.json().catch(() => null);
      const iJson = await iRes.json().catch(() => null);

      if (!mRes.ok || !mJson?.ok) throw new Error(mJson?.error || "Erreur chargement membres");
      if (!iRes.ok || !iJson?.ok) throw new Error(iJson?.error || "Erreur chargement invites");

      setMembers(mJson.members ?? []);
      setInvites(iJson.invites ?? []);
    } catch (e: any) {
      setErr(e?.message || "Impossible de charger les membres/invites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => email.trim().includes("@") && !busyInvite, [email, busyInvite]);

  const stats = useMemo(() => {
    const pending = invites.filter((i) => (i.status || "").toLowerCase().includes("pending") && !isExpired(i.expires_at)).length;
    const expired = invites.filter((i) => isExpired(i.expires_at)).length;
    const admins = members.filter((m) => (m.role || "").toLowerCase() === "admin").length;
    return { pending, expired, admins, members: members.length, invites: invites.length };
  }, [members, invites]);

  const filteredMembers = useMemo(() => {
    const q = qMembers.trim().toLowerCase();
    const list = [...members].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (!q) return list;
    return list.filter((m) => {
      const email = (m.email || "").toLowerCase();
      const role = (m.role || "").toLowerCase();
      const label = roleLabel(m.role).toLowerCase();
      return email.includes(q) || role.includes(q) || label.includes(q);
    });
  }, [members, qMembers]);

  const filteredInvites = useMemo(() => {
    const q = qInvites.trim().toLowerCase();
    const list = [...invites].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (!q) return list;
    return list.filter((i) => {
      const email = i.email.toLowerCase();
      const role = (i.role || "").toLowerCase();
      const label = roleLabel(i.role).toLowerCase();
      const status = (i.status || "").toLowerCase();
      return email.includes(q) || role.includes(q) || label.includes(q) || status.includes(q);
    });
  }, [invites, qInvites]);

  const membersPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const invitesPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));

  const membersSlice = filteredMembers.slice((membersPage - 1) * PAGE_SIZE, membersPage * PAGE_SIZE);
  const invitesSlice = filteredInvites.slice((invitesPage - 1) * PAGE_SIZE, invitesPage * PAGE_SIZE);

  useEffect(() => {
    // si filtre réduit, on évite page out of range
    setMembersPage((p) => Math.min(p, membersPages));
  }, [membersPages]);

  useEffect(() => {
    setInvitesPage((p) => Math.min(p, invitesPages));
  }, [invitesPages]);

  const copy = async (text: string, label = "Copié") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const createInvite = async () => {
    setBusyInvite(true);
    setErr("");
    try {
      const res = await fetch("/api/tenant/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur création invite");

      const url = json.invite_url || inviteLink(json.code || "");
      toast.success("Invitation créée");
      if (url) await copy(url, "Lien d’invite copié");

      setEmail("");
      setActiveTab("invites");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyInvite(false);
    }
  };

  const askRemoveMember = (m: Member) => {
    setConfirmMember(m);
    setConfirmOpen(true);
  };

  const removeMember = async (userId: string) => {
    setBusyDeleteMember(userId);
    setErr("");
    try {
      const res = await fetch(`/api/tenant/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur suppression");

      toast.success("Membre supprimé ✅");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyDeleteMember(null);
    }
  };

  // Actions "complètes" côté invites (optionnelles selon ton backend)
  const revokeInvite = async (inviteId: string) => {
    setBusyInviteAction(inviteId);
    setErr("");
    try {
      const res = await fetch(`/api/tenant/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error("Action indisponible pour le moment.");

      toast.success("Invitation révoquée");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyInviteAction(null);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setBusyInviteAction(inviteId);
    setErr("");
    try {
      const res = await fetch(`/api/tenant/invites/${encodeURIComponent(inviteId)}/resend`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error("Action indisponible pour le moment.");

      toast.success("Invitation renvoyée");
      if (json.invite_url) await copy(json.invite_url, "Lien d’invite copié");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyInviteAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-zinc-500">Inviter et gérer les membres de l'organisation.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
          </Button>
          <Button className="h-9 bg-indigo-600 hover:bg-indigo-700" onClick={() => setActiveTab("create")}>
            <UserPlus className="h-4 w-4 mr-2" /> Nouvelle invitation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="bg-zinc-900/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500">Membres</CardDescription>
            <CardTitle className="text-2xl">{stats.members}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 flex items-center gap-2">
            <Shield className="h-4 w-4" /> {stats.admins} administrateurs
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500">Invitations</CardDescription>
            <CardTitle className="text-2xl">{stats.invites}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 flex items-center gap-2">
            <Mail className="h-4 w-4" /> {stats.pending} en attente
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500">Expirées</CardDescription>
            <CardTitle className="text-2xl">{stats.expired}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500">À révoquer ou renvoyer</CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-500">Actions</CardDescription>
            <CardTitle className="text-base">Bonnes pratiques</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500">
            Confirmer suppression • Copier lien • Suivre statut
          </CardContent>
        </Card>
      </div>

      {err && (
        <Alert className="bg-rose-500/10 border-rose-500/20 text-rose-200">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* Main */}
      <Card className="bg-zinc-900/40 border-white/10">
        <CardHeader>
          <CardTitle>Gestion</CardTitle>
          <CardDescription className="text-zinc-500">Membres & invitations, avec recherche et actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
            <TabsList className="bg-zinc-950/40 border border-white/10">
              <TabsTrigger value="members">Membres</TabsTrigger>
              <TabsTrigger value="invites">Invitations</TabsTrigger>
              <TabsTrigger value="create">Inviter</TabsTrigger>
            </TabsList>

            {/* MEMBERS */}
            <TabsContent value="members" className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="relative md:w-[420px]">
                  <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                  <Input
                    value={qMembers}
                    onChange={(e) => {
                      setQMembers(e.target.value);
                      setMembersPage(1);
                    }}
                    placeholder="Rechercher par email ou rôle…"
                    className="pl-9 bg-zinc-950/50 border-white/10"
                  />
                </div>

                <div className="text-xs text-zinc-500">
                  {filteredMembers.length} résultat(s) • page {membersPage}/{membersPages}
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="rounded-lg border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Créé</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {membersSlice.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={4} className="text-zinc-500">
                          Aucun membre.
                        </TableCell>
                      </TableRow>
                    ) : (
                      membersSlice.map((m) => (
                        <TableRow key={m.user_id} className="border-white/10">
                          <TableCell>
                            <div className="min-w-0">
                              <div className="text-sm text-white truncate">{m.email ?? "Compte sans email"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={String(m.role).toLowerCase() === "admin" ? "secondary" : "outline"}>
                              {roleLabel(m.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-400 text-sm">{fmtDate(m.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => askRemoveMember(m)}
                              disabled={busyDeleteMember === m.user_id}
                              title="Supprimer"
                            >
                              {busyDeleteMember === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <Button variant="outline" className="h-8" onClick={() => setMembersPage((p) => Math.max(1, p - 1))} disabled={membersPage <= 1}>
                  Précédent
                </Button>
                <Button variant="outline" className="h-8" onClick={() => setMembersPage((p) => Math.min(membersPages, p + 1))} disabled={membersPage >= membersPages}>
                  Suivant
                </Button>
              </div>
            </TabsContent>

            {/* INVITES */}
            <TabsContent value="invites" className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="relative md:w-[420px]">
                  <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                  <Input
                    value={qInvites}
                    onChange={(e) => {
                      setQInvites(e.target.value);
                      setInvitesPage(1);
                    }}
                    placeholder="Rechercher par email, rôle ou statut…"
                    className="pl-9 bg-zinc-950/50 border-white/10"
                  />
                </div>

                <div className="text-xs text-zinc-500">
                  {filteredInvites.length} résultat(s) • page {invitesPage}/{invitesPages}
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="rounded-lg border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créée</TableHead>
                      <TableHead>Expire</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invitesSlice.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={6} className="text-zinc-500">
                          Aucune invitation.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitesSlice.map((inv) => {
                        const url = inviteLink(inv.code);
                        const expired = isExpired(inv.expires_at);
                        const busy = busyInviteAction === inv.id;

                        return (
                          <TableRow key={inv.id} className="border-white/10">
                            <TableCell className="text-white">{inv.email}</TableCell>
                            <TableCell>
                              <Badge variant={String(inv.role).toLowerCase() === "admin" ? "secondary" : "outline"}>
                                {roleLabel(inv.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>{statusBadge(inv)}</TableCell>
                            <TableCell className="text-zinc-400 text-sm">{fmtDate(inv.created_at)}</TableCell>
                            <TableCell className={`text-sm ${expired ? "text-rose-300" : "text-zinc-400"}`}>{fmtDate(inv.expires_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button variant="outline" className="h-8" onClick={() => copy(url, "Lien copié")}>
                                  <LinkIcon className="h-4 w-4 mr-2" /> Copier
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={busy} title="Plus">
                                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10">
                                    <DropdownMenuItem onClick={() => copy(url, "Lien copié")}>
                                      <LinkIcon className="h-4 w-4 mr-2" /> Copier le lien
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => resendInvite(inv.id)}>
                                      <RefreshCw className="h-4 w-4 mr-2" /> Renvoyer
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-rose-300" onClick={() => revokeInvite(inv.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Révoquer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <Button variant="outline" className="h-8" onClick={() => setInvitesPage((p) => Math.max(1, p - 1))} disabled={invitesPage <= 1}>
                  Précédent
                </Button>
                <Button variant="outline" className="h-8" onClick={() => setInvitesPage((p) => Math.min(invitesPages, p + 1))} disabled={invitesPage >= invitesPages}>
                  Suivant
                </Button>
              </div>
            </TabsContent>

            {/* CREATE INVITE */}
            <TabsContent value="create" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-zinc-950/30 border-white/10">
                  <CardHeader>
                    <CardTitle>Créer une invitation</CardTitle>
                    <CardDescription className="text-zinc-500">
                      Génère une invitation. Tu peux copier le lien et l’envoyer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-zinc-500">Email</label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ex: user@domaine.com"
                        className="bg-zinc-950/50 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-zinc-500">Rôle</label>
                      <Select value={role} onValueChange={(v) => setRole(v as any)}>
                        <SelectTrigger className="bg-zinc-950/50 border-white/10">
                          <SelectValue placeholder="Choisir un rôle" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10">
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500">
                        Astuce : gardez le rôle <span className="text-zinc-300">Membre</span> par défaut,
                        <span className="text-zinc-300"> Administrateur</span> seulement si nécessaire.
                      </p>
                    </div>

                    <Button
                      onClick={createInvite}
                      disabled={!canCreate}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {busyInvite ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Créer l’invite
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-950/30 border-white/10">
                  <CardHeader>
                    <CardTitle>Bonnes pratiques d'équipe</CardTitle>
                    <CardDescription className="text-zinc-500">
                      Des accès clairs et maîtrisés pour votre organisation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-zinc-300 space-y-2">
                    <div>- Invitez les bonnes personnes au bon moment.</div>
                    <div>- Attribuez un rôle adapté à chaque besoin.</div>
                    <div>- Suivez les invitations en attente ou expirées.</div>
                    <div>- Révisez régulièrement les accès de l'équipe.</div>
                    <div>- Gardez la liste des membres claire et à jour. </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirm delete member */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Supprimer ce membre ?</DialogTitle>
          <DialogDescription className="text-zinc-500">
              Cette action est définitive. Le membre perdra l’accès à l’organisation.
          </DialogDescription>
        </DialogHeader>

        {confirmMember && (
          <div className="rounded-lg border border-white/10 bg-zinc-900/30 p-3">
            <div className="text-sm text-white truncate">{confirmMember.email ?? "Compte sans email"}</div>
          </div>
        )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="h-9">
              Annuler
            </Button>
            <Button
              className="h-9 bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                if (!confirmMember) return;
                setConfirmOpen(false);
                await removeMember(confirmMember.user_id);
                setConfirmMember(null);
              }}
              disabled={!confirmMember}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
