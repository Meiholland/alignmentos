# AlignmentOS Architecture Overview

## Tech Stack

- **Next.js 14** (App Router) - Full-stack React framework with Server Components and API routes
- **TypeScript** - Type safety across the application
- **Supabase** - PostgreSQL database, authentication, and storage
- **Tailwind CSS** - Utility-first CSS framework
- **Zod** - Schema validation
- **Azure OpenAI** - AI analysis engine (configurable model)

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── admin/                   # Admin dashboard routes
│   │   ├── layout.tsx          # Admin layout wrapper
│   │   ├── page.tsx            # Admin dashboard home
│   │   ├── startups/           # Startup management
│   │   │   ├── page.tsx        # List all startups
│   │   │   ├── new/            # Create new startup
│   │   │   └── [id]/           # Startup detail page
│   │   │       ├── page.tsx    # View/edit startup & founders
│   │   │       └── report/     # Diagnostic report view
│   │   └── founders/           # Founder management
│   │       └── [id]/
│   │           └── upload-interview/
│   ├── survey/                 # Founder survey routes
│   │   ├── [token]/            # Tokenized survey page
│   │   └── thank-you/          # Survey completion page
│   ├── api/                    # API routes
│   │   ├── startups/           # Startup CRUD operations
│   │   ├── founders/           # Founder management
│   │   ├── survey/             # Survey operations
│   │   ├── interviews/         # Interview transcript upload
│   │   ├── analysis/           # AI analysis generation
│   │   ├── reports/            # Diagnostic report retrieval
│   │   └── admin/              # Admin utilities
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── lib/                        # Shared utilities
│   ├── supabase/              # Supabase client configurations
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server-side client
│   │   └── admin.ts           # Admin client (service role)
│   ├── ai/                    # AI analysis engine
│   │   └── analysis-engine.ts # Core AI analysis logic
│   ├── schemas/               # Zod validation schemas
│   │   ├── startup.ts
│   │   ├── founder.ts
│   │   └── survey.ts
│   └── utils.ts               # Utility functions
├── types/                     # TypeScript type definitions
│   └── database.types.ts     # Supabase-generated types
├── migrations/                # Database migrations
│   ├── 001_initial_schema.sql
│   └── 002_seed_initial_questions.sql
└── package.json
```

## Database Schema

### Core Tables

1. **startups** - Company profiles
   - Stores basic company information
   - Links to founders and reports

2. **founders** - Founder profiles
   - Linked to startups via `startup_id`
   - Contains survey tokens and status tracking
   - Stores founder metadata (equity, role, experience)

3. **survey_questions** - Survey question bank
   - Supports versioning for future survey updates
   - Organized by dimensions (team_alignment, commitment, etc.)
   - Active/inactive flag for question management

4. **survey_responses** - Individual survey answers
   - Links founder + question + response value (1-10)
   - Unique constraint prevents duplicate responses
   - Timestamped for analysis

5. **interview_transcripts** - Interview data
   - Stores raw text extracted from uploaded files
   - Optional file URL for original file storage
   - Linked to specific founder

6. **diagnostic_reports** - AI-generated reports
   - Stores structured JSON analysis
   - Contains executive summary
   - Versioned by creation timestamp

## Key Features

### 1. Admin Dashboard

**Authentication**: Uses Supabase Auth (can be extended with any provider)

**Core Functionality**:
- Create/manage startups
- Add founders to startups
- Send survey links (generates tokenized URLs)
- Upload interview transcripts (.txt or .pdf)
- Trigger AI analysis
- View diagnostic reports

**Routes**:
- `/admin` - Dashboard with stats
- `/admin/startups` - List all startups
- `/admin/startups/new` - Create startup form
- `/admin/startups/[id]` - Startup detail & founder management
- `/admin/startups/[id]/report` - Diagnostic report view
- `/admin/founders/[id]/upload-interview` - Upload transcript

### 2. Founder Survey Flow

**Tokenized Access**: No login required - uses UUID tokens

**Features**:
- Dynamic question loading from database
- Auto-save functionality (saves progress without submitting)
- Progress tracking
- 1-10 Likert scale responses
- Prevents re-submission after completion
- Token expiration (30 days default)

**Flow**:
1. Admin sends survey link: `/survey/{token}`
2. Founder opens link, sees questions
3. Founder answers questions (auto-saves)
4. Founder submits survey
5. Status updated to 'completed'
6. Responses locked from editing

**Routes**:
- `/survey/[token]` - Survey form
- `/survey/thank-you` - Completion confirmation

### 3. Interview Upload

**Supported Formats**: .txt, .pdf

**Process**:
1. Admin selects file and founder
2. File uploaded via FormData
3. Text extracted (PDF parsing via pdf-parse library)
4. Text stored in database
5. Optional file storage in Supabase Storage
6. Founder interview status updated

**API**: `POST /api/interviews/upload`

### 4. AI Analysis Engine

**Input Data**:
- Startup metadata
- All founder profiles
- All survey responses (grouped by founder)
- All interview transcripts

**Analysis Dimensions**:
- Team Strength Index (0-100)
- Functional Gap Analysis
- Decision Architecture Risk
- Commitment Asymmetry Score
- Leadership Centralization Risk
- Conflict Productivity Assessment
- Red Flags Detection
- Contradiction Detection
- Ownership Overlap Analysis
- Fragile Dependency Identification

**Output**:
- Structured JSON analysis
- Executive summary (2-3 paragraphs)
- Investment recommendation
- Suggested interventions

**Process**:
1. Admin triggers analysis from startup detail page
2. System collects all relevant data
3. Data formatted for AI prompt
4. Azure OpenAI generates analysis
5. Results stored in `diagnostic_reports` table
6. Report viewable immediately

**API**: `POST /api/analysis/generate`

### 5. Diagnostic Report View

**Visualizations**:
- Key metrics with progress bars
- Risk heatmap (color-coded)
- Red flags with severity indicators
- Contradiction highlights
- Investment recommendation

**Sections**:
- Executive Summary
- Key Metrics Dashboard
- Investment Implications
- Red Flags
- Functional Gap Analysis
- Contradictions Detected
- Suggested Interventions
- Detailed Risk Assessments

## API Routes

### Startups
- `GET /api/startups` - List all startups
- `POST /api/startups` - Create startup
- `GET /api/startups/[id]` - Get startup details

### Founders
- `GET /api/founders?startup_id={id}` - List founders
- `POST /api/founders` - Create founder
- `POST /api/founders/[id]/send-survey` - Generate survey link

### Survey
- `GET /api/survey/questions` - Get active questions
- `GET /api/survey/token/[token]` - Validate token
- `POST /api/survey/save` - Auto-save progress
- `POST /api/survey/submit` - Submit survey

### Interviews
- `POST /api/interviews/upload` - Upload transcript

### Analysis
- `POST /api/analysis/generate` - Generate diagnostic report

### Reports
- `GET /api/reports/[startup_id]` - Get latest report

### Admin
- `GET /api/admin/stats` - Dashboard statistics

## Security Considerations

1. **Authentication**: All admin routes require Supabase auth
2. **Survey Tokens**: UUID tokens with expiration dates
3. **Service Role Key**: Only used server-side for admin operations
4. **File Upload**: Validated file types and sizes
5. **Input Validation**: Zod schemas validate all inputs

## Scalability Features

1. **Survey Versioning**: Questions can be versioned without redeploying
2. **Modular AI Engine**: Easy to swap AI providers or add ML models
3. **Database Indexing**: Key queries are indexed for performance
4. **Stateless API**: API routes are stateless and scalable
5. **File Storage**: Optional Supabase Storage for large files

## Future Extensibility

1. **Survey Versioning**: Already supported in schema
2. **ML Model Integration**: AI engine can be extended with custom models
3. **Email Integration**: Survey links can be sent via email service
4. **Advanced Analytics**: Can add reporting dashboards
5. **Multi-tenancy**: Can be extended for multiple VC firms

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Public project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public anon key
SUPABASE_SERVICE_ROLE_KEY=         # Secret service role key

# Azure OpenAI
AZURE_AI_API_KEY=                  # Azure OpenAI API key
AZURE_AI_ENDPOINT=                 # Azure OpenAI endpoint URL
AZURE_AI_MODEL_NAME=               # Model deployment name (e.g., gpt-5-mini)
AZURE_AI_API_VERSION=              # API version (e.g., 2025-04-01-preview)

# App
NEXT_PUBLIC_APP_URL=               # App URL (for survey links)
```

## Development Workflow

1. Run migrations in Supabase SQL Editor
2. Set up environment variables
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`
5. Create admin user in Supabase Auth
6. Access admin dashboard and create first startup

## Production Considerations

1. Set up proper RLS policies in Supabase
2. Configure CORS for API routes
3. Set up email service for survey links
4. Monitor Azure OpenAI API usage and costs
5. Set up error tracking (Sentry, etc.)
6. Configure proper logging
7. Set up CI/CD pipeline
8. Database backups and monitoring
