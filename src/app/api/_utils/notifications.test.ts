import { describe, expect, it } from "vitest";

import { mapNotificationRow, notificationsDiffer } from "./notifications";

describe("notificationsDiffer", () => {
  it("returns false when persisted content matches incoming notification", () => {
    expect(
      notificationsDiffer(
        {
          severity: "warning",
          title: "Backfill OTT requis",
          body: "2 chaînes bloquent encore le catalogue.",
          action_label: "Ouvrir le backfill",
          action_url: "/system/channel-backfill",
          metadata: { missingOrigin: 2 },
        },
        {
          tenantId: null,
          kind: "ott_backfill_required",
          severity: "warning",
          title: "Backfill OTT requis",
          body: "2 chaînes bloquent encore le catalogue.",
          actionLabel: "Ouvrir le backfill",
          actionUrl: "/system/channel-backfill",
          dedupeKey: "superadmin:ott-backfill",
          metadata: { missingOrigin: 2 },
        }
      )
    ).toBe(false);
  });

  it("returns true when payload changes", () => {
    expect(
      notificationsDiffer(
        {
          severity: "warning",
          title: "Backfill OTT requis",
          body: "2 chaînes bloquent encore le catalogue.",
          action_label: "Ouvrir le backfill",
          action_url: "/system/channel-backfill",
          metadata: { missingOrigin: 2 },
        },
        {
          tenantId: null,
          kind: "ott_backfill_required",
          severity: "critical",
          title: "Backfill OTT requis",
          body: "3 chaînes bloquent encore le catalogue.",
          actionLabel: "Ouvrir le backfill",
          actionUrl: "/system/channel-backfill",
          dedupeKey: "superadmin:ott-backfill",
          metadata: { missingOrigin: 3 },
        }
      )
    ).toBe(true);
  });
});

describe("mapNotificationRow", () => {
  it("maps database fields to client shape", () => {
    expect(
      mapNotificationRow({
        id: "notif-1",
        kind: "support_welcome",
        severity: "info",
        title: "Support Oniix disponible",
        body: "Contactez support@oniix.space",
        action_label: "Contacter le support",
        action_url: "mailto:support@oniix.space",
        dedupe_key: "system:support-welcome",
        metadata: {},
        is_read: false,
        read_at: null,
        created_at: "2026-03-14T00:00:00.000Z",
      })
    ).toEqual({
      id: "notif-1",
      kind: "support_welcome",
      severity: "info",
      title: "Support Oniix disponible",
      body: "Contactez support@oniix.space",
      actionLabel: "Contacter le support",
      actionUrl: "mailto:support@oniix.space",
      isRead: false,
      readAt: null,
      createdAt: "2026-03-14T00:00:00.000Z",
    });
  });
});
