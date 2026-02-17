# AlignmentOS - Pre-Series A Founder Diagnostic Tool

A venture capital tool for assessing founding team strength, alignment, and risk patterns post-term sheet but pre-close.

## Tech Stack

- **Next.js 14** (App Router) - Full-stack React framework
- **TypeScript** - Type safety
- **Supabase** - Database and authentication
- **Tailwind CSS** - Styling
- **Zod** - Schema validation
- **Azure OpenAI** - AI analysis engine

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and Azure OpenAI configuration.

3. Run database migrations:
```bash
# Apply migrations via Supabase dashboard or CLI
```

4. Start development server:
```bash
npm run dev
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard routes
│   ├── survey/            # Founder survey routes
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase client setup
│   ├── ai/               # AI analysis engine
│   └── schemas/          # Zod validation schemas
├── migrations/           # Database migrations
└── types/                # TypeScript type definitions
```

## Features

- Admin dashboard for managing startups and founders
- Tokenized survey links for founders
- Interview transcript upload and processing
- AI-powered diagnostic analysis
- Comprehensive diagnostic reports
