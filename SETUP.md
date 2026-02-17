# AlignmentOS Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Azure OpenAI endpoint and API key

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migrations in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_seed_initial_questions.sql`

3. Create a storage bucket named `transcripts`:
   - Go to Storage in Supabase dashboard
   - Create a new bucket called `transcripts`
   - Set it to public (optional, for direct file access)

4. Set up authentication:
   - Go to Authentication > Settings
   - Configure your preferred auth providers
   - For MVP, you can use email/password or magic links

5. Get your Supabase credentials:
   - Go to Project Settings > API
   - Copy your Project URL and anon key
   - Copy your service_role key (keep this secret!)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AZURE_AI_API_KEY=your_azure_ai_api_key
AZURE_AI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_AI_MODEL_NAME=gpt-5-mini
AZURE_AI_API_VERSION=2025-04-01-preview
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Create Your First Admin User

1. Go to your Supabase dashboard > Authentication
2. Create a new user manually or use the sign-up flow
3. This user will be able to access the admin dashboard

## Database Schema Overview

- **startups**: Company profiles
- **founders**: Founder profiles linked to startups
- **survey_questions**: Survey questions with versioning support
- **survey_responses**: Individual survey responses
- **interview_transcripts**: Uploaded interview transcripts
- **diagnostic_reports**: AI-generated diagnostic reports

## Key Features

### Admin Dashboard (`/admin`)
- Create and manage startups
- Add founders to startups
- Send survey links to founders
- Upload interview transcripts
- Generate diagnostic reports
- View reports with risk analysis

### Founder Survey (`/survey/[token]`)
- Tokenized survey links (no login required)
- Auto-save functionality
- 1-10 Likert scale questions
- Progress tracking

### AI Analysis Engine
- Analyzes survey responses and interview transcripts
- Generates structured diagnostic reports
- Identifies red flags, contradictions, and risks
- Provides investment recommendations

## Production Deployment

1. Deploy to Vercel or your preferred platform
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Set up environment variables in your deployment platform
4. Ensure Supabase RLS (Row Level Security) policies are configured if needed

## Notes

- The AI analysis uses Azure OpenAI. Ensure you have sufficient API credits and the deployment is configured correctly.
- Survey tokens expire after 30 days (configurable in the founders table)
- File uploads are stored in Supabase Storage (optional, transcripts are also stored as text in the database)
- The system is designed to be extensible - you can add new survey questions via the database without redeploying
