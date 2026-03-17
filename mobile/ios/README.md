# iOS AVPlayer Instrumentation

## Events

- `session_start` au moment où l’app reçoit la playback URL depuis `POST /api/mobile/playback-url`
- `play` uniquement quand `timeControlStatus == .playing`
- `heartbeat` toutes les 15 secondes si la lecture est réellement en cours
- `buffer_start` quand `timeControlStatus == .waitingToPlayAtSpecifiedRate`
- `buffer_end` quand on revient à `.playing`
- `error` sur `AVPlayerItemFailedToPlayToEndTime` ou erreur terminale
- `end` à la sortie du player, background durable, stop explicite ou fin réelle

## Pseudo-code

```swift
final class PlaybackAnalyticsTracker {
    private var heartbeatTimer: Timer?
    private var bufferOpen = false
    private var sessionId: String
    private var channelId: String
    private var queue: [AnalyticsEvent] = []

    func attach(player: AVPlayer, item: AVPlayerItem) {
        enqueue("session_start")
        observeTimeControlStatus(player)
        observePlaybackEnd(item)
        observePlaybackError(item)
        flushIfNeeded()
    }

    private func observeTimeControlStatus(_ player: AVPlayer) {
        if player.timeControlStatus == .playing {
            if bufferOpen {
                enqueue("buffer_end")
                bufferOpen = false
            }
            enqueue("play")
            startHeartbeat()
        } else if player.timeControlStatus == .waitingToPlayAtSpecifiedRate {
            bufferOpen = true
            enqueue("buffer_start")
            stopHeartbeat()
        } else {
            stopHeartbeat()
        }
    }

    private func startHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { _ in
            guard self.isActuallyPlaying else { return }
            self.enqueue("heartbeat")
            self.flushIfNeeded()
        }
    }

    func applicationDidEnterBackground() {
        enqueue("end")
        flushImmediately()
    }
}
```

## Offline / Retry

- stocker localement les événements si réseau indisponible
- batcher par 20 à 50 événements
- retry exponentiel court
- purge locale après ACK serveur
