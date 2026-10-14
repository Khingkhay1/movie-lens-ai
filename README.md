# MovieLens AI

**Identify movies and TV shows from video clips, explore title details, and keep track of identification history.**

MovieLens AI is a full-stack web application built with React and Vite on the frontend, Node.js and Express on the backend, Supabase for authentication and user data, Gemini AI for video identification, and TMDB for movie and TV metadata.

> **Project status:** This repository contains the application source code. A public live demo is not currently documented here. External API credentials and a configured Supabase project are required to run the full application.

## Features

- Upload a supported video clip for movie or TV identification.
- Submit direct HTTPS video URLs and supported video-platform links for identification. A platform link may fail if the video is private, unavailable, blocked, or cannot be extracted.
- Search for titles and view movie or TV details.
- Use account, profile, saved-title, and identification-history features.
- Connect a React frontend to an Express API, Gemini AI, TMDB, and Supabase.

Availability of individual features depends on valid environment configuration and the corresponding external services.

## Tech stack

- **Frontend:** React, Vite, React Router, Tailwind CSS
- **Backend:** Node.js, Express
- **Authentication and data:** Supabase
- **AI identification:** Google Gemini API
- **Movie metadata:** TMDB
- **HTTP and media handling:** Axios, Multer, FFmpeg-related tooling

## Architecture

```text
Browser
  └── React + Vite client (port 5173)
        └── Express API (port 5000)
              ├── Gemini API — video identification
              ├── TMDB API — movie and TV metadata
              └── Supabase — authentication and user data
```

## Prerequisites

- Node.js compatible with the Vite version in `client/package.json` (use a current Node.js LTS release).
- npm.
- A Supabase project.
- A Gemini API key.
- A TMDB API key.
- Any media-processing dependencies required by the backend environment.

## Run locally

Clone the repository, then install and configure the server and client separately.

### 1. Configure the backend

Open a terminal at the repository root:

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Edit `server/.env` and provide real values for:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `5000` |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS; local default is `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service-role key |
| `GEMINI_API_KEY` | Gemini API key |
| `TMDB_API_KEY` | TMDB API key |

Start the backend:

```powershell
npm run dev
```

The API should listen on `http://localhost:5000`. Its health endpoint is `http://localhost:5000/health`.

### 2. Configure the frontend

Open a second terminal at the repository root:

```powershell
cd client
npm install
Copy-Item .env.example .env
```

Edit `client/.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend URL; local default is `http://localhost:5000` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key for browser use |

Start the frontend:

```powershell
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

> Keep the backend and frontend terminals running while using the application. If you change an environment file, restart the affected development server.

## Quality checks

Run these commands from the relevant directory.

**Frontend lint and production build**

```powershell
cd client
npm run lint
npm run build
```

**Backend startup**

```powershell
cd server
npm run dev
```

The backend includes automated unit tests for URL validation and link-input handling. These tests cover selected validation paths; they do not replace end-to-end testing of uploads, AI identification, authentication, or external integrations. A successful build alone should not be interpreted as proof that every feature works.

## Security notes

- Never commit real `.env` files, API keys, access tokens, or Supabase service-role credentials.
- The Supabase service-role key must remain on the server. Do not put it in a `VITE_*` variable or browser code.
- Use only the Supabase publishable key in the frontend and configure database access policies appropriately.
- Treat uploaded videos and account data as private user content.

## Current limitations

- Link identification accepts direct HTTPS video URLs and attempts extraction from supported video-platform links. Arbitrary webpages, private videos, and unavailable or restricted videos may fail.
- Identification quality and availability depend on the external AI service, video accessibility, and valid API credentials.
- This repository does not currently document a public hosted demo.
- The backend package currently has no automated test suite configured.

## Project structure

```text
movie-lens-ai/
├── client/       # React + Vite frontend
│   └── src/
├── server/       # Express API and integrations
│   ├── routes/
│   └── services/
└── README.md
```

## Repository

[View MovieLens AI on GitHub](https://github.com/Khingkhay1/movie-lens-ai)

---

Built as a hands-on full-stack project exploring AI-assisted media identification, API integration, authentication, and user-specific application data.
