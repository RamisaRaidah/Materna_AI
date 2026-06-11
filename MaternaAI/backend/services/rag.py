"""
rag_langgraph.py
----------------
LangGraph refactor of rag.py.

Two compiled graphs are exported:
  - patient_graph   : replaces rag_query()
  - clinician_graph : replaces clinician_rag_query()

All original logic (Gemini key rotation via llm_client, Cohere embed +
rerank, OpenRouter fallback queue, hardcoded last-resort strings) is
preserved exactly — just restructured as graph nodes and conditional edges.

PUBLIC API  (drop-in replacements)
-----------------------------------
    from rag_langgraph import rag_query, clinician_rag_query, extract_nutrition_metrics

Both functions have identical signatures and return types to the originals.
extract_nutrition_metrics() is unchanged and re-exported for convenience.
"""

import json
import logging
import re
from typing import Optional

import cohere
import google.generativeai as genai
import openai
import psycopg2
from pgvector.psycopg2 import register_vector
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

from config import DATABASE_URL, OPENROUTER_API_KEY, COHERE_API_KEY
from llm_client import (
    GeminiKeysExhausted,
    get_gemini_model,
    is_quota_error,
    mark_exhausted,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared clients (unchanged from original)
# ---------------------------------------------------------------------------

or_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)
co = cohere.Client(api_key=COHERE_API_KEY)

# ---------------------------------------------------------------------------
# DB / embed / rerank helpers (unchanged from original)
# ---------------------------------------------------------------------------

def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    return conn


def embed_text(text: str) -> list:
    response = co.embed(
        texts=[text],
        model="embed-multilingual-v3.0",
        input_type="search_query",
        embedding_types=["float"],
    )
    embedding = response.embeddings.float[0]
    print("EMBED DIM:", len(embedding))
    return embedding


def retrieve_context(query: str, category: str = None, top_k: int = 4) -> list:
    query_embedding = embed_text(query)
    conn = get_db()
    cur = conn.cursor()

    if category:
        cur.execute(
            """
            SELECT content, source, category,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM knowledge_chunks
            WHERE category = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, category, query_embedding, 10),
        )
    else:
        cur.execute(
            """
            SELECT content, source, category,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM knowledge_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, query_embedding, 10),
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    chunks = [
        {"content": row[0], "source": row[1], "category": row[2], "similarity": row[3]}
        for row in rows
    ]

    try:
        reranked = co.rerank(
            query=query,
            documents=[c["content"] for c in chunks],
            top_n=top_k,
            model="rerank-multilingual-v3.0",
        )
        return [chunks[r.index] for r in reranked.results]
    except Exception as e:
        print(f"Reranking failed, falling back to cosine order: {e}")
        return chunks[:top_k]


def format_context(chunks: list) -> str:
    if not chunks:
        return "No specific medical context found."
    return "\n\n".join(
        [f"[Source: {c['source']}]\n{c['content']}" for c in chunks]
    )


def get_recent_history(user_id: int, limit: int = 6) -> list:
    if not user_id:
        return []
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        rows = cur.fetchall()
        cur.close()
        rows.reverse()
        return [{"role": r[0], "content": r[1]} for r in rows]
    except Exception as e:
        print("Error fetching history for RAG:", e)
        return []
    finally:
        if conn:
            conn.close()


# ---------------------------------------------------------------------------
# Prompt builders (unchanged from original)
# ---------------------------------------------------------------------------

