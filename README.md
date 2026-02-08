# Lower Cross Media Intelligence Platform

A unified media performance dashboard that gives Lower Cross and its clients a single source of truth across all paid channels, with built-in incrementality signals and creative strategy insights.

![Dashboard Preview](./docs/dashboard-preview.png)

## Features

### MVP (Phase 1)
- **Cross-Channel Summary Dashboard** — Total spend, revenue, MER, blended ROAS at a glance
- **Meta Ads Drilldown** — Campaign → Adset → Ad level performance with expandable rows
- **Google Ads Drilldown** — Campaign → Ad Group hierarchy with full metrics
- **Creative Performance** — Grid view with thumbnails, fatigue indicators, and sorting
- **MER & Efficiency Tracker** — Marketing efficiency ratio with contribution margin calculator
- **Client Management** — Multi-client support with API credential management

### Coming Soon
- Northbeam integration for attribution data
- Triple Whale comparison views
- Automated weekly reports
- Slack/email alerts for threshold breaches

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts + Tremor
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (coming soon)
- **Hosting:** Vercel + Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lowercross/media-platform.git
   cd media-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials.

4. **Set up the database:**
   
   Run the migrations in your Supabase SQL editor:
   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # Paste into Supabase SQL Editor and run
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── meta/               # Meta Ads drilldown
│   ├── google/             # Google Ads drilldown
│   ├── creative/           # Creative performance
│   ├── mer/                # MER & efficiency tracker
│   └── settings/           # Client & settings management
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── creative/           # Creative analysis components
│   ├── mer/                # MER tracking components
│   ├── layout/             # Layout components (sidebar, header)
│   └── ui/                 # shadcn/ui components
├── contexts/               # React contexts (app state)
├── lib/
│   ├── api/                # API integrations (Meta, Google, Northbeam)
│   ├── data/               # Data aggregation functions
│   ├── supabase/           # Supabase client configuration
│   └── seed.ts             # Demo data generation
├── types/                  # TypeScript type definitions
└── hooks/                  # Custom React hooks
```

## Database Schema

### Tables

- **clients** — Client accounts with API credentials and targets
- **daily_metrics** — Core metrics table (spend, revenue, ROAS, etc.)
- **creative_assets** — Creative performance with fatigue tracking
- **mer_snapshots** — Historical MER data for trend analysis

See `supabase/migrations/001_initial_schema.sql` for full schema.

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migration SQL in the SQL Editor
3. Copy the project URL and anon key to `.env.local`

### API Integrations (Optional)

For live data, configure these in Settings:

- **Meta Marketing API** — Requires Business Manager admin access
- **Google Ads API** — Requires API access approval
- **Northbeam** — Requires API key from Northbeam dashboard

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Components

1. UI components go in `src/components/ui/`
2. Feature components go in `src/components/{feature}/`
3. Use shadcn/ui patterns for consistency

### Adding New Pages

1. Create folder in `src/app/{route}/`
2. Add `page.tsx` with the page component
3. Update navigation in `src/components/layout/sidebar.tsx`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm run start
```

## Architecture

### Data Flow

1. **Seed Data (MVP)** — Demo data generated in-memory for testing
2. **Supabase (Production)** — PostgreSQL database with RLS
3. **API Sync (Future)** — Cron jobs pull data from Meta/Google/Northbeam

### State Management

- **AppContext** — Global state for client selection and date range
- **React Query (Future)** — For API data caching and mutations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary — Lower Cross Media LLC

## Support

For questions or issues, contact the development team.
