-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: startups
CREATE TABLE startups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    industry TEXT,
    stage TEXT,
    geography TEXT,
    raise_amount NUMERIC,
    planned_close_date DATE,
    board_structure_description TEXT,
    deal_partner TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: founders
CREATE TABLE founders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT,
    email TEXT NOT NULL,
    equity_percentage NUMERIC,
    full_time_status BOOLEAN DEFAULT true,
    years_known_cofounders INTEGER,
    prior_startup_experience BOOLEAN DEFAULT false,
    previously_worked_together BOOLEAN DEFAULT false,
    is_ceo BOOLEAN DEFAULT false,
    survey_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'completed', 'expired'
    interview_status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'completed'
    survey_token UUID DEFAULT uuid_generate_v4(),
    survey_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: survey_questions
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version INTEGER NOT NULL DEFAULT 1,
    dimension TEXT NOT NULL, -- e.g., 'team_alignment', 'commitment', 'decision_making'
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: survey_responses
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    response_value INTEGER NOT NULL CHECK (response_value >= 1 AND response_value <= 10),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(founder_id, question_id)
);

-- Table: interview_transcripts
CREATE TABLE interview_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID -- Admin user ID
);

-- Table: diagnostic_reports
CREATE TABLE diagnostic_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    analysis_json JSONB NOT NULL,
    executive_summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Admin user ID
);

-- Indexes for performance
CREATE INDEX idx_founders_startup_id ON founders(startup_id);
CREATE INDEX idx_founders_survey_token ON founders(survey_token);
CREATE INDEX idx_survey_responses_founder_id ON survey_responses(founder_id);
CREATE INDEX idx_survey_responses_question_id ON survey_responses(question_id);
CREATE INDEX idx_survey_questions_active ON survey_questions(active, version);
CREATE INDEX idx_interview_transcripts_founder_id ON interview_transcripts(founder_id);
CREATE INDEX idx_diagnostic_reports_startup_id ON diagnostic_reports(startup_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON startups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_founders_updated_at BEFORE UPDATE ON founders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