def build_system_prompt(
    user_profile: dict, context: str, mode: str, detected_lang: str = "bn"
) -> str:
    print("hello")
    if detected_lang == "en":
        lang_rule = """ABSOLUTE LANGUAGE RULE: The user is writing in ENGLISH. You MUST respond ENTIRELY in warm, simple English.
Every single word must be in English. Do NOT use any Bangla script, Arabic, or any other language.
If you write even one word in another language, you have FAILED your primary instruction.
This rule overrides ANY previous conversation history language patterns."""
    else:
        lang_rule = """ABSOLUTE LANGUAGE RULE: The user is writing in Bengali or Banglish. You MUST respond ENTIRELY in warm, natural Bengali (বাংলা). Please do not use cringe words. Use proper bangla.
1. Use standard Bengali script (Unicode).
2. Do NOT mix different languages. Do NOT use Hindi words or mixed gibberish.
3. Every single word must be in fluent Bengali, like a caring elder sister (Apu) or gentle midwife.
4.IMPORTANT MATERNAL STATUS RULE: If Is postpartum = True, the user has already
delivered the baby and is NOT currently pregnant. Do not provide trimester advice,
fetal movement advice, gestational age advice, or antenatal-care recommendations.
Instead focus on postpartum recovery, breastfeeding, maternal wellbeing, postpartum
bleeding, wound healing, contraception, and newborn care when relevant.
"""

    base_system = f"""You are MaternaAI, a compassionate maternal health companion for women in Bangladesh.
You speak in a warm, loving, and supportive tone, like a caring elder sister (Apu) or a gentle community midwife. Don't make it too informal though(this is an important rule). 

{lang_rule}

OTHER CRITICAL INSTRUCTIONS:
1. LENGTH: Be extremely brief — 2 to 3 warm sentences only. No bullet points or long paragraphs.
2. CONVERSATIONAL FLOW:
   - Suggest one simple, comforting step or local remedy.
   - End with exactly ONE warm, open-ended follow-up question.
3. CLINICAL SAFETY: Never diagnose. If danger signs are mentioned, gently encourage seeing a doctor.
4. LANGUAGE REMINDER: Always match your response language to the CURRENT user message, not the conversation history.

User Profile:
- Name: {user_profile.get('name', 'Unknown')}
- Weeks pregnant: {user_profile.get('weeks_pregnant', 'Unknown')}
- Is postpartum: {user_profile.get('is_postpartum', False)}
- Location: {user_profile.get('location', 'Bangladesh')}

User Profile rules:
If the patient is in the post-partum stages, then absolutely ignore the weeks pregnant part. Strictly make this about the post partum journey.

Medical Knowledge Context (Use this to guide your advice naturally):
{context}
"""

    if mode == "danger":
        task = "Acknowledge their symptom with warmth and care. Briefly state if it could be a warning sign, suggest a simple comforting step, and ask one gentle question to analyze the severity."
    elif mode == "ppd":
        task = "Respond with deep empathy and reassurance. Remind them they are not alone. Suggest one simple emotional self-care action, and ask one warm question about how they are sleeping or feeling."
    elif mode == "nutrition":
        task = "Suggest one healthy, affordable local food item rich in iron/folate suitable for their trimester. Ask one warm question about their daily meals or appetite."
    else:
        task = "Answer their question in a highly warm, supportive, and extremely concise manner. Ask one friendly follow-up question to keep the conversation interactive."

    return f"{base_system}\n\nTask: {task}"


