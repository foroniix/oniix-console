"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTenantRoleLabel, normalizeTenantRole } from "@/lib/tenant-roles";

type Member = {
  user_id: string;
  email: string | null;
  role: string;
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  code: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type AccessTab = "members" | "invites" | "create";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function fmtDate(iso?: string) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) ? timestamp < Date.now() : false;
}

function roleLabel(role?: string | null) {
  return formatTenantRoleLabel(role);
}

function statusBadge(invite: Invite) {
  const status = (invite.status || "").toLowerCase();
  const expired = isExpired(invite.expires_at);

  if (expired) return <Badge variant="destructive">Expirée</Badge>;
  if (status.includes("accepted")) return <Badge variant="secondary">Acceptée</Badge>;
  if (status.includes("pending")) return <Badge>En attente</Badge>;
  if (status.includes("revoked") || status.includes("canceled")) return <Badge variant="outline">Révoquée</Badge>;
  return <Badge variant="outline">{invite.status || "-"}</Badge>;
}

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [busyInvite, setBusyInvite] = useState(false);

  const [activeTab, setActiveTab] = useState<AccessTab>("members");
  const [qMembers, setQMembers] = useState("");
  const [qInvites, setQInvites] = useState("");
  const [membersPage, setMembersPage] = useState(1);
  const [invitesPage, setInvitesPage] = useState(1);
  const [busyDeleteMember, setBusyDeleteMember] = useState<string | null>(null);
  const [busyInviteAction, setBusyInviteAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMember, setConfirmMember] = useState<Member | null>(null);

  const PAGE_SIZE = 10;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const inviteLink = useCallback(
    (code: string) => `${origin}/console/accept-invite?code=${encodeURIComponent(code)}`,
    [origin]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/tenant/members", { cache: "no-store" }),
        fetch("/api/tenant/invites", { cache: "no-store" }),
      ]);

      const membersJson = await membersRes.json().catch(() => null);
      const invitesJson = await invitesRes.json().catch(() => null);

      if (!membersRes.ok || !membersJson?.ok) {
        throw new Error(membersJson?.error || "Erreur de chargement des membres");
      }

      if (!invitesRes.ok || !invitesJson?.ok) {
        throw new Error(invitesJson?.error || "Erreur de chargement des invitations");
      }

      setMembers(membersJson.members ?? []);
      setInvites(invitesJson.invites ?? []);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Impossible de charger les accès."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = invites.filter(
      (invite) => (invite.status || "").toLowerCase().includes("pending") && !isExpired(invite.expires_at)
    ).length;
    const expired = invites.filter((invite) => isExpired(invite.expires_at)).length;
    const admins = members.filter((member) => {
      const normalizedRole = normalizeTenantRole(member.role);
      return normalizedRole === "owner" || normalizedRole === "admin";
    }).length;

    return {
      pending,
      expired,
      admins,
      members: members.length,
      invites: invites.length,
    };
  }, [invites, members]);

  const filteredMembers = useMemo(() => {
    const query = qMembers.trim().toLowerCase();
    const sorted = [...members].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (!query) return sorted;

    return sorted.filter((member) => {
      const emailValue = (member.email || "").toLowerCase();
      const roleValue = (member.role || "").toLowerCase();
      return (
        emailValue.includes(query) ||
        roleValue.includes(query) ||
        roleLabel(member.role).toLowerCase().includes(query)
      );
    });
  }, [members, qMembers]);

  const filteredInvites = useMemo(() => {
    const query = qInvites.trim().toLowerCase();
    const sorted = [...invites].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (!query) return sorted;

    return sorted.filter((invite) => {
      return (
        invite.email.toLowerCase().includes(query) ||
        (invite.role || "").toLowerCase().includes(query) ||
        roleLabel(invite.role).toLowerCase().includes(query) ||
        (invite.status || "").toLowerCase().includes(query)
      );
    });
  }, [invites, qInvites]);

  const membersPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const invitesPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));
  const membersSlice = filteredMembers.slice((membersPage - 1) * PAGE_SIZE, membersPage * PAGE_SIZE);
  const invitesSlice = filteredInvites.slice((invitesPage - 1) * PAGE_SIZE, invitesPage * PAGE_SIZE);

  useEffect(() => {
    setMembersPage((page) => Math.min(page, membersPages));
  }, [membersPages]);

  useEffect(() => {
    setInvitesPage((page) => Math.min(page, invitesPages));
  }, [invitesPages]);

  const copy = useCallback(async (text: string, label = "Copie") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Impossible de copier");
    }
  }, []);

  const createInvite = async () => {
    setBusyInvite(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur de création de l’invitation");

      const url = json.invite_url || inviteLink(json.code || "");
      toast.success("Invitation créée");
      if (url) await copy(url, "Lien copié");

      setEmail("");
      setActiveTab("invites");
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Erreur d’invitation"));
    } finally {
      setBusyInvite(false);
    }
  };

  const askRemoveMember = (member: Member) => {
    setConfirmMember(member);
    setConfirmOpen(true);
  };

  const removeMember = async (userId: string) => {
    setBusyDeleteMember(userId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur de suppression");

      toast.success("Membre supprimé");
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Erreur de suppression"));
    } finally {
      setBusyDeleteMember(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setBusyInviteAction(inviteId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error("Action indisponible.");

      toast.success("Invitation révoquée");
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Erreur"));
    } finally {
      setBusyInviteAction(null);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setBusyInviteAction(inviteId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/invites/${encodeURIComponent(inviteId)}/resend`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error("Action indisponible.");

      toast.success("Invitation renvoyée");
      if (json.invite_url) await copy(json.invite_url, "Lien copié");
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Erreur"));
    } finally {
      setBusyInviteAction(null);
    }
  };

  const canCreate = email.trim().includes("@") && !busyInvite;

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          title="Équipe et accès"
          subtitle="Invitations, rôles et gouvernance opérateur."
          breadcrumbs={[
            { label: "Oniix Console", href: "/dashboard" },
            { label: "Équipe" },
          ]}
          icon={<Shield className="size-5" />}
        />
        <div className="console-panel flex min-h-[320px] items-center justify-center text-slate-400">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Chargement des accès...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Équipe et accès"
        subtitle="Invitez, révisez et sécurisez les accès opérateur depuis un poste unique."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Équipe" },
        ]}
        icon={<Shield className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" />
              Rafraîchir
            </Button>
            <Button onClick={() => setActiveTab("create")}>
              <UserPlus className="size-4" />
              Nouvelle invitation
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Membres" value={stats.members} icon={<Shield className="size-4" />} hint={`${stats.admins} administrateur(s)`} loading={false} />
        <KpiCard label="Invitations" value={stats.invites} icon={<Mail className="size-4" />} hint={`${stats.pending} en attente`} tone="info" />
        <KpiCard label="Expirées" value={stats.expired} hint="Liens à révoquer ou renvoyer" tone={stats.expired > 0 ? "warning" : "neutral"} />
        <KpiCard label="Gouvernance" value="Actif" hint="Suppression, re-envoi et suivi des statuts" tone="success" />
      </KpiRow>

      {error ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pilotage des accès</CardTitle>
          <CardDescription>Membres actifs, invitations et création de liens depuis la même surface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AccessTab)} className="space-y-5">
            <TabsList>
              <TabsTrigger value="members">Membres</TabsTrigger>
              <TabsTrigger value="invites">Invitations</TabsTrigger>
              <TabsTrigger value="create">Inviter</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={qMembers}
                    onChange={(event) => {
                      setQMembers(event.target.value);
                      setMembersPage(1);
                    }}
                    placeholder="Rechercher un membre par e-mail ou rôle"
                    className="pl-11"
                  />
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {filteredMembers.length} résultat(s) · page {membersPage}/{membersPages}
                </div>
              </div>

              <DataTableShell
                title="Membres actifs"
                description="Accès opérateur et rôles associés à votre espace."
                isEmpty={membersSlice.length === 0}
                emptyTitle="Aucun membre"
                emptyDescription="Aucun compte ne correspond au filtre actuel."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Créé</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersSlice.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">{member.email ?? "Compte sans email"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={["owner", "admin"].includes(normalizeTenantRole(member.role)) ? "secondary" : "outline"}>
                            {roleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{fmtDate(member.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-rose-200 hover:text-rose-100"
                            onClick={() => askRemoveMember(member)}
                            disabled={busyDeleteMember === member.user_id}
                            title="Supprimer"
                          >
                            {busyDeleteMember === member.user_id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setMembersPage((page) => Math.max(1, page - 1))} disabled={membersPage <= 1}>
                  Précédent
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMembersPage((page) => Math.min(membersPages, page + 1))} disabled={membersPage >= membersPages}>
                  Suivant
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="invites" className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={qInvites}
                    onChange={(event) => {
                      setQInvites(event.target.value);
                      setInvitesPage(1);
                    }}
                    placeholder="Rechercher une invitation"
                    className="pl-11"
                  />
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {filteredInvites.length} résultat(s) · page {invitesPage}/{invitesPages}
                </div>
              </div>

              <DataTableShell
                title="Invitations"
                description="Liens d’accès, statuts et actions de relance."
                isEmpty={invitesSlice.length === 0}
                emptyTitle="Aucune invitation"
                emptyDescription="Aucune invitation ne correspond au filtre actuel."
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créée</TableHead>
                      <TableHead>Expire</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitesSlice.map((invite) => {
                      const url = inviteLink(invite.code);
                      const expired = isExpired(invite.expires_at);
                      const isBusy = busyInviteAction === invite.id;

                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium text-white">{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant={["owner", "admin"].includes(normalizeTenantRole(invite.role)) ? "secondary" : "outline"}>
                              {roleLabel(invite.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(invite)}</TableCell>
                          <TableCell>{fmtDate(invite.created_at)}</TableCell>
                          <TableCell className={expired ? "text-amber-200" : undefined}>{fmtDate(invite.expires_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => void copy(url, "Lien copié")}>
                                <Link2 className="size-4" />
                                Copier
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" disabled={isBusy} title="Plus">
                                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => void copy(url, "Lien copié")}>
                                    <Link2 className="size-4" />
                                    Copier le lien
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void resendInvite(invite.id)}>
                                    <RefreshCw className="size-4" />
                                    Renvoyer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => void revokeInvite(invite.id)}>
                                    <Trash2 className="size-4" />
                                    Revoquer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DataTableShell>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setInvitesPage((page) => Math.max(1, page - 1))} disabled={invitesPage <= 1}>
                  Précédent
                </Button>
                <Button variant="outline" size="sm" onClick={() => setInvitesPage((page) => Math.min(invitesPages, page + 1))} disabled={invitesPage >= invitesPages}>
                  Suivant
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Inviter un membre</CardTitle>
                    <CardDescription>Générez une invitation sécurisée puis partagez le lien d’accès.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                      <Input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="equipe@votre-chaine.tv"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rôle</label>
                      <Select value={role} onValueChange={(value) => setRole(value as "viewer" | "editor" | "admin")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir un niveau d’accès" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Lecture</SelectItem>
                          <SelectItem value="editor">Édition</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs leading-5 text-slate-400">
                        Principe recommandé : privilégier lecture ou édition, et réserver l’administration aux responsables.
                      </p>
                    </div>

                    <Button onClick={() => void createInvite()} disabled={!canCreate}>
                      {busyInvite ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                      Générer l’invitation
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Règles d’exploitation</CardTitle>
                    <CardDescription>Une équipe maîtrisée vaut mieux qu’un périmètre trop large.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      Attribuez un rôle minimal compatible avec la mission.
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      Révoquez les invitations obsolètes au fil de l’exploitation.
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      Révisez les comptes sensibles à chaque changement d’équipe.
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      Gardez un historique simple des accès partagés avec les éditeurs.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce membre ?</DialogTitle>
            <DialogDescription>Cette action retire immédiatement l’accès à l’organisation.</DialogDescription>
          </DialogHeader>

          {confirmMember ? (
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-200">
              {confirmMember.email ?? "Compte sans email"}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
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
    </PageShell>
  );
}
