# Mobile Program Grid API

## Endpoint
- `GET /api/mobile/program-grid`

This endpoint exposes the published/public program grid for one tenant, ready for mobile consumption.

## Authentication
Headers (required):
- `x-oniix-tenant`: tenant id (uuid)
- one auth header:
  - `x-oniix-token`: short-lived token from `POST /api/mobile/ingest-token` (recommended)
  - or `x-oniix-ingest`: tenant ingest key (legacy fallback)

Recommended flow (zero-touch for tenant users):
1. Mobile requests `POST /api/mobile/ingest-token` with `{ stream_id, tenant_id? }`.
2. API returns a short-lived signed token (`ttl_sec` + `expires_at`).
3. Mobile uses `x-oniix-token` on `/api/mobile/program-grid`, `/api/mobile/playback-url` and `/api/analytics/ingest`.
4. The same token pattern is the target for runtime analytics/ad endpoints (`/api/analytics/heartbeat`, `/api/analytics/collect`, `/api/ads/decide`, `/api/ads/event`).

Legacy key rotation remains available in `Settings > Ingest mobile`.

## Query params
- `from` (optional, ISO datetime): window start. Default = now.
- `to` (optional, ISO datetime): window end.
- `hours` (optional, int 1..168): used only when `to` is missing. Default = `24`.
- `channelId` (optional): filter one channel.
- `limit` (optional, int 1..500): max returned slots. Default = `300`.
- `includeReplays` (optional: `1|true|yes`): include published replay list overlapping the window.

Validation rules:
- `to` must be strictly after `from`.
- max range = 14 days.

## Response
```json
{
  "ok": true,
  "tenant_id": "uuid",
  "window": {
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-02T00:00:00.000Z",
    "generated_at": "2026-03-01T12:00:00.000Z"
  },
  "grid": [
    {
      "channel": { "id": "uuid", "name": "Channel A", "logo": null },
      "now": {
        "id": "slot-id",
        "program_id": "program-id",
        "title": "Current show",
        "poster": null,
        "starts_at": "2026-03-01T11:00:00.000Z",
        "ends_at": "2026-03-01T12:00:00.000Z",
        "slot_status": "published",
        "visibility": "public",
        "notes": null
      },
      "next": null,
      "slots": []
    }
  ],
  "replays": []
}
```

Notes:
- `program-grid` returns metadata and editorial scheduling.
- Live playback must now be resolved separately via `POST /api/mobile/playback-url`.
- `program-grid` should not be treated as a source of direct live HLS URLs.

## Playback endpoint
- `POST /api/mobile/playback-url`

Body:
```json
{
  "channel_id": "uuid",
  "stream_id": "uuid",
  "session_id": "uuid-optional",
  "platform": "ios"
}
```

Response:
```json
{
  "ok": true,
  "tenant_id": "uuid",
  "channel_id": "uuid",
  "stream_id": "uuid",
  "session_id": "uuid",
  "playback_url": "https://.../api/playback/hls/<channel>/master.m3u8?token=...",
  "expires_at": "2026-03-01T12:01:30.000Z"
}
```

## Mobile integration flow
1. Resolve `tenant_id` (stream row, auth metadata, or env fallback).
2. Request short-lived token from `/api/mobile/ingest-token`.
3. Load grid on app startup: `GET /api/mobile/program-grid?hours=24`.
4. Resolve the live playback URL via `POST /api/mobile/playback-url` when the user starts a channel.
5. Refresh grid on timer (ex: every 60s) or when app returns to foreground.
6. Use `grid[].now` for "On air now" cards.
7. Use `grid[].slots` for timeline/day guide.
8. Optionally load replay catalog with `includeReplays=1`.