def build_clinician_prompt(
    clinician_profile: dict,
    context: str,
    mode: str,
    patients: list,
    detected_lang: str = "en",
) -> str:
    if detected_lang == "bn":
        lang_rule = (
            "LANGUAGE RULE: The clinician is writing in Bengali/Banglish(Banglish is a mixture of english and bangla). "
            "Respond entirely in clear, professional Bengali (বাংলা). "
            "Use standard clinical terminology. Be structured and precise."
        )
    else:
        lang_rule = (
            "LANGUAGE RULE: Respond entirely in clear, professional English. "
            "Use standard clinical terminology. Be structured and precise."
        )

    if not patients:
        patient_block = "No specific patient records provided for this query."
    else:
        patient_entries = []
        for i, p in enumerate(patients, start=1):
            fields = "\n".join(
                f"    {k.replace('_', ' ').title()}: {v}" for k, v in p.items()
            )
            patient_entries.append(f"  Patient {i} — {p.get('name', 'Unknown')}:\n{fields}")
        patient_block = "PATIENT RECORDS:\n" + "\n\n".join(patient_entries)

    mode_configs = {
        "rapid_triage": {
            "title": "Rapid Triage",
            "purpose": (
                "Identify immediate maternal and fetal risks. "
                "Classify urgency, retrieve relevant clinical protocols, "
                "and generate clear escalation recommendations."
            ),
            "task": (
                "For each patient listed:\n"
                "1. Detect maternal and fetal danger signs from their data.\n"
                "2. Classify urgency: Routine / Urgent / Emergency.\n"
                "3. List possible diagnoses (differential).\n"
                "4. State the recommended escalation action.\n"
                "5. Cite the relevant clinical protocol or guideline from the retrieved context.\n"
                "6. If multiple patients, order them from highest to lowest urgency.\n"
                "Format output as a structured clinical note per patient."
            ),
            "rag_hint": "WHO maternal health guidelines, national obstetric protocols, emergency referral pathways, hospital SOPs.",
        },
        "vitals_watch": {
            "title": "Vitals Watch",
            "purpose": (
                "Perform trend analysis on patient vitals and flag abnormal patterns. "
                "Produce a prioritised review list."
            ),
            "task": (
                "For each patient listed:\n"
                "1. Summarise vital-sign trends (BP, glucose, weight, fetal movement).\n"
                "2. Identify abnormal patterns or threshold breaches.\n"
                "3. Assign a monitoring priority: High / Medium / Low.\n"
                "4. State a specific recommended action and review timeline.\n"
                "5. After individual summaries, produce a combined PRIORITY LIST.\n"
                "Format per patient, then the combined priority list at the end."
            ),
            "rag_hint": "Antenatal monitoring protocols, hypertension in pregnancy guidelines, gestational diabetes thresholds.",
        },
        "follow_up": {
            "title": "Follow-Up Plans",
            "purpose": (
                "Ensure continuity of care for at-risk patients, "
                "especially those with missed appointments or unresolved issues."
            ),
            "task": (
                "For each patient listed:\n"
                "1. Identify care gaps (missed visits, unsubmitted logs, pending labs).\n"
                "2. Generate a prioritised follow-up schedule.\n"
                "3. Draft a short outreach SMS the CHW can send.\n"
                "4. Provide a CHW call-script outline.\n"
                "5. List any unresolved clinical issues.\n"
                "If multiple patients, order them by follow-up urgency."
            ),
            "rag_hint": "Care continuity protocols, CHW outreach guidelines, risk-stratified follow-up schedules.",
        },
        "community": {
            "title": "Community Coverage",
            "purpose": (
                "Coordinate field operations: route referrals, identify coverage gaps, "
                "suggest nearest capable facilities, and monitor transport barriers."
            ),
            "task": (
                "For each patient or area listed:\n"
                "1. If a referral is needed, suggest the nearest appropriate facility.\n"
                "2. Note any transport barriers and suggest available support.\n"
                "3. Recommend CHW actions.\n"
                "4. After individual recommendations, produce a COVERAGE DASHBOARD.\n"
                "Use the referral network and facility directory from the retrieved context."
            ),
            "rag_hint": "Facility directory, referral network database, CHW reports, geographic and transport data.",
        },
    }

    cfg = mode_configs.get(
        mode,
        {
            "title": "General Clinical Query",
            "purpose": "Answer the clinician's question using evidence-based guidance.",
            "task": "Provide a concise, structured clinical response citing relevant protocols.",
            "rag_hint": "All available clinical knowledge sources.",
        },
    )

    clinician_role = clinician_profile.get("role", "Healthcare Provider")
    facility = clinician_profile.get("facility", "Health Facility")

    return f"""You are MaternaAI Clinical, an AI obstetric decision-support assistant designed to augment—not replace—the clinical judgment of physicians, midwives, nurses, and community health workers in Bangladesh.

Your purpose is to help healthcare professionals make evidence-based maternal health decisions using retrieved protocols, patient records, and field data.

TONE AND COMMUNICATION RULES — CRITICAL:
1. You are a clinical tool, not a social companion. Maintain a neutral, professional, informational tone at all times.
2. NEVER use personal address terms such as "Dear Doctor", "Dear Clinician", "My dear", "Dear staff", or any equivalent in any language.
3. Do NOT open with pleasantries, greetings, or affirmations (no "Of course!", "Great question!", "Sure!", etc.).
4. Do NOT use flattering or emotional language. Respond directly to the clinical question.
5. Start your response immediately with the clinical content — a heading, a patient name, or an assessment. Nothing else first.
6. You may use the clinician's name if directly relevant (e.g. in a handoff note), but never as a form of address in the response opening.

{lang_rule}

CLINICIAN CONTEXT:
  Role    : {clinician_role}
  Facility: {facility}

ACTIVE MODE: {cfg['title'].upper()}
Purpose: {cfg['purpose']}

{patient_block}

RETRIEVED CLINICAL KNOWLEDGE (ground all recommendations in this):
{context}
(Key sources for this mode: {cfg['rag_hint']})

RESPONSE RULES:
1. Use clear headings per patient. Never produce an unstructured wall of text.
2. Cover ALL patients in the list — do not skip any.
3. Ground every recommendation in the retrieved knowledge above.
4. If a situation appears life-threatening, state this explicitly and immediately.
5. Be concise but never omit clinically important details.
6. Provide differentials and recommendations; final diagnosis is the clinician's responsibility.

TASK:
{cfg['task']}
"""


