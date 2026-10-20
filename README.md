# Sokoban · Box Pusher

A classic sokoban puzzle game — infinite procedurally generated levels (deterministic & guaranteed solvable), 11 languages, works offline as an installable PWA.

**Play:** https://sokoban-game-49679.app.workbuddy.host/?sharecode=STCB2S5KMX

- Levels are generated on the fly by a reverse-pull algorithm (no level database — 30,000,000,000,000,000 levels supported)
- Progress saved locally + optional cloud sync (Supabase)
- Mobile friendly with touch controls
- Story: you are the night-shift operator of an AI work-monitoring system

## Run locally

Any static file server works:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```
