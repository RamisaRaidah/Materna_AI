# MaternaAI: AI-Powered Maternal Health & Clinical Coordination Platform

MaternaAI is a comprehensive digital health platform designed to bridge the gap in maternal healthcare, specifically tailored for expectant and postpartum mothers, and their healthcare providers. By combining advanced AI-driven diagnostics, automated clinical risk assessments, and a unified clinician dashboard, MaternaAI delivers personalized care paths, peer-support networks, and real-time emergency triage systems. 

The platform is designed with accessibility at its core, featuring multilingual support (English and Bengali), voice capabilities, and offline SMS accessibility to support patients in rural or low-connectivity regions.

---

## System Architecture Overview

MaternaAI is structured as a modern full-stack web application consisting of a React single-page application (SPA) frontend, a Python Flask REST API backend, and a PostgreSQL database featuring PGVector for Retrieval-Augmented Generation (RAG).

```
d:/MaternaAI (Workspace Root)
├── Docs/                           # Global project documentation resources
├── MaternaAI-prototype/            # Prototype HTML/JS/CSS logic
└── MaternaAI/                      # Main codebase folder
    ├── backend/                    # Flask REST API
    │   ├── app.py                  # Main server entrypoint and route configuration
    │   ├── config.py               # Environment configurations and API keys
    │   ├── db/                     # Database schemas and initialization
    │   │   ├── schema.sql          # Database tables, checks, and vector indexes
    │   │   └── seed_knowledge.py   # Seeding scripts for RAG knowledge chunks
    │   ├── routes/                 # Blueprint APIs (auth, health, chat, clinician, etc.)
    │   ├── rules/                  # Clinical risk-calculation logic
    │   └── services/               # Third-party service modules (e.g., Auth helpers)
    └── frontend/                   # React SPA
        ├── src/
        │   ├── App.jsx             # Main routing and global navigation wrapper
        │   ├── pages/              # Page views (Landing, HealthTracker, ClinicianDashboard, etc.)
        │   ├── components/         # Shared frontend UI components
        │   └── context/            # React context providers for global state (e.g., Auth)
        ├── vite.config.js          # Vite build tool configuration
        └── package.json            # Frontend dependency specifications
```

---

## Core Features

### 1. AI-Driven Insights & Clinical OCR
* **Smart Medical Document Analyzer (OCR)**: Integrates the Gemini API (`gemini-2.5-flash`) to parse uploaded prescriptions and ultrasound scan reports. It automatically extracts key details including patient metrics, diagnostic notes, and medication lists (cross-referencing them with FDA Pregnancy Safety Categories).
* **Personalized AI Care Plans**: Generates custom, trimester-specific daily guidelines outlining nutrition, hydration, and safe physical activity based on the patient's gestational age and logged vitals.
* **Intelligent Chatbot with RAG**: A maternal health assistant powered by PostgreSQL `pgvector` semantic search. It queries localized WHO guidelines and clinical documentation to answer user queries with medically verified contexts.

### 2. Comprehensive Patient Health Tracking
* **Vitals Logger & Trend Analysis**: Enables patients to log blood pressure (systolic/diastolic), blood glucose, weight gain, and water intake. Vitals are automatically graphed to highlight long-term trends.
* **Cardiff Protocol Kick Counter**: An interactive timer and counter for monitoring fetal movement. If the Cardiff threshold is not met (e.g., fewer than 10 kicks in two hours), the platform flags a critical clinical risk.
* **Postpartum Depression (PPD) Screening**: Integrates the clinically validated Edinburgh Postnatal Depression Scale (EPDS) questionnaire. The system computes mental health risk profiles and suggests resources or flags warnings to clinicians when appropriate.

### 3. Clinician Portal & Care Coordination
* **Unified Clinician Dashboard**: Provides medical professionals with a centralized view of all registered patients, detailed medical history logs, and vitals trend lines.
* **Automated Severity Flagging & Triage**: Runs automated backend checks on logged vitals. Spikes in blood pressure (>=140/90 mmHg) or blood glucose (>=7.8 mmol/L) trigger critical alerts like preeclampsia or gestational diabetes risk.
* **Real-time Alert Dispatch**: Immediately populates emergency warnings on the clinician's portal for critical scenarios, including reduced fetal movement, critical hypertension, or severe physical symptoms (e.g., hemorrhage, swelling).

### 4. Accessibility & Rural Outreach
* **Bilingual & Localization Support**: Native English and Bengali support to cater to rural audiences.
* **Voice Assistance Integration**: Voice-to-text transcription and text-to-speech modules (using Edge TTS) to support users with low literacy.
* **Offline SMS Capability**: Concept support for SMS-based interaction through local mobile networks, ensuring mothers without active internet access can submit vitals and receive health notifications.
* **Safe Maternal Communities**: Discussion groups for mothers to connect, share postpartum advice anonymously, and build support networks, alongside dedicated channels for clinician communication.

---

## Tech Stack

### Backend
* **Framework**: Flask (Python)
* **Database**: PostgreSQL (with the `pgvector` extension for semantic search indexing)
* **AI/LLM**: Gemini API (`google-generativeai`), Cohere
* **Audio Processing**: `edge-tts` for dynamic speech synthesis
* **Security & Auth**: PyJWT, bcrypt hashing

### Frontend
* **Build Tooling & Library**: React 18, Vite
* **Styling**: Tailwind CSS v4 (offering responsive layouts and modern design tokens)
* **Icons & State**: Lucide React, Axios for REST client calls

---

## Getting Started

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd MaternaAI/backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and fill in your API credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/maternaai
   GEMINI_API_KEY=your_gemini_api_key
   SECRET_KEY=your_session_secret_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   COHERE_API_KEY=your_cohere_api_key
   ```
5. Initialize the PostgreSQL schema and seed database knowledge for RAG:
   ```bash
   psql -d maternaai -f db/schema.sql
   python db/seed_knowledge.py
   ```
6. Start the Flask application:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd MaternaAI/frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
4. Build the application for production deployment:
   ```bash
   npm run build
   ```

---

## Vision & Social Impact

MaternaAI was conceived to ensure that high-quality, personalized maternal support is accessible to everyone, everywhere. By bridging the gap between automated AI insights and certified human clinical networks, the platform helps:
- **Democratize Healthcare Info**: Deliver immediate guidance in local languages (Bengali/English) to remote areas.
- **Empower Expectant Mothers**: Assist with daily care plans, vital tracking, and peer connections to combat isolation and postpartum challenges.
- **Support Clinicians**: Provide automated severity-based triage systems that alert medical teams to critical risks early, when intervention is most effective.

### Medical Disclaimer
*MaternaAI is designed as an interactive maternal support assistant and clinical coordination tool to support expectant mothers and healthcare providers. It is not a replacement for professional, hands-on clinical diagnosis, physical checkups, or emergency medical services. Patients facing immediate physical danger or severe symptoms should contact their assigned clinician or emergency services immediately.*

---

<p align="center">
  Designed and developed with care to ensure safe births and healthy beginnings.
</p>
