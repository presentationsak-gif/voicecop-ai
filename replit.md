# VoiceCop AI — Smart Traffic Management System

## Overview

VoiceCop AI is a full-stack production-ready smart city traffic management system. Traffic police officers control signals using voice commands, supported by AI intent recognition, IoT signal control, and real-time computer vision alerts. The system includes a full landing/marketing website, live control room dashboard, voice command interface, and incident management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/voicecop-ai) — Tailwind, shadcn/ui, Framer Motion, Recharts
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── voicecop-ai/        # React+Vite frontend (port 25815, path /)
│   └── api-server/         # Express API server (port 8080, path /api)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed-voicecop.ts  # Database seeder with demo data
```

## Pages

- `/` — Landing/marketing page with hero, features, system architecture, demo scenario, pitch stats
- `/dashboard` — Control room: live junction grid, signals (N/S/E/W), alert feed, analytics stats
- `/voice` — Officer voice command interface: mic button, command input, AI earpiece response
- `/incidents` — Emergency corridor management, active incident list, corridor activation
- `/architecture` — Interactive system architecture flow diagram

## Database Schema

- `junctions` — Traffic intersections with status, congestion level, officer assignment
- `signals` — Individual traffic lights (N/S/E/W per junction) with state (red/yellow/green)
- `voice_commands` — Log of all voice commands with AI-parsed intent, confidence, response
- `incidents` — Emergency events (ambulance/fire/police) detected by AI cameras or officers
- `alerts` — Real-time notifications pushed to officer earpieces and control room

## API Endpoints

All served under `/api`:
- `GET /junctions` — List all junctions with signal IDs and live congestion
- `PATCH /signals/:id` — Update a signal state (manual control)
- `POST /commands` — Process a voice command (parses intent, executes signal changes)
- `GET /incidents` — List active emergency incidents
- `POST /incidents` — Create incident (triggers AI alert)
- `PATCH /incidents/:id` — Activate/resolve emergency corridors
- `GET /alerts` — List AI alerts for officers/control room
- `GET /analytics/overview` — Dashboard stats
- `GET /analytics/congestion` — Congestion data per junction/hour

## Seed Data

Run: `pnpm --filter @workspace/scripts run seed-voicecop`
- 6 Chennai junctions (Anna Salai, T. Nagar, Adyar, Vadapalani, Koyambedu, Tambaram)
- 24 signals (4 per junction)
- 5 voice commands in history
- 3 active incidents (1 ambulance corridor active, 1 fire engine, 1 police)
- 5 alerts (2 critical, 2 warning, 1 info)

## Run codegen after OpenAPI changes

`pnpm --filter @workspace/api-spec run codegen`
