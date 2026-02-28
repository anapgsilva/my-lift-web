# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

A voice-controlled elevator webapp. The user speaks their starting and destination floors (e.g. "FROM GROUND TO LEVEL 25"), the app parses the numbers from the transcript, and sends a lift call to the KONE elevator API over a persistent WebSocket connection. Responses are spoken back to the user via the Web Speech Synthesis API.

## Commands

```bash
npm run dev          # Start dev server (exposed on 0.0.0.0)
npm run build        # Type-check + Vite build
npm run lint         # ESLint
npm run test         # Run all tests once (Vitest)
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

To run a single test file:
```bash
npx vitest run src/tests/auth.test.ts
```

## Environment Variables

Required at build time (via `.env` or CI secrets):

| Variable | Purpose |
|---|---|
| `VITE_API_HOSTNAME` | KONE API hostname (defaults to `dev.kone.com`) |
| `VITE_BUILDING_ID` | KONE building ID |
| `VITE_GROUP_ID` | KONE lift group ID |

`VITE_CLIENT_ID` / `VITE_CLIENT_SECRET` can be set as env vars but are normally provided at runtime via the login form (stored in `localStorage`).

## Architecture

### Data Flow

1. **Auth**: Login stores `userId`/`userPassword` in `localStorage`. These are used as OAuth2 `client_id`/`client_secret` for the KONE API.
2. **WebSocket init**: On mount, `getAccessTokenForSocket()` fetches a JWT from `POST /api/v2/oauth2/token`, then `openWebSocketConnection()` opens a persistent WSS connection to `wss://{hostname}/stream-v2` using subprotocol `koneapi`.
3. **Speech recognition**: `useSpeechRecognition` hook wraps the browser's `SpeechRecognition` API. On result, `parseNumbers()` extracts up to two floor numbers from the transcript.
4. **Floor mapping**: Spoken words → integers via `WORD_TO_NUM` (e.g. `"ground"` → `0`, `"twenty five"` → `25`). Integers → KONE area IDs via `koneApiMapping` (e.g. `0` → `2000`, `25` → `27000`).
5. **Lift call**: `sendLiftCall()` sends a `lift-call-api-v2` JSON payload over the open WebSocket.
6. **Response**: WebSocket messages are parsed; success triggers TTS "Calling your lift now.", errors are shown and spoken.

### Key Files

- `src/App.tsx` — Orchestrates auth state, WebSocket lifecycle, and speech recognition. Three `useEffect`s: check login, init WebSocket, auto-start listening.
- `src/hooks/useSpeechRecognition.ts` — Core hook. Manages `SpeechRecognition` instance, maps events to state updates, invokes `sendMessage` on valid input.
- `src/utils/constants.ts` — All env var access and derived API endpoint strings.
- `src/utils/liftService.ts` — OAuth2 token fetch (`fetchAccessToken`) and WebSocket message dispatch (`sendLiftCall`).
- `src/utils/mapping.ts` — `WORD_TO_NUM` (spoken → integer), `NUM_TO_WORD` (reverse), `koneApiMapping` (integer → KONE area ID).
- `src/utils/numbers.ts` — `parseNumbers()` regex-based extraction of floor numbers from transcript text.
- `src/utils/auth.ts` — `localStorage`-backed login/logout helpers.
- `src/utils/websocket.ts` — Opens WebSocket, wires up event handlers, returns a `Promise<WebSocket>`.
- `src/utils/speech.ts` — TTS wrapper using `window.speechSynthesis`.
- `src/types/koneApi.ts` — Full KONE API type definitions.
- `src/types/speechRecognition.ts` — `Status` union type (`'idle' | 'listening' | 'processing' | 'result' | 'error' | 'unsupported'`).
- `src/tests/setup.ts` — Vitest global setup: mocks `localStorage`, `speechSynthesis`, `SpeechSynthesisUtterance`, `SpeechRecognition`.

### TypeScript Config

Strict mode with `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedSideEffectImports` enabled. All imports must be used.

## Deployment

Deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The build base path is `/my-lift-web/`.
