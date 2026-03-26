"use client";

import * as React from "react";
import { Loader2, Lock, Mail, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ViewerUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type ViewerProgressItem = {
  playable_type: "movie" | "episode";
  playable_id: string;
  title_id: string;
  title_type: "movie" | "series";
  tenant_id: string;
  title: string;
  parent_title: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  progress_sec: number;
  duration_sec: number | null;
  completed: boolean;
  percent_complete: number | null;
  season_number: number | null;
  episode_number: number | null;
  updated_at: string;
};

export type ViewerWatchlistItem = {
  playable_type: "movie" | "series" | "episode";
  playable_id: string;
  title_id: string;
  title_type: "movie" | "series";
  tenant_id: string;
  title: string;
  parent_title: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  has_playback: boolean;
  progress_sec: number | null;
  duration_sec: number | null;
  percent_complete: number | null;
  season_number: number | null;
  episode_number: number | null;
  created_at: string;
};

type ViewerProgressSnapshot = {
  progress_sec: number;
  duration_sec: number | null;
  completed: boolean;
  percent_complete: number | null;
};

type ViewerAuthContextValue = {
  user: ViewerUser | null;
  isReady: boolean;
  isAuthenticating: boolean;
  libraryLoading: boolean;
  continueWatching: ViewerProgressItem[];
  watchlist: ViewerWatchlistItem[];
  openAuthDialog: (mode?: "login" | "signup") => void;
  closeAuthDialog: () => void;
  login: (input: { email: string; password: string }) => Promise<boolean>;
  signup: (input: { fullName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  isInWatchlist: (playableType: "movie" | "series" | "episode", playableId: string) => boolean;
  getProgress: (playableType: "movie" | "episode", playableId: string) => ViewerProgressSnapshot | null;
  toggleWatchlist: (playableType: "movie" | "series" | "episode", playableId: string) => Promise<boolean>;
  saveProgress: (input: {
    playableType: "movie" | "episode";
    playableId: string;
    progressSec: number;
    durationSec?: number | null;
    completed?: boolean;
  }) => Promise<void>;
};

type AuthResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  user?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
};

type LibraryResponse = {
  ok?: boolean;
  error?: string;
  continue_watching?: ViewerProgressItem[];
  watchlist?: ViewerWatchlistItem[];
};

const ViewerAuthContext = React.createContext<ViewerAuthContextValue | null>(null);

function keyFor(playableType: string, playableId: string) {
  return `${playableType}:${playableId}`;
}

function buildProgressSnapshot(
  source:
    | ViewerProgressItem
    | ViewerWatchlistItem
    | {
        progress_sec: number;
        duration_sec: number | null;
        completed: boolean;
        percent_complete: number | null;
      }
): ViewerProgressSnapshot {
  return {
    progress_sec: Math.max(0, source.progress_sec ?? 0),
    duration_sec: source.duration_sec,
    completed: "completed" in source ? source.completed : false,
    percent_complete: source.percent_complete,
  };
}

function normalizePercent(progressSec: number, durationSec: number | null, completed: boolean) {
  if (completed) return 100;
  if (!durationSec || durationSec <= 0) return null;
  return Math.min(99, Math.max(1, Math.round((progressSec / durationSec) * 100)));
}

function Field({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f1d06d]/65" />
      {children}
    </div>
  );
}

function WebViewerAuthDialog({
  open,
  mode,
  busy,
  onOpenChange,
  onModeChange,
  onLogin,
  onSignup,
}: {
  open: boolean;
  mode: "login" | "signup";
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: "login" | "signup") => void;
  onLogin: (input: { email: string; password: string }) => Promise<boolean>;
  onSignup: (input: { fullName: string; email: string; password: string }) => Promise<boolean>;
}) {
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [signupName, setSignupName] = React.useState("");
  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setError("");
    }
  }, [open]);

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const ok = await onLogin({ email: loginEmail, password: loginPassword });
    if (!ok) setError("Connexion impossible. Verifiez vos identifiants.");
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const ok = await onSignup({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
    });
    if (!ok) {
      setError("Inscription impossible. Utilisez un mot de passe fort et verifiez vos informations.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(4,4,4,0.98))] p-0 text-white">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white">
                {mode === "login" ? "Connexion" : "Creer un compte"}
              </DialogTitle>
              <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => onModeChange("login")}
                  className={`h-9 rounded-full px-4 text-sm transition ${
                    mode === "login" ? "bg-white text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange("signup")}
                  className={`h-9 rounded-full px-4 text-sm transition ${
                    mode === "signup" ? "bg-white text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Inscription
                </button>
              </div>
            </div>
            <DialogDescription className="text-sm text-slate-400">
              Synchronisez votre lecture, votre progression et votre liste sur le web.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          {mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <Field icon={Mail}>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="Email"
                  autoFocus
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500"
                />
              </Field>
              <Field icon={Lock}>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Mot de passe"
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500"
                />
              </Field>

              {error ? (
                <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-[18px] bg-white text-black hover:bg-slate-200"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connexion"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-4">
              <Field icon={User2}>
                <Input
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  placeholder="Nom complet"
                  autoFocus
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500"
                />
              </Field>
              <Field icon={Mail}>
                <Input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="Email"
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500"
                />
              </Field>
              <Field icon={Lock}>
                <Input
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  placeholder="Mot de passe fort"
                  className="h-12 rounded-[18px] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500"
                />
              </Field>

              {error ? (
                <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <p className="text-xs leading-5 text-slate-500">
                12 caracteres minimum avec majuscule, minuscule, chiffre et symbole.
              </p>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-[18px] bg-white text-black hover:bg-slate-200"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer mon compte"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WebViewerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ViewerUser | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [libraryLoading, setLibraryLoading] = React.useState(false);
  const [continueWatching, setContinueWatching] = React.useState<ViewerProgressItem[]>([]);
  const [watchlist, setWatchlist] = React.useState<ViewerWatchlistItem[]>([]);
  const [progressOverrides, setProgressOverrides] = React.useState<Record<string, ViewerProgressSnapshot>>({});
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"login" | "signup">("login");

  const resetLibrary = React.useCallback(() => {
    setContinueWatching([]);
    setWatchlist([]);
    setProgressOverrides({});
  }, []);

  const refreshLibrary = React.useCallback(async () => {
    setLibraryLoading(true);
    try {
      const response = await fetch("/api/web/me/library", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        resetLibrary();
        return;
      }

      const payload = (await response.json().catch(() => null)) as LibraryResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de charger la bibliotheque.");
      }

      setContinueWatching(Array.isArray(payload.continue_watching) ? payload.continue_watching : []);
      setWatchlist(Array.isArray(payload.watchlist) ? payload.watchlist : []);
    } catch (error) {
      console.error("web_viewer_library_refresh_failed", error);
    } finally {
      setLibraryLoading(false);
    }
  }, [resetLibrary]);

  const hydrate = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        resetLibrary();
        return;
      }

      const payload = (await response.json().catch(() => null)) as AuthResponse | null;
      if (!response.ok || !payload?.ok || !payload.user) {
        setUser(null);
        resetLibrary();
        return;
      }

      setUser(payload.user);
      await refreshLibrary();
    } finally {
      setIsReady(true);
    }
  }, [refreshLibrary, resetLibrary]);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const openAuthDialog = React.useCallback((mode: "login" | "signup" = "login") => {
    setDialogMode(mode);
    setDialogOpen(true);
  }, []);

  const closeAuthDialog = React.useCallback(() => {
    setDialogOpen(false);
  }, []);

  const login = React.useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsAuthenticating(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const payload = (await response.json().catch(() => null)) as AuthResponse | null;
        if (!response.ok || payload?.ok === false) {
          return false;
        }

        await hydrate();
        setDialogOpen(false);
        return true;
      } catch (error) {
        console.error("web_viewer_login_failed", error);
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [hydrate]
  );

  const signup = React.useCallback(
    async ({ fullName, email, password }: { fullName: string; email: string; password: string }) => {
      setIsAuthenticating(true);
      try {
        const response = await fetch("/api/web/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password }),
        });
        const payload = (await response.json().catch(() => null)) as AuthResponse | null;
        if (!response.ok || payload?.ok === false || payload?.message?.includes("Verifiez votre email")) {
          return false;
        }

        await hydrate();
        setDialogOpen(false);
        return true;
      } catch (error) {
        console.error("web_viewer_signup_failed", error);
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [hydrate]
  );

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("web_viewer_logout_failed", error);
    } finally {
      setUser(null);
      resetLibrary();
      setDialogOpen(false);
    }
  }, [resetLibrary]);

  const watchlistSet = React.useMemo(() => {
    return new Set(watchlist.map((item) => keyFor(item.playable_type, item.playable_id)));
  }, [watchlist]);

  const progressMap = React.useMemo(() => {
    const map = new Map<string, ViewerProgressSnapshot>();
    for (const item of continueWatching) {
      map.set(keyFor(item.playable_type, item.playable_id), buildProgressSnapshot(item));
    }
    for (const item of watchlist) {
      if (item.progress_sec !== null && item.progress_sec > 0) {
        map.set(keyFor(item.playable_type, item.playable_id), buildProgressSnapshot(item));
      }
    }
    for (const [key, value] of Object.entries(progressOverrides)) {
      map.set(key, value);
    }
    return map;
  }, [continueWatching, progressOverrides, watchlist]);

  const isInWatchlist = React.useCallback(
    (playableType: "movie" | "series" | "episode", playableId: string) =>
      watchlistSet.has(keyFor(playableType, playableId)),
    [watchlistSet]
  );

  const getProgress = React.useCallback(
    (playableType: "movie" | "episode", playableId: string) =>
      progressMap.get(keyFor(playableType, playableId)) ?? null,
    [progressMap]
  );

  const toggleWatchlist = React.useCallback(
    async (playableType: "movie" | "series" | "episode", playableId: string) => {
      if (!user) {
        openAuthDialog("login");
        return false;
      }

      const exists = watchlistSet.has(keyFor(playableType, playableId));
      const response = await fetch("/api/web/me/watchlist", {
        method: exists ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playable_type: playableType,
          playable_id: playableId,
        }),
      });

      if (!response.ok) {
        return exists;
      }

      await refreshLibrary();
      return !exists;
    },
    [openAuthDialog, refreshLibrary, user, watchlistSet]
  );

  const saveProgress = React.useCallback(
    async ({
      playableType,
      playableId,
      progressSec,
      durationSec = null,
      completed = false,
    }: {
      playableType: "movie" | "episode";
      playableId: string;
      progressSec: number;
      durationSec?: number | null;
      completed?: boolean;
    }) => {
      if (!user) return;

      setProgressOverrides((current) => ({
        ...current,
        [keyFor(playableType, playableId)]: {
          progress_sec: progressSec,
          duration_sec: durationSec,
          completed,
          percent_complete: normalizePercent(progressSec, durationSec, completed),
        },
      }));

      try {
        await fetch("/api/web/me/watch-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playable_type: playableType,
            playable_id: playableId,
            progress_sec: progressSec,
            duration_sec: durationSec,
            completed,
          }),
        });
      } catch (error) {
        console.error("web_viewer_progress_save_failed", error);
      }
    },
    [user]
  );

  const value = React.useMemo<ViewerAuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticating,
      libraryLoading,
      continueWatching,
      watchlist,
      openAuthDialog,
      closeAuthDialog,
      login,
      signup,
      logout,
      refreshLibrary,
      isInWatchlist,
      getProgress,
      toggleWatchlist,
      saveProgress,
    }),
    [
      closeAuthDialog,
      continueWatching,
      getProgress,
      isAuthenticating,
      isInWatchlist,
      isReady,
      libraryLoading,
      login,
      logout,
      openAuthDialog,
      refreshLibrary,
      saveProgress,
      signup,
      toggleWatchlist,
      user,
      watchlist,
    ]
  );

  return (
    <ViewerAuthContext.Provider value={value}>
      {children}
      <WebViewerAuthDialog
        open={dialogOpen}
        mode={dialogMode}
        busy={isAuthenticating}
        onOpenChange={setDialogOpen}
        onModeChange={setDialogMode}
        onLogin={login}
        onSignup={signup}
      />
    </ViewerAuthContext.Provider>
  );
}

export function useWebViewerAuth() {
  const context = React.useContext(ViewerAuthContext);
  if (!context) {
    throw new Error("useWebViewerAuth must be used within WebViewerAuthProvider");
  }
  return context;
}