# ===========================================================================
# PATIENT GRAPH
# ===========================================================================

class PatientState(TypedDict):
    # Inputs
    user_input: str
    user_profile: dict
    mode: str
    detected_lang: str
    user_id: int
    # Populated by nodes
    context: str
    system_content: str
    messages: list
    gemini_contents: list
    response: Optional[str]
    error: Optional[str]


# ── Node 1: retrieve ────────────────────────────────────────────────────────

def patient_retrieve(state: PatientState) -> PatientState:
    chunks = retrieve_context(
        state["user_input"],
        category=state["mode"] if state["mode"] != "general" else None,
    )
    return {**state, "context": format_context(chunks)}


# ── Node 2: build_prompt ────────────────────────────────────────────────────

def patient_build_prompt(state: PatientState) -> PatientState:
    system_content = build_system_prompt(
        state["user_profile"], state["context"], state["mode"], state["detected_lang"]
    )

    messages = [{"role": "system", "content": system_content}]
    history = get_recent_history(state["user_id"], limit=6)
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        if role == "user" and msg["content"] == state["user_input"]:
            continue
        messages.append({"role": role, "content": msg["content"]})

    if state["detected_lang"] == "en":
        tagged_input = (
            f"{state['user_input']}\n\n"
            "[LANGUAGE DIRECTIVE: The user just wrote in English. "
            "Your entire response MUST be in English only. Do NOT reply in Bengali.]"
        )
    else:
        tagged_input = (
            f"{state['user_input']}\n\n"
            "[LANGUAGE DIRECTIVE: The user just wrote in Bengali/Banglish. "
            "Your entire response MUST be in Bengali (বাংলা) only.]"
        )
    messages.append({"role": "user", "content": tagged_input})

    gemini_contents = [
        {
            "role": "user" if m["role"] == "user" else "model",
            "parts": [m["content"]],
        }
        for m in messages
        if m["role"] != "system"
    ]

    return {**state, "system_content": system_content, "messages": messages, "gemini_contents": gemini_contents}


# ── Node 3: gemini ──────────────────────────────────────────────────────────

def patient_gemini(state: PatientState) -> PatientState:
    key = None
    while True:
        try:
            _, key = get_gemini_model("gemini-2.5-flash")
            genai_model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=state["system_content"],
            )
            response_text = genai_model.generate_content(
                state["gemini_contents"],
                generation_config={"max_output_tokens": 500},
            ).text
            if response_text:
                print("Direct Gemini API call succeeded!")
                return {**state, "response": response_text, "error": None}
            # Empty response → fall through to OpenRouter
            return {**state, "response": None, "error": "empty_response"}
        except GeminiKeysExhausted:
            print("RAG — all Gemini keys exhausted, using OpenRouter.")
            return {**state, "response": None, "error": "keys_exhausted"}
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue  # rotate to next key
            print(f"Direct Gemini API failed: {e}")
            return {**state, "response": None, "error": str(e)}


