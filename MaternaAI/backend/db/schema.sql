-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER,
    weeks_pregnant INTEGER,        -- NULL if postpartum
    is_postpartum BOOLEAN DEFAULT FALSE,
    due_date DATE,
    location VARCHAR(100),         -- district/division in Bangladesh
    emergency_contact VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Health logs (what user reports each session)
CREATE TABLE health_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    raw_input TEXT NOT NULL,           -- original voice/text input
    transcribed_text TEXT,             -- after Bangla STT
    symptoms TEXT[],                   -- extracted symptom array
    danger_level VARCHAR(20),          -- 'safe', 'warning', 'danger'
    llm_response TEXT,                 -- what the AI said back
    flagged_abuse BOOLEAN DEFAULT FALSE,
    flagged_ppd BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PPD assessments (Edinburgh scale)
CREATE TABLE ppd_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    answers JSONB NOT NULL,            -- {q1: 2, q2: 1, ...}
    total_score INTEGER NOT NULL,
    risk_level VARCHAR(20),            -- 'low', 'moderate', 'high'
    llm_advice TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Birth plans
CREATE TABLE birth_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    hospital_name VARCHAR(100),
    support_person VARCHAR(100),
    pain_preference VARCHAR(50),
    special_notes TEXT,
    emergency_contacts JSONB,          -- [{name, phone, relation}]
    generated_plan TEXT,               -- LLM generated full plan
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nutrition plans
CREATE TABLE nutrition_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    trimester INTEGER,
    conditions TEXT[],                 -- ['anemia', 'gestational_diabetes']
    generated_plan TEXT,               -- LLM generated meal plan
    created_at TIMESTAMP DEFAULT NOW()
);

-- Community posts
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,  -- AI moderation flag
    flag_reason TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Community comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- RAG KNOWLEDGE BASE
-- ==========================================

-- This is where your medical knowledge lives
-- Each row is one chunk of a medical document
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    source VARCHAR(200),               -- e.g. 'WHO Maternal Health Guidelines'
    category VARCHAR(50),              -- 'danger_signs', 'nutrition', 'ppd', 'general'
    content TEXT NOT NULL,             -- the actual text chunk
    embedding vector(768),             -- pgvector column (768 dims for Google embedding)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);