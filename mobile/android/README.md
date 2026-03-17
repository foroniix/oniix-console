# Android ExoPlayer Instrumentation

## Events

- `session_start` après réponse `POST /api/mobile/playback-url`
- `play` seulement quand `player.isPlaying == true`
- `heartbeat` toutes les 15 secondes si `isPlaying`
- `buffer_start` sur `STATE_BUFFERING`
- `buffer_end` quand on repasse à `isPlaying`
- `error` sur `onPlayerError`
- `end` sur sortie écran, arrêt explicite, background durable ou fin réelle

## Pseudo-code

```kotlin
class PlaybackAnalyticsTracker(
    private val sessionId: String,
    private val channelId: String
) : Player.Listener {

    private val queue = mutableListOf<AnalyticsEvent>()
    private var heartbeatJob: Job? = null
    private var buffering = false

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (isPlaying) {
            if (buffering) {
                enqueue("buffer_end")
                buffering = false
            }
            enqueue("play")
            startHeartbeat()
        } else {
            stopHeartbeat()
        }
    }

    override fun onPlaybackStateChanged(state: Int) {
        if (state == Player.STATE_BUFFERING) {
            buffering = true
            enqueue("buffer_start")
        }
        if (state == Player.STATE_ENDED) {
            enqueue("end")
            flushNow()
        }
    }

    override fun onPlayerError(error: PlaybackException) {
        enqueue("error", errorCode = error.errorCodeName)
        flushNow()
    }

    private fun startHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = scope.launch {
            while (isActive) {
                delay(15_000)
                if (player.isPlaying) {
                    enqueue("heartbeat")
                    flushIfNeeded()
                }
            }
        }
    }
}
```

## Offline / Retry

- persister la queue dans Room ou DataStore
- flush en batch JSON
- retry exponentiel
- limiter la rétention locale pour éviter les doublons massifs après longue coupure