# ── Node 4: openrouter ──────────────────────────────────────────────────────

def patient_openrouter(state: PatientState) -> PatientState:
    model_queue = [
        "google/gemini-2.5-flash",
        "qwen/qwen-2.5-72b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "meta-llama/llama-3.1-8b-instruct:free",
    ]
    last_err = None
    for model in model_queue:
        try:
            response = or_client.chat.completions.create(
                model=model,
                messages=state["messages"],
                max_tokens=500,
            )
            return {**state, "response": response.choices[0].message.content, "error": None}
        except Exception as e:
            print(f"Model {model} failed on OpenRouter: {e}")
            last_err = e

    return {**state, "response": None, "error": str(last_err)}


# ── Node 5: fallback ────────────────────────────────────────────────────────

def patient_fallback(state: PatientState) -> PatientState:
    lower_input = state["user_input"].lower()
    greeting_pattern = re.compile(
        r"\b(hello|hi|hey)\b|হ্যালো|সালাম|আসসালামুয়ালাইকুম|ভালো আছেন",
        re.IGNORECASE,
    )
    mode = state["mode"]
    lang = state["detected_lang"]

    if lang == "en":
        if greeting_pattern.search(lower_input):
            msg = "I'm MaternaAI, your caring maternal health companion. I'm here for you every step of the way — how are you feeling today?"
        elif mode == "danger":
            msg = "I hear you, and I care about your wellbeing. Please rest, stay hydrated, and if your discomfort increases, reach out to a healthcare provider soon."
        elif mode == "ppd":
            msg = "Your feelings are completely valid. Take a gentle moment for yourself, talk to someone you trust, and remember — you are never alone in this."
        elif mode == "nutrition":
            msg = "Nourishing yourself with wholesome local foods, plenty of water, and enough rest is so important right now. How has your appetite been lately?"
        else:
            msg = "Thank you for reaching out. I'm here to support you with any maternal health questions — what would you like to talk about?"
    else:
        if greeting_pattern.search(lower_input):
            msg = "আমি ম্যাটারনা এআই, আপনার যত্নশীল স্বাস্থ্য সহায়িকা। আপনার প্রতিটি পদক্ষেপে আমি আপনার পাশে আছি। আজ কেমন অনুভব করছেন?"
        elif mode == "danger":
            msg = "আমি আপনার কথা শুনছি এবং আপনার সুস্থতার জন্য চিন্তিত। একটু বিশ্রাম নিন, পানি পান করুন — আর যদি অস্বস্তি বাড়ে, তাহলে দ্রুত একজন ডাক্তারের সাথে কথা বলুন।"
        elif mode == "ppd":
            msg = "আপনার অনুভূতিগুলো একদম স্বাভাবিক এবং গুরুত্বপূর্ণ। নিজের জন্য একটু সময় নিন, কাছের কাউকে মনের কথা বলুন — মনে রাখবেন, আপনি একা নন।"
        elif mode == "nutrition":
            msg = "পুষ্টিকর দেশীয় খাবার, পর্যাপ্ত পানি আর ভালো বিশ্রাম এখন আপনার জন্য সবচেয়ে জরুরি। আজকে আপনার খাওয়ার রুচি কেমন ছিল?"
        else:
            msg = "আপনার বার্তার জন্য আন্তরিক ধন্যবাদ। মাতৃস্বাস্থ্য বিষয়ে যেকোনো প্রশ্নে আমি সাহায্য করতে এখানে আছি — আপনি কী জানতে চান?"

    return {**state, "response": msg, "error": None}


# ── Routing functions ───────────────────────────────────────────────────────

def route_after_gemini(state: PatientState) -> str:
    return "success" if state.get("response") else "openrouter"


