import sys
import os

# Adjust path to import db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import query

def migrate():
    print("Running migration for risk tables...")
    query("""
    CREATE TABLE IF NOT EXISTS risk_assessments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        risk_level VARCHAR(20) NOT NULL,
        condition_flags TEXT[] DEFAULT '{}',
        explanation TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        rule_score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """, fetch="none")
    query("""
    CREATE TABLE IF NOT EXISTS risk_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        risk_level VARCHAR(20) NOT NULL,
        condition_flags TEXT[] DEFAULT '{}',
        explanation TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        rule_score INTEGER DEFAULT 0,
        symptoms_analyzed JSONB DEFAULT '{}',
        last_computed_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """, fetch="none")
    print("Migration completed successfully!")

if __name__ == '__main__':
    migrate()
