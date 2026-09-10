<<<<<<< HEAD
# Productivity_Tracker
Personal productivity tracker — tasks, exams, study sessions &amp; analytics stored in your own Google Drive via Sheets. Google OAuth, zero external database.
=======
# Productivity Tracker

A responsive, full-stack personal productivity and exam preparation tracking system. Designed for complete personal data privacy, it is backed directly by your private **Google Drive & Google Sheets** via OAuth 2.0, with an automatic offline fallback (**Local JSON Database**) for development.

> 🔒 **Unique Value Proposition (UVP): 100% Private by Design**  
> Zero third-party database servers, zero analytics trackers, and zero vendor lock-in. Your schedule, study logs, and personal reflections belong entirely to you—stored exclusively in your private Google Drive (via Google Sheets) or locally on your machine.

---

## ✨ Key Features

- **100% Private & Self-Owned**: Zero external database servers; your tracking data lives solely in your personal Google Drive or local files.
- **Task Management**: Daily scheduling, priorities, categories, and recurrence.
- **Exam Preparation**: Clear separation of *Exam Date* vs *Preparation Deadline*, syllabus topics, and study progress.
- **Arc Sprints**: Multi-week goal sprints with target metrics, milestones, and linked tasks.
- **Daily Life Logging**: Track sleep, study hours, focus ratings, mood, energy, and reflections.
- **Descriptive Analytics**: Trend charts and categorical breakdowns without artificial guilt scores.
- **Dual Storage Engine**: Seamlessly switches between a local JSON file (`.dev-database.json`) in development and Google Sheets in production.
- **Zero Database Server**: No hosted backend database to manage or pay for.

---

## 🏗️ Architecture

The application follows a decoupled domain-driven architecture with server-side proxying and strict TypeScript contracts:

```text
┌────────────────────────────────────────────────────────┐
│              Frontend Pages & Components               │
│   (React 19 strict hooks, 0 render ref accesses)       │
└──────────────────────────┬─────────────────────────────┘
                           │ strongly-typed apiClient (ApiError.code)
┌──────────────────────────▼─────────────────────────────┐
│          Next.js API Routes (/api/proxy, /api/auth)    │
│    (Strict unknown error narrowings, safe payloads)    │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│              Central Action Dispatcher                 │
│              (src/lib/server/dispatcher.ts)            │
└──────┬───────────────────┬───────────────────┬─────────┘
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│Task Services│     │Exam Services│     │Arc Services │ ... (10 domain services)
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
┌──────▼───────────────────▼───────────────────▼─────────┐
│        Store Factory (src/lib/server/stores/)          │
│   ┌─────────────────────┐   ┌────────────────────────┐ │
│   │    DevFileStore     │   │    GoogleSheetStore    │ │
│   │ (Atomic temp-rename)│   │(Bounded LRU + Backoff) │ │
│   └─────────────────────┘   └────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server components, API route handlers, and Turbopack compiler |
| **Frontend** | React 19 + TypeScript | Strict component rendering with end-to-end type safety |
| **Styling** | Tailwind CSS v4 | CSS variable design tokens and fluid responsive layouts |
| **Icons** | Lucide React | Modern, tree-shakeable SVG icon set |
| **Charts** | Recharts 3 | Declarative SVG trend and distribution visualizations |
| **Cloud Database** | Google Sheets API v4 | Bounded LRU cache (100 entries, 30s TTL) with 429 retry backoff |
| **Local Database** | `DevFileStore` | Auto-seeded `.dev-database.json` with atomic `.tmp` file writes |
| **Security** | Node.js Crypto | AES-256-GCM encrypted session cookies & OAuth 2.0 PKCE |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.18+` or `v20+`
- **npm**: `v9+` or `v10+`

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Environment Configuration

Copy the template environment configuration:

- **macOS / Linux**: `cp .env.example .env.local`
- **Windows (PowerShell)**: `Copy-Item .env.example .env.local`
- **Windows (CMD)**: `copy .env.example .env.local`

Edit `.env.local` with your configuration:

```env
# Google OAuth 2.0 (Optional for local dev, required for Google Sheets)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Session Cookie Encryption Key (min 32 chars)
AUTH_SECRET=your-secure-auth-secret-min-32-chars-random!
```

> **Offline / Local Dev Mode**: If no Google credentials are provided, the application runs entirely offline using a local [`.dev-database.json`](./.dev-database.json) file. This file is auto-created with sample data on your first run.

### 3. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the dashboard.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack on `localhost:3000` |
| `npm run build` | Compile production build with TypeScript verification |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint check |
| `npm run type-check` | Verify strict TypeScript compilation (`tsc --noEmit`) |

---

## 📁 Project Structure

```text
src/
├── app/                   # Next.js App Router (pages & API proxy routes)
│   ├── api/               # /api/auth, /api/connection, /api/proxy
│   ├── dashboard/         # Main command center
│   ├── tasks/             # Task management
│   ├── exams/             # Exam preparation & topics
│   ├── arc/               # Goal sprints & milestones
│   ├── daily-log/         # Life logging & reflections
│   ├── reviews/           # Periodic retrospectives
│   └── settings/          # Google OAuth & data management
├── components/            # UI components, layout, and domain modals
├── lib/
│   ├── api/client.ts      # Strongly-typed API client
│   ├── auth/session.ts    # AES-256-GCM encrypted session management
│   └── server/            # Dispatcher, stores (Dev & Sheets), and 10 domain services
└── types/                 # Modular domain TypeScript definitions
```

---

## 🔒 Security & Privacy

- **100% Private (Core UVP)**: No third-party database servers, no tracking scripts, and no telemetry. Your logs and personal data remain 100% under your own control in your personal Google Drive or local filesystem.
- **Encrypted Sessions**: OAuth tokens and user sessions are protected using authenticated AES-256-GCM encrypted HTTP-only cookies.
- **Formula Injection Neutralization**: All spreadsheet cell writes sanitize strings beginning with `=`, `+`, `-`, or `@`.
- **Mass-Assignment Defense**: Entity updates pass through strict field allowlists.
- **Safe Local Writes**: The local development store uses atomic rename operations to prevent file corruption.
>>>>>>> ff3d5ef (Initial Commit)