def route_after_openrouter(state: PatientState) -> str:
    return "success" if state.get("response") else "fallback"


def route_after_fallback(state: PatientState) -> str:
    return "success"


# ── Build patient graph ─────────────────────────────────────────────────────

_patient_builder = StateGraph(PatientState)
_patient_builder.add_node("retrieve",      patient_retrieve)
_patient_builder.add_node("build_prompt",  patient_build_prompt)
_patient_builder.add_node("gemini",        patient_gemini)
_patient_builder.add_node("openrouter",    patient_openrouter)
_patient_builder.add_node("fallback",      patient_fallback)

_patient_builder.set_entry_point("retrieve")
_patient_builder.add_edge("retrieve",     "build_prompt")
_patient_builder.add_edge("build_prompt", "gemini")

_patient_builder.add_conditional_edges(
    "gemini",
    route_after_gemini,
    {"success": END, "openrouter": "openrouter"},
)
_patient_builder.add_conditional_edges(
    "openrouter",
    route_after_openrouter,
    {"success": END, "fallback": "fallback"},
)
_patient_builder.add_edge("fallback", END)

patient_graph = _patient_builder.compile()


# ===========================================================================
# CLINICIAN GRAPH
# ===========================================================================

class ClinicianState(TypedDict):
    # Inputs
    user_input: str
    clinician_profile: dict
    patients: list
    mode: str
    detected_lang: str
    clinician_id: Optional[int]
    top_k: int
    # Populated by nodes
    context: str
    system_content: str
    messages: list
    gemini_contents: list
    response: Optional[str]
    error: Optional[str]


# ── Node 1: retrieve ────────────────────────────────────────────────────────

def clinician_retrieve(state: ClinicianState) -> ClinicianState:
    category_map = {
        "rapid_triage": "danger",
        "vitals_watch": "vitals",
        "follow_up":    "followup",
        "community":    "community",
    }
    category = category_map.get(state["mode"])

    enriched_query = state["user_input"]
    if state["patients"]:
        names = ", ".join(p.get("name", "patient") for p in state["patients"])
        enriched_query = f"{state['user_input']} [Patients: {names}]"

    chunks = retrieve_context(enriched_query, category=category, top_k=state["top_k"])
    return {**state, "context": format_context(chunks)}


# ── Node 2: build_prompt ────────────────────────────────────────────────────

def clinician_build_prompt(state: ClinicianState) -> ClinicianState:
    system_content = build_clinician_prompt(
        clinician_profile=state["clinician_profile"],
        context=state["context"],
        mode=state["mode"],
        patients=state["patients"],
        detected_lang=state["detected_lang"],
    )

    messages = [{"role": "system", "content": system_content}]
    if state["clinician_id"]:
        history = get_recent_history(state["clinician_id"], limit=6)
        for msg in history:
            role = "user" if msg["role"] == "user" else "assistant"
            if role == "user" and msg["content"] == state["user_input"]:
                continue
            messages.append({"role": role, "content": msg["content"]})

    messages.append({"role": "user", "content": state["user_input"]})

    gemini_contents = [
        {
            "role": "user" if m["role"] == "user" else "model",
            "parts": [m["content"]],
        }
        for m in messages
        if m["role"] != "system"
    ]

    return {**state, "system_content": system_content, "messages": messages, "gemini_contents": gemini_contents}


# ── Node 3: gemini ──────────────────────────────────────────────────────────

def clinician_gemini(state: ClinicianState) -> ClinicianState:
    key = None
    while True:
        try:
            _, key = get_gemini_model("gemini-2.5-flash")
            genai_model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=state["system_content"],
            )
            response_text = genai_model.generate_content(
                state["gemini_contents"],
                generation_config={"max_output_tokens": 1500},
            ).text
            if response_text:
                print(f"Clinician RAG ({state['mode']}) — Gemini OK")
                return {**state, "response": response_text, "error": None}
            return {**state, "response": None, "error": "empty_response"}
        except GeminiKeysExhausted:
            print("Clinician RAG — all Gemini keys exhausted, using OpenRouter.")
            return {**state, "response": None, "error": "keys_exhausted"}
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue
            print(f"Clinician RAG — Gemini failed: {e}")
            return {**state, "response": None, "error": str(e)}


