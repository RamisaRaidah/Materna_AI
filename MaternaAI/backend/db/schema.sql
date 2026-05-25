-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'patient', -- patient | clinician | admin
    age INTEGER,
    weeks_pregnant INTEGER,        -- NULL if postpartum
    is_postpartum BOOLEAN DEFAULT FALSE,
    persona VARCHAR(20) DEFAULT 'pregnant', -- pregnant | postpartum | recovery
    due_date DATE,
    location VARCHAR(100),         -- district/division in Bangladesh
    emergency_contact VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health logs (what user reports each session)
CREATE TABLE health_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    bp_systolic INTEGER CHECK (bp_systolic BETWEEN 70 AND 250),
    bp_diastolic INTEGER CHECK (bp_diastolic BETWEEN 40 AND 150),
    blood_glucose NUMERIC(5,2),
    weight_gain NUMERIC(5,2),
    water_intake NUMERIC(4,2),
    raw_input TEXT NOT NULL,           -- original voice/text input
    transcribed_text TEXT,             -- after Bangla STT
    symptoms TEXT[],                   -- extracted symptom array
    danger_level VARCHAR(20),          -- 'safe', 'warning', 'danger'
    severity_score INTEGER DEFAULT 0
    llm_response TEXT,                 -- what the AI said back
    flagged_abuse BOOLEAN DEFAULT FALSE,
    flagged_ppd BOOLEAN DEFAULT FALSE,
    CHECK (bp_systolic > bp_diastolic),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PPD assessments (Edinburgh scale)
CREATE TABLE ppd_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,            -- {q1: 2, q2: 1, ...}
    total_score INTEGER NOT NULL,
    risk_level VARCHAR(20),            -- 'low', 'moderate', 'high'
    llm_advice TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Birth plans
CREATE TABLE birth_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hospital_name VARCHAR(100),
    transport VARCHAR(150),
    support_person VARCHAR(100),
    pain_preference VARCHAR(50),
    special_notes TEXT,
    emergency_contacts JSONB,          -- [{name, phone, relation}]
    generated_plan TEXT,               -- LLM generated full plan
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition plans
CREATE TABLE nutrition_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    trimester INTEGER,
    conditions TEXT[],                 -- ['anemia', 'gestational_diabetes']
    generated_plan TEXT,               -- LLM generated meal plan
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fetal Kick Sessions
CREATE TABLE kick_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    kick_count INTEGER NOT NULL,
    elapsed_secs INTEGER NOT NULL,
    result VARCHAR(20), -- normal | reduced
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL, -- user | assistant
    content TEXT NOT NULL,
    intent VARCHAR(30), -- eclampsia | diet | abuse | general | bengali
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Groups
CREATE TABLE groups (
    id SERIAL PRIMARY KEy,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(30),  -- support | clinical | nutrition | rural
    emoji VARCHAR(10),
    color VARCHAR(10),
    creator_id INTEGER REFERENCES users(id),
    member_count INTEGER DEFAULT 1,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE group_members (
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Community posts
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,  -- AI moderation flag
    flag_reason TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Direct messages
CREATE TABLE direct_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLINICIAN ALERTS
CREATE TABLE clinician_alerts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL, -- bp | glucose | kick | sos | domestic | ppd | hemorrhage
    severity VARCHAR(20) DEFAULT 'critical',
    title TEXT NOT NULL,
    body TEXT,
    meta TEXT,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_name VARCHAR(100),
    appt_date DATE,
    appt_time VARCHAR(20),
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    embedding vector(1024),             -- pgvector column (1024 dims for Google embedding)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);