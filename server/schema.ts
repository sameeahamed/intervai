/**
 * PostgreSQL Database Schema & Migration Script for IntervAI
 * AI-Powered Voice Interview Assessment Platform
 */

export const POSTGRES_SCHEMA_SQL = `
-- Create UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'candidate', -- 'candidate' | 'admin'
    avatar_url TEXT,
    bio TEXT,
    target_role VARCHAR(128),
    experience_level VARCHAR(32) DEFAULT 'mid',
    skills TEXT[], -- Array of skills
    consent_camera BOOLEAN DEFAULT TRUE,
    consent_microphone BOOLEAN DEFAULT TRUE,
    consent_ai_evaluation BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INTERVIEWS TABLE
CREATE TABLE IF NOT EXISTS interviews (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(128) NOT NULL,
    experience_level VARCHAR(32) NOT NULL, -- 'entry', 'mid', 'senior', 'lead'
    interview_type VARCHAR(32) NOT NULL,   -- 'technical', 'hr', 'behavioral', 'situational', 'mixed'
    difficulty VARCHAR(32) NOT NULL,       -- 'easy', 'medium', 'hard', 'adaptive'
    current_difficulty VARCHAR(32) DEFAULT 'medium',
    skills TEXT[] NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 5,
    duration_minutes INTEGER NOT NULL DEFAULT 20,
    status VARCHAR(32) NOT NULL DEFAULT 'setup', -- 'setup', 'in_progress', 'completed', 'abandoned'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) REFERENCES interviews(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    difficulty_level VARCHAR(32) NOT NULL,
    expected_points TEXT[],
    hints TEXT,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ANSWERS TABLE
CREATE TABLE IF NOT EXISTS answers (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) REFERENCES interviews(id) ON DELETE CASCADE,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    candidate_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    audio_duration_seconds REAL DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    input_method VARCHAR(32) DEFAULT 'voice', -- 'voice' | 'text_fallback'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR(64) PRIMARY KEY,
    answer_id VARCHAR(64) REFERENCES answers(id) ON DELETE CASCADE,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    interview_id VARCHAR(64) REFERENCES interviews(id) ON DELETE CASCADE,
    technical_accuracy INTEGER NOT NULL CHECK (technical_accuracy BETWEEN 0 AND 100),
    relevance INTEGER NOT NULL CHECK (relevance BETWEEN 0 AND 100),
    completeness INTEGER NOT NULL CHECK (completeness BETWEEN 0 AND 100),
    communication INTEGER NOT NULL CHECK (communication BETWEEN 0 AND 100),
    reasoning INTEGER NOT NULL CHECK (reasoning BETWEEN 0 AND 100),
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    feedback TEXT NOT NULL,
    suggested_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VISUAL ENGAGEMENT METRICS TABLE
CREATE TABLE IF NOT EXISTS visual_engagement_metrics (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) REFERENCES interviews(id) ON DELETE CASCADE,
    sample_count INTEGER DEFAULT 0,
    face_presence_ratio REAL DEFAULT 100.0,
    camera_availability_ratio REAL DEFAULT 100.0,
    screen_center_orientation_ratio REAL DEFAULT 95.0,
    looking_away_count INTEGER DEFAULT 0,
    camera_stability_score REAL DEFAULT 90.0,
    lighting_quality_score REAL DEFAULT 90.0,
    overall_engagement_score REAL DEFAULT 92.0,
    disclaimer_accepted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INTEGRITY EVENTS TABLE
CREATE TABLE IF NOT EXISTS integrity_events (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) REFERENCES interviews(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL, -- 'tab_blur', 'tab_focus', 'cam_disconnect', 'mic_disconnect', 'long_pause'
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ASSESSMENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS assessment_reports (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    technical_score INTEGER NOT NULL,
    communication_score INTEGER NOT NULL,
    reasoning_score INTEGER NOT NULL,
    relevance_score INTEGER NOT NULL,
    completeness_score INTEGER NOT NULL,
    visual_engagement_score INTEGER NOT NULL,
    strengths TEXT[] NOT NULL,
    weaknesses TEXT[] NOT NULL,
    recommendations TEXT[] NOT NULL,
    executive_summary TEXT NOT NULL,
    suggested_roles TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS interview_templates (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    job_role VARCHAR(128) NOT NULL,
    experience_level VARCHAR(32) NOT NULL,
    interview_type VARCHAR(32) NOT NULL,
    default_difficulty VARCHAR(32) NOT NULL,
    skills TEXT[] NOT NULL,
    question_count INTEGER DEFAULT 5,
    duration_minutes INTEGER DEFAULT 20,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SCORING CONFIG TABLE
CREATE TABLE IF NOT EXISTS scoring_config (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    weight_technical REAL DEFAULT 0.35,
    weight_communication REAL DEFAULT 0.20,
    weight_reasoning REAL DEFAULT 0.20,
    weight_relevance REAL DEFAULT 0.15,
    weight_completeness REAL DEFAULT 0.10,
    weight_visual_engagement REAL DEFAULT 0.0, -- Supplementary non-penalizing
    passing_score INTEGER DEFAULT 70,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_questions_interview ON questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_answers_interview ON answers(interview_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_interview ON evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_reports_candidate ON assessment_reports(candidate_id);
`;