# ── Node 4: openrouter ──────────────────────────────────────────────────────

def clinician_openrouter(state: ClinicianState) -> ClinicianState:
    model_queue = [
        "google/gemini-2.5-flash",
        "qwen/qwen-2.5-72b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "meta-llama/llama-3.1-8b-instruct:free",
    ]
    last_err = None
    for model in model_queue:
        try:
            response = or_client.chat.completions.create(
                model=model,
                messages=state["messages"],
                max_tokens=1500,
            )
            return {**state, "response": response.choices[0].message.content, "error": None}
        except Exception as e:
            print(f"Clinician RAG — OpenRouter model {model} failed: {e}")
            last_err = e

    return {**state, "response": None, "error": str(last_err)}


# ── Node 5: fallback ────────────────────────────────────────────────────────

def clinician_fallback(state: ClinicianState) -> ClinicianState:
    fallbacks = {
        "rapid_triage": (
            "Clinical decision support is temporarily unavailable. "
            "Assess the patient directly using standard triage protocol "
            "and escalate to the supervising clinician if danger signs are present."
        ),
        "vitals_watch": (
            "Vitals trend analysis is temporarily unavailable. "
            "Review patient records manually and prioritise any patients "
            "with BP > 140/90 or reported reduced fetal movement."
        ),
        "follow_up": (
            "Follow-up plan generation is temporarily unavailable. "
            "Check the missed-appointment list and contact high-risk patients first."
        ),
        "community": (
            "Community coordination support is temporarily unavailable. "
            "Consult the facility referral directory directly "
            "and coordinate with the CHW supervisor."
        ),
    }
    msg = fallbacks.get(
        state["mode"],
        "Clinical AI support is temporarily unavailable. Follow standard protocols.",
    )
    return {**state, "response": msg, "error": None}


# ── Build clinician graph ───────────────────────────────────────────────────

_clinician_builder = StateGraph(ClinicianState)
_clinician_builder.add_node("retrieve",     clinician_retrieve)
_clinician_builder.add_node("build_prompt", clinician_build_prompt)
_clinician_builder.add_node("gemini",       clinician_gemini)
_clinician_builder.add_node("openrouter",   clinician_openrouter)
_clinician_builder.add_node("fallback",     clinician_fallback)

_clinician_builder.set_entry_point("retrieve")
_clinician_builder.add_edge("retrieve",     "build_prompt")
_clinician_builder.add_edge("build_prompt", "gemini")

_clinician_builder.add_conditional_edges(
    "gemini",
    route_after_gemini,      # same routing logic — checks state["response"]
    {"success": END, "openrouter": "openrouter"},
)
_clinician_builder.add_conditional_edges(
    "openrouter",
    route_after_openrouter,
    {"success": END, "fallback": "fallback"},
)
_clinician_builder.add_edge("fallback", END)

clinician_graph = _clinician_builder.compile()


# ===========================================================================
# Drop-in replacement public functions
# ===========================================================================

def rag_query(
    user_input: str,
    user_profile: dict,
    mode: str = "danger",
    detected_lang: str = "bn",
    user_id: int = 1,
) -> str:
    """Drop-in replacement for the original rag_query()."""
    result = patient_graph.invoke(
        {
            "user_input":    user_input,
            "user_profile":  user_profile,
            "mode":          mode,
            "detected_lang": detected_lang,
            "user_id":       user_id,
            "context":       "",
            "system_content": "",
            "messages":      [],
            "gemini_contents": [],
            "response":      None,
            "error":         None,
        }
    )
    return result["response"]


