-- Deal team de-biasing survey: questions (statements) and responses per founder

CREATE TABLE deal_team_survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dimension TEXT NOT NULL,
    statement_text TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE deal_team_survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES deal_team_survey_questions(id) ON DELETE CASCADE,
    response_value INTEGER NOT NULL CHECK (response_value >= 1 AND response_value <= 10),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(founder_id, question_id)
);

CREATE INDEX idx_deal_team_survey_responses_founder_id ON deal_team_survey_responses(founder_id);
CREATE INDEX idx_deal_team_survey_responses_question_id ON deal_team_survey_responses(question_id);

-- Seed 30 statements (deal team de-biasing survey)
INSERT INTO deal_team_survey_questions (dimension, statement_text, question_order, active) VALUES
('market_opportunity', 'The founder demonstrates strong insight into real customer pain.', 1, true),
('market_opportunity', 'The founder can clearly articulate why customers will pay.', 2, true),
('market_opportunity', 'The founder shows evidence-based understanding of the market.', 3, true),
('market_opportunity', 'The founder adjusts hypotheses based on market feedback.', 4, true),
('execution_discipline', 'The founder consistently follows through on commitments.', 5, true),
('execution_discipline', 'The founder manages limited resources effectively.', 6, true),
('execution_discipline', 'The founder prioritizes ruthlessly.', 7, true),
('execution_discipline', 'The founder drives progress between meetings.', 8, true),
('learning_coachability', 'The founder integrates critical feedback into action.', 9, true),
('learning_coachability', 'The founder seeks input from people more experienced than themselves.', 10, true),
('learning_coachability', 'The founder changes position when presented with strong evidence.', 11, true),
('decision_quality', 'The founder makes timely decisions under uncertainty.', 12, true),
('decision_quality', 'The founder communicates rationale behind decisions clearly.', 13, true),
('decision_quality', 'The founder revisits decisions when assumptions change.', 14, true),
('leadership_talent', 'The founder attracts high-quality people.', 15, true),
('leadership_talent', 'The founder delegates effectively.', 16, true),
('leadership_talent', 'The founder sets clear expectations.', 17, true),
('leadership_talent', 'The founder holds others accountable.', 18, true),
('psychological_stability', 'The founder remains composed under pressure.', 19, true),
('psychological_stability', 'The founder handles disagreement constructively.', 20, true),
('psychological_stability', 'The founder separates ego from company interest.', 21, true),
('strategic_thinking', 'The founder understands long-term implications of short-term decisions.', 22, true),
('strategic_thinking', 'The founder distinguishes signal from noise.', 23, true),
('strategic_thinking', 'The founder focuses on what drives enterprise value.', 24, true),
('commitment_risk', 'The founder demonstrates long-term commitment to the venture.', 25, true),
('commitment_risk', 'The founder has meaningful personal stake in the outcome.', 26, true),
('commitment_risk', 'The founder balances ambition with risk awareness.', 27, true),
('team_signals', 'The founding team shows complementary competencies.', 28, true),
('team_signals', 'The team demonstrates clear leadership structure.', 29, true),
('team_signals', 'The team appears resilient under stress scenarios.', 30, true);
