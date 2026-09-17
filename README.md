# Pickleball Team Round-Robin Scoretracker

A local-first, frontend-only web app for tabulating scores and calculating standings for a flighted team round-robin pickleball tournament. No backend, no database - runs entirely in the browser using a static JSON seed file and `localStorage` for persistence.

Built with Angular version 22 and Node.js 24, styled with Bootstrap SCSS

## Features

- **Team standings** — points, fixture win/draw/loss record, match differential, and game-point differential, with a full tiebreaker hierarchy and shared-placement support for ties.
- **Pair rankings** — separate rankings within each seed level, so pairs have something to compete for independent of their team's overall placement.
- **Score entry** — enter and lock match scores with built-in validation (winner must score exactly 15, loser 0–14) and an explicit unlock-to-edit flow to prevent accidental changes.
- **Void handling** — mark a pair as withdrawn/injured and the app recalculates standings as if that pair never played. If enough of a team's pairs are voided, the whole team is excluded from standings.
- **Editable roster** — team names, player names, and pair type (Mixed/Women's Doubles) can all be edited on the fly from the Pairs page.
- **Reset tournament** — wipes all progress and regenerates from the seed data, with a confirmation modal.
- **Fully offline** — once loaded, no internet connection or backend server is required. State persists in the browser via `localStorage`.

## Tournament Format

- Any number of pairs, as long as that number is evenly divisible by 3 (each team must have exactly 3 pairs).
- Pairs are grouped into 3 seed levels by skill; every team contributes exactly one pair per seed.
- The tournament is **flighted**: Seed 1 pairs only ever play other Seed 1 pairs, Seed 2 plays Seed 2, and Seed 3 plays Seed 3.
- Teams play every other team exactly once (round robin), so `n` teams produce `n choose 2` fixtures.
- Each **fixture** (team vs. team) consists of 3 matches — one per seed.
- **Rally scoring to 15.** Winner must score exactly 15; loser's score must be between 0 and 14.
- **Handicap:** when a Mixed Doubles (XD) pair plays a Women's Doubles (WD) pair, the WD pair gets a 3-point head start. This is shown as a note in the score entry screen — it is not automatically applied to the entered score. Players are responsible for accounting for it themselves when reporting the final score.

> **Note:** the number of teams and pairs is fully dynamic — add or remove teams freely in the seed data, as long as the total pair count stays divisible by 3. The number of pairs *per team* (3, one per seed) is currently a fixed assumption baked into the app and is not configurable.

## Scoring & Standings

**Fixture points:**
| Result | Points |
|---|---|
| Win (more match wins in the fixture) | 2 |
| Draw | 1 |
| Loss | 0 |

A draw is only possible when a voided pair reduces a fixture from 3 valid matches down to 2.

**Team tiebreakers** (applied in order):
1. Total team points
2. Match win/loss differential
3. Game-point win/loss differential
4. Any remaining tie is shown as a shared placement.

**Pair rankings (within a seed)** use a simpler two-level hierarchy:
1. Match win/loss differential
2. Game-point differential
3. Any remaining tie is shown as a shared placement.

## Voiding / Withdrawals

If a pair drops out or is injured, mark them as voided from the Pairs page. All of that pair's matches — past and future — are excluded from standings, as if they never played.

If **two or three** pairs from the same team end up voided, the entire team is excluded from standings. This applies symmetrically: every team that would've played them also has that one fixture excluded from their own record, keeping everyone's "fixtures played" count fair and equal.

Pair rankings (within a seed) are unaffected by a teammate's void — a pair only disappears from its seed's ranking table if it was itself voided.

## Getting Started

### Prerequisites
- Node.js and npm

### Setup

```bash
npm install
ng serve
```

Then open `http://localhost:4200`.

### Roster data

The app reads its initial teams/pairs from a seed file in `public/`. Two files are supported:

- **`public/seed-data.json`** — committed to the repo, holds placeholder data (`Team A`–`Team H`, `Player 1`, `Player 2`, etc.). Safe to publish publicly.
- **`public/seed-data.local.json`** *(optional, git-ignored)* — if present, this is loaded instead, letting you keep real player names and team names out of version control while still using them locally. Copy the shape of `seed-data.json` and fill in real data here.

The seed file is only read **once**, the very first time the app runs with no existing saved state. After that, all progress lives in `localStorage`. Use **Reset Tournament** in the navbar to wipe saved state and regenerate fresh from the seed file (real data or placeholder, whichever is present).

## Deployment / Sharing

This app has no backend and so it doesn't need to be "deployed" anywhere — it just needs to be served over `http://` (not opened directly as a file) for the browser to be able to fetch the seed JSON.

```bash
ng build --configuration production
```

Then, on the machine that will run it:

```bash
npx serve dist/pickleball-scoretracker/browser
```

This works fully offline (`localhost` doesn't require a network connection) after the `serve` package has been downloaded once. To view the app from a *different* device on the same network, use the "Network" URL that `serve` prints, provided the local network allows device-to-device traffic.

## Known Limitations

- Single-device use only — no sync between multiple browsers/devices, no concurrent-edit handling.
- No JSON export/import backup yet.
- A team must have exactly 3 pairs (one per seed); a team short a pair isn't natively supported (a workaround is to add a placeholder pair and immediately void it).

By using this app you agree to never let a WD pair forget they start every handicap match already winning - because, as everyone knows, women always win (O_O;)