def clinician_rag_query(
    user_input: str,
    clinician_profile: dict,
    patients: list,
    mode: str = "rapid_triage",
    detected_lang: str = "en",
    clinician_id: int = None,
    top_k: int = 6,
) -> str:
    """Drop-in replacement for the original clinician_rag_query()."""
    result = clinician_graph.invoke(
        {
            "user_input":       user_input,
            "clinician_profile": clinician_profile,
            "patients":         patients,
            "mode":             mode,
            "detected_lang":    detected_lang,
            "clinician_id":     clinician_id,
            "top_k":            top_k,
            "context":          "",
            "system_content":   "",
            "messages":         [],
            "gemini_contents":  [],
            "response":         None,
            "error":            None,
        }
    )
    return result["response"]


# ===========================================================================
# extract_nutrition_metrics — unchanged, re-exported here for convenience
# ===========================================================================

def extract_nutrition_metrics(user_input: str, assistant_response: str) -> dict:
    """Unchanged from original rag.py — estimates iron/folate/calcium/protein from a meal log."""
    default_metrics = {"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}

    def safe_float(value):
        try:
            if value is None:
                return 0.0
            if isinstance(value, (int, float)):
                return float(value)
            match = re.search(r"[-+]?\d*\.?\d+", str(value))
            if match:
                return float(match.group())
            return 0.0
        except Exception:
            return 0.0

    extraction_prompt = f"""
    You are a strict data extraction engine. Your job is to convert food logs into structured nutritional data.
    
    User Input: {user_input}
    Context/Advisor Response: {assistant_response}
    
    Instructions:
    1. Identify all food items mentioned in the User Input.
    2. If the user DID NOT specify a quantity or portion size, assume a standard single serving size typical for a Bangladeshi home meal.
    3. Calculate or estimate the total cumulative metrics for: iron (mg), folate (mcg), calcium (mg), protein (g).
    4. Ensure all values are numeric floats or integers. Do not add strings or unit symbols inside the values.
    
    CRITICAL: Return your response STRICTLY as a raw JSON object matching the schema below. No markdown, no backticks, no explanation.
    {{"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}}
    """

    model_queue = [
        "qwen/qwen-2.5-72b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "meta-llama/llama-3.1-8b-instruct:free",
    ]

    parsed_data = None
    key = None

    while True:
        try:
            print("Trying nutrition extraction with: gemini-2.5-flash")
            model, key = get_gemini_model("gemini-2.5-flash")
            extraction_res = model.generate_content(
                extraction_prompt,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1},
            )
            raw_text = extraction_res.text
            if raw_text:
                raw_text = raw_text.strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?|```$", "", raw_text, flags=re.MULTILINE).strip()
                parsed_data = json.loads(raw_text)
                print("Nutrition extraction succeeded with gemini-2.5-flash")
            break
        except GeminiKeysExhausted:
            print("Nutrition extraction — all Gemini keys exhausted, trying OpenRouter.")
            break
        except json.JSONDecodeError as e:
            print(f"Gemini returned invalid JSON for nutrition extraction: {e}")
            break
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue
            print(f"Nutrition extraction failed for gemini-2.5-flash: {e}")
            break

    if not parsed_data:
        for model_name in model_queue:
            try:
                print(f"Trying nutrition extraction with: {model_name}")
                response = or_client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": extraction_prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                )
                raw_text = response.choices[0].message.content
                if not raw_text:
                    continue
                raw_text = raw_text.strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?|```$", "", raw_text, flags=re.MULTILINE).strip()
                parsed_data = json.loads(raw_text)
                print(f"Nutrition extraction succeeded with {model_name}")
                break
            except json.JSONDecodeError as e:
                print(f"{model_name} returned invalid JSON. Trying next. Error: {e}")
            except Exception as e:
                print(f"Nutrition extraction failed for {model_name}: {e}")

    if not parsed_data:
        print("All nutrition extraction models failed.")
        return default_metrics

    return {
        "iron":     safe_float(parsed_data.get("iron",    0.0)),
        "folate":   safe_float(parsed_data.get("folate",  0.0)),
        "calcium":  safe_float(parsed_data.get("calcium", 0.0)),
        "protein":  safe_float(parsed_data.get("protein", 0.0)),
    }