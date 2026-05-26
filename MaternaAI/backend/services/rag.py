import psycopg2
from pgvector.psycopg2 import register_vector
import openai
import cohere
from config import DATABASE_URL, OPENROUTER_API_KEY, COHERE_API_KEY

or_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)
co = cohere.Client(api_key=COHERE_API_KEY)

def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    return conn

def embed_text(text: str) -> list:
    response = co.embed(
        texts=[text],
        model="embed-multilingual-v3.0",
        input_type="search_query",
        embedding_types=["float"]
    )
    embedding = response.embeddings.float[0]
    print("EMBED DIM:", len(embedding))
    return embedding

def retrieve_context(query: str, category: str = None, top_k: int = 4) -> list:
    query_embedding = embed_text(query)
    conn = get_db()
    cur = conn.cursor()

    if category:
        cur.execute("""
            SELECT content, source, category,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM knowledge_chunks
            WHERE category = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, category, query_embedding, top_k))
    else:
        cur.execute("""
            SELECT content, source, category,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM knowledge_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, query_embedding, top_k))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"content": row[0], "source": row[1], "category": row[2], "similarity": row[3]}
        for row in rows
    ]

def format_context(chunks: list) -> str:
    if not chunks:
        return "No specific medical context found."
    return "\n\n".join([
        f"[Source: {c['source']}]\n{c['content']}"
        for c in chunks
    ])

def rag_query(user_input: str, user_profile: dict, mode: str = "danger", detected_lang: str = "bn") -> str:
    try:
        chunks = retrieve_context(user_input, category=mode if mode != "general" else None)
        context = format_context(chunks)
        prompt = build_prompt(user_input, user_profile, context, mode, detected_lang)

        response = None
        last_err = None
        for model in ["openrouter/free", "meta-llama/llama-3.1-8b-instruct:free", "qwen/qwen-2.5-72b-instruct:free"]:
            try:
                response = or_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )
                break
            except Exception as model_err:
                print(f"Model {model} failed on OpenRouter: {str(model_err)}")
                last_err = model_err
        
        if not response:
            raise last_err

        return response.choices[0].message.content
    except Exception as e:
        print(f"RAG OpenRouter API failed (applying fallback): {str(e)}")
        
        # Resilience fallbacks — match user's language
        lower_input = user_input.lower()
        import re as _re
        greeting_pattern = _re.compile(
            r'\b(hello|hi|hey)\b|হ্যালো|সালাম|আসসালামুয়ালাইকুম|ভালো আছেন',
            _re.IGNORECASE
        )

        if detected_lang == 'en':
            if greeting_pattern.search(lower_input):
                return "I'm MaternaAI, your caring maternal health companion. I'm here for you every step of the way — how are you feeling today?"
            if mode == "danger":
                return "I hear you, and I care about your wellbeing. Please rest, stay hydrated, and if your discomfort increases, reach out to a healthcare provider soon."
            elif mode == "ppd":
                return "Your feelings are completely valid. Take a gentle moment for yourself, talk to someone you trust, and remember — you are never alone in this."
            elif mode == "nutrition":
                return "Nourishing yourself with wholesome local foods, plenty of water, and enough rest is so important right now. How has your appetite been lately?"
            else:
                return "Thank you for reaching out. I'm here to support you with any maternal health questions — what would you like to talk about?"
        else:
            if greeting_pattern.search(lower_input):
                return "আমি ম্যাটারনা এআই, আপনার যত্নশীল স্বাস্থ্য সহায়িকা। আপনার প্রতিটি পদক্ষেপে আমি আপনার পাশে আছি। আজ কেমন অনুভব করছেন?"
            if mode == "danger":
                return "আমি আপনার কথা শুনছি এবং আপনার সুস্থতার জন্য চিন্তিত। একটু বিশ্রাম নিন, পানি পান করুন — আর যদি অস্বস্তি বাড়ে, তাহলে দ্রুত একজন ডাক্তারের সাথে কথা বলুন।"
            elif mode == "ppd":
                return "আপনার অনুভূতিগুলো একদম স্বাভাবিক এবং গুরুত্বপূর্ণ। নিজের জন্য একটু সময় নিন, কাছের কাউকে মনের কথা বলুন — মনে রাখবেন, আপনি একা নন।"
            elif mode == "nutrition":
                return "পুষ্টিকর দেশীয় খাবার, পর্যাপ্ত পানি আর ভালো বিশ্রাম এখন আপনার জন্য সবচেয়ে জরুরি। আজকে আপনার খাওয়ার রুচি কেমন ছিল?"
            else:
                return "আপনার বার্তার জন্য আন্তরিক ধন্যবাদ। মাতৃস্বাস্থ্য বিষয়ে যেকোনো প্রশ্নে আমি সাহায্য করতে এখানে আছি — আপনি কী জানতে চান?"

def build_prompt(user_input: str, user_profile: dict, context: str, mode: str, detected_lang: str = "bn") -> str:
    if detected_lang == 'en':
        lang_rule = """ABSOLUTE LANGUAGE RULE: You MUST respond ENTIRELY in warm, simple English.
Every single word must be in English. Do NOT use any Bangla script, Arabic, or any other language.
If you write even one word in another language, you have failed."""
    else:
        lang_rule = """ABSOLUTE LANGUAGE RULE: আপনাকে সম্পূর্ণ প্রাকৃতিক, সহজ বাংলায় উত্তর দিতে হবে।
প্রতিটি শব্দ অবশ্যই বাংলায় হতে হবে। কোনো ইংরেজি, আরবি বা অন্য ভাষা ব্যবহার করবেন না।
আপনি যদি অন্য ভাষায় একটি শব্দও লেখেন, তাহলে আপনি ব্যর্থ হয়েছেন।"""

    base_system = f"""You are MaternaAI, a compassionate maternal health companion for women in Bangladesh.
You speak in a warm, loving, and supportive tone, like a caring elder sister (Apu) or a gentle community midwife.

{lang_rule}

OTHER CRITICAL INSTRUCTIONS:
1. LENGTH: Be extremely brief — 2 to 3 warm sentences only. No bullet points or long paragraphs.
2. CONVERSATIONAL FLOW:
   - Acknowledge their situation with deep empathy first.
   - Suggest one simple, comforting step or local remedy.
   - End with exactly ONE warm, open-ended follow-up question.
3. CLINICAL SAFETY: Never diagnose. If danger signs are mentioned, gently encourage seeing a doctor.

User Profile:
- Name: {user_profile.get('name', 'Unknown')}
- Weeks pregnant: {user_profile.get('weeks_pregnant', 'Unknown')}
- Is postpartum: {user_profile.get('is_postpartum', False)}
- Location: {user_profile.get('location', 'Bangladesh')}

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

    return f"{base_system}\n\nTask: {task}\n\nUser says: {user_input}"