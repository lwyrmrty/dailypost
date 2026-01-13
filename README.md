# DailyPost

AI-powered LinkedIn and X content creation engine that learns your voice and generates daily post suggestions.

## Features

- **Voice Learning**: Complete a 7-step onboarding to teach the AI your unique writing style
- **Daily Generation**: Automatic post suggestions generated every night at 11pm
- **Dual Platform**: Content optimized for both LinkedIn and X (Twitter)
- **Learning Loop**: System improves based on which posts you use, edit, or skip
- **Chat Interface**: Create on-demand posts through conversational AI

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Neon (Serverless Postgres)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API
- **Deployment**: Fly.io

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Neon database account
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd DailyPost
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your values:
   - `DATABASE_URL`: Your Neon connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `CRON_SECRET`: Any random secure string

4. Push database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── (auth)/           # Login and signup pages
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── dashboard/    # Daily post review
│   │   ├── onboarding/   # 7-step voice training
│   │   ├── chat/         # On-demand content creation
│   │   └── settings/     # User settings
│   └── api/              # API routes
├── lib/
│   ├── db/               # Database schema and queries
│   ├── claude/           # AI client and prompts
│   ├── news/             # RSS aggregation
│   └── utils/            # Utilities
├── scripts/              # Cron scripts
└── auth.ts               # NextAuth configuration
```

## Usage

### Onboarding

1. Sign up for an account
2. Complete the 7-step onboarding:
   - Foundation (job, topics, goals)
   - Sample Posts (write example posts)
   - Upload Content (paste existing writing)
   - Inspiration (accounts you admire)
   - Post Types (rate preferences)
   - Tone Calibration (adjust voice blend)
   - Topic Perspectives (share your views)

### Daily Workflow

1. Posts are generated nightly at 11pm
2. Review suggestions in the dashboard
3. For each post:
   - **Posted**: Mark as used as-is
   - **Edit & Post**: Modify before using
   - **Save**: Keep for later
   - **Skip**: Not interested today
   - **Never**: Don't generate this type again

### On-Demand Creation

Use the Chat interface to:
- Create posts about specific topics
- Get post ideas for the week
- Refine existing drafts

## Deployment

### Fly.io

1. Install Fly CLI:
   ```bash
   brew install flyctl
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Create app:
   ```bash
   fly launch --no-deploy
   ```

4. Set secrets:
   ```bash
   fly secrets set DATABASE_URL="..."
   fly secrets set NEXTAUTH_SECRET="..."
   fly secrets set ANTHROPIC_API_KEY="..."
   fly secrets set CRON_SECRET="..."
   fly secrets set NEXTAUTH_URL="https://your-app.fly.dev"
   fly secrets set NEXT_PUBLIC_APP_URL="https://your-app.fly.dev"
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

### Cron Job

Set up daily generation:

```bash
# Using external cron service or GitHub Actions
curl -X POST https://your-app.fly.dev/api/generate-posts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/generate-posts` - Trigger post generation (requires CRON_SECRET)
- `GET/POST /api/onboarding` - Save/load onboarding data
- `GET /api/posts` - List generated posts
- `PATCH /api/posts/:id` - Update post status
- `POST /api/chat` - Chat with AI assistant

## Development

```bash
# Start dev server
npm run dev

# Database commands
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio

# Lint
npm run lint
```

## License

MIT
