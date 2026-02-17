-- Seed initial survey questions (v1)
-- These can be updated via admin interface later

INSERT INTO survey_questions (version, dimension, question_text, question_order, active) VALUES
(1, 'team_alignment', 'How aligned are you with your co-founders on the company vision?', 1, true),
(1, 'team_alignment', 'How well do you agree on strategic priorities?', 2, true),
(1, 'team_alignment', 'How consistent is your understanding of target market?', 3, true),
(1, 'commitment', 'How committed are you personally to this startup?', 4, true),
(1, 'commitment', 'How committed do you believe your co-founders are?', 5, true),
(1, 'commitment', 'How likely are you to stay for the next 3 years?', 6, true),
(1, 'decision_making', 'How clear is the decision-making process in your team?', 7, true),
(1, 'decision_making', 'How satisfied are you with how decisions are made?', 8, true),
(1, 'decision_making', 'How often do you disagree with major decisions?', 9, true),
(1, 'equity_fairness', 'How fair do you think the equity distribution is?', 10, true),
(1, 'equity_fairness', 'How satisfied are you with your equity percentage?', 11, true),
(1, 'role_clarity', 'How clear are your roles and responsibilities?', 12, true),
(1, 'role_clarity', 'How well-defined are your co-founders roles?', 13, true),
(1, 'communication', 'How effective is communication within the founding team?', 14, true),
(1, 'communication', 'How often do you have meaningful discussions about strategy?', 15, true),
(1, 'conflict_resolution', 'How well does your team handle disagreements?', 16, true),
(1, 'conflict_resolution', 'How productive are conflicts when they arise?', 17, true),
(1, 'trust', 'How much do you trust your co-founders?', 18, true),
(1, 'trust', 'How confident are you in your co-founders abilities?', 19, true),
(1, 'workload', 'How balanced is the workload distribution?', 20, true);
