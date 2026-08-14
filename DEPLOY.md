# Deploying Quicktext on Render with Supabase

This guide covers deploying Quicktext (a Memos fork) on [Render](https://render.com) using [Supabase](https://supabase.com) PostgreSQL as the database.

## Prerequisites

- A GitHub account with this repository pushed
- A [Render](https://render.com) account
- A [Supabase](https://supabase.com) project

## Step 1: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the **PostgreSQL connection string** from:
   - **Project Settings → Database → Connection string → URI**
   - It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
3. Keep this connection string handy — you'll need it for Render

> **Note:** The app auto-creates all required tables on first startup via migrations. You do **not** need to run any SQL manually.

## Step 2: Deploy on Render

### Option A: Render Blueprint (Recommended)

1. Push this repository to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render will detect `render.yaml` automatically
4. Set the `MEMOS_DSN` environment variable to your Supabase connection string
5. Click **Apply**

### Option B: Manual Web Service

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Runtime** | Go |
| **Build Command** | `cd web && npm install -g pnpm@11.0.1 && pnpm install --frozen-lockfile && pnpm release && cd .. && go build -trimpath -ldflags="-s -w" -tags netgo,osusergo -o memos ./cmd/memos` |
| **Start Command** | `./memos --driver postgres --port $PORT` |
| **Health Check Path** | `/healthz` |

4. Add environment variables:

| Key | Value |
|-----|-------|
| `MEMOS_DSN` | Your Supabase PostgreSQL connection string |
| `MEMOS_DRIVER` | `postgres` |
| `MEMOS_DATA` | `/opt/render/project/data` |
| `GO_VERSION` | `1.26.2` |
| `NODE_VERSION` | `24` |

5. Click **Create Web Service**

## Step 3: Verify Deployment

1. Wait for the build to complete (first build takes ~5-10 minutes)
2. Visit your Render URL — you should see the Quicktext sign-up page
3. Create your admin account
4. Start taking notes!

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEMOS_DSN` | Yes | — | PostgreSQL connection string |
| `MEMOS_DRIVER` | Yes | `sqlite` | Database driver (`postgres` for Supabase) |
| `MEMOS_PORT` | No | `5230` | Server port (Render sets `$PORT` automatically) |
| `MEMOS_DATA` | No | `.` | Data directory for local file storage |
| `MEMOS_INSTANCE_URL` | No | — | Public URL for sharing features (e.g. `https://quicktext.onrender.com`) |

## Troubleshooting

### "failed to ping database"
- Verify your Supabase connection string is correct
- Check that password doesn't contain special characters that need URL-encoding
- Ensure the database is not paused (Supabase free tier pauses after 7 days of inactivity)

### "connection refused"
- Supabase may have IP restrictions. Go to **Supabase → Project Settings → Database → Network** and ensure your Render IP is allowed (or disable restrictions)

### Build fails with "pnpm not found"
- The build command installs pnpm globally first. If using manual setup, ensure `NODE_VERSION=24` is set

### Attachments disappear after redeploy
- Render's free tier has no persistent disk. Configure S3 storage in **Quicktext Settings → Storage** to persist attachments
- Alternatively, use Supabase Storage with an S3-compatible endpoint

## Local Development with Supabase

To test the Supabase connection locally:

```bash
# Backend (connects to Supabase)
go run ./cmd/memos --driver postgres --dsn "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" --port 8081

# Frontend (proxies API to backend)
cd web && pnpm dev
```

Then open http://localhost:3001
