import psycopg2
from pgvector.psycopg2 import register_vector
import openai
import cohere
import google.generativeai as genai
from config import DATABASE_URL, OPENROUTER_API_KEY, COHERE_API_KEY, GEMINI_API_KEY
import json

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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

def get_recent_history(user_id: int, limit: int = 6) -> list:
    if not user_id:
        return []
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT role, content
            FROM chat_messages
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT %s
        """, (user_id, limit))
        rows = cur.fetchall()
        cur.close()
        # The query returns in reverse order (newest first). Reverse it to chronological.
        rows.reverse()
        return [{"role": r[0], "content": r[1]} for r in rows]
    except Exception as e:
        print("Error fetching history for RAG:", e)
        return []
    finally:
        if conn:
            conn.close()

def build_system_prompt(user_profile: dict, context: str, mode: str, detected_lang: str = "bn") -> str:
    if detected_lang == 'en':
        lang_rule = """ABSOLUTE LANGUAGE RULE: You MUST respond ENTIRELY in warm, simple English.
Every single word must be in English. Do NOT use any Bangla script, Arabic, or any other language.
If you write even one word in another language, you have failed."""
    else:
        lang_rule = """ABSOLUTE LANGUAGE RULE:
1. You MUST respond ENTIRELY in warm, natural, and standard native Bengali (বাংলা).
2. Use standard Bengali script (Unicode).
3. Do NOT mix different languages. Specifically, do NOT use Hindi words, Hindi grammar, or mixed gibberish (e.g. avoid words like "kaise", "muhe", "bahar", "dori").
4. Every single word of your response must be in fluent Bengali, using local and supportive phrasing like a caring elder sister (Apu) or gentle midwife."""

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

    return f"{base_system}\n\nTask: {task}"

def extract_nutrition_metrics(user_input: str, assistant_response: str) -> dict:
    """
    Utility function that analyzes the meal log text and estimates raw nutrient values.
    Returns a standard python dictionary dynamically.
    """
    default_metrics = {"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}
    
    # Precise engineering to force the model to calculate values dynamically
    extraction_prompt = f"""
    You are a strict data extraction engine. Your job is to convert food logs into structured nutritional data.
    
    User Input: {user_input}
    Context/Advisor Response: {assistant_response}
    
    Instructions:
    1. Identify all food items mentioned in the User Input.
    2. If the user DID NOT specify a quantity or portion size (e.g., they just said "yoghurt", "egg", or "দুধ"), assume a standard single serving size typical for a Bangladeshi home meal (e.g., 1 bowl/cup of yoghurt = 150g, 1 medium egg, 1 glass of milk = 250ml).
    3. Calculate or estimate the total cumulative metrics for the following items based on standard nutritional profiles:
       - iron (mg)
       - folate (mcg)
       - calcium (mg)
       - protein (g)
    4. Ensure all values are numeric floats or integers. Do not add strings or unit symbols (like 'mg' or 'g') inside the values.
    
    CRITICAL: Return your response STRICTLY as a raw JSON object matching the schema below. Do not wrap it in markdown block quotes or backticks. No explanation, no conversational filler.
    {{"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}}
    """
    
    try:
        if GEMINI_API_KEY:
            model = genai.GenerativeModel("gemini-1.5-flash")
            extraction_res = model.generate_content(
                extraction_prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                }
            ).text
            raw_text = extraction_res
        else:
            response = or_client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": extraction_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_text = response.choices[0].message.content

        if not raw_text:
            return default_metrics
            
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            # Splits off backticks if an LLM wrapper slips past the response_format
            lines = raw_text.splitlines()
            cleaned_lines = [line for line in lines if not line.strip().startswith("```")]
            raw_text = "".join(cleaned_lines)

        parsed_data = json.loads(raw_text.strip())
        
        # Ensure values are safely cast to floats and fall back to 0.0 if missing
        return {
            "iron": float(parsed_data.get("iron", 0.0)),
            "folate": float(parsed_data.get("folate", 0.0)),
            "calcium": float(parsed_data.get("calcium", 0.0)),
            "protein": float(parsed_data.get("protein", 0.0))
        }
            
    except Exception as e:
        print("Dynamic nutrition extraction parser encountered an error:", e)
        return default_metrics

def rag_query(user_input: str, user_profile: dict, mode: str = "danger", detected_lang: str = "bn", user_id: int = 1) -> str:
    try:
        chunks = retrieve_context(user_input, category=mode if mode != "general" else None)
        context = format_context(chunks)
        
        system_content = build_system_prompt(user_profile, context, mode, detected_lang)
        
        # Build standard messages list incorporating chat history context
        messages = [{"role": "system", "content": system_content}]
        
        history = get_recent_history(user_id, limit=6)
        
        # Append history messages, omitting duplication of the current input
        for msg in history:
            role = "user" if msg["role"] == "user" else "assistant"
            content = msg["content"]
            
            # If the current user message is already stored in the DB (which it is, since we save before querying),
            # skip it from the middle of the loop so we can explicitly handle it at the end.
            if role == "user" and content == user_input:
                continue
                
            messages.append({"role": role, "content": content})
            
        # Ensure the current user message is at the end of the history
        messages.append({"role": "user", "content": user_input})

        # -------------------------------------------------------------
        # 1. Direct Google Gemini API (Primary high-priority method)
        # -------------------------------------------------------------
        if GEMINI_API_KEY:
            try:
                # Map standard message format to genai content format
                # contents expects: [{"role": "user"|"model", "parts": [str]}]
                gemini_contents = []
                for msg in messages:
                    if msg["role"] == "system":
                        continue
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_contents.append({"role": role, "parts": [msg["content"]]})
                
                genai_model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_content
                )
                response_text = genai_model.generate_content(
                    gemini_contents,
                    generation_config={"max_output_tokens": 500}
                ).text
                
                if response_text:
                    print("Direct Gemini API call succeeded!")
                    return response_text
            except Exception as gemini_err:
                print(f"Direct Gemini API failed (trying OpenRouter fallback): {str(gemini_err)}")

        # -------------------------------------------------------------
        # 2. OpenRouter API Fallback
        # -------------------------------------------------------------
        response = None
        last_err = None
        
        # Cleaned up model queue with valid OpenRouter model IDs and a free active fallback
        model_queue = [
            "google/gemini-2.5-flash",
            "qwen/qwen-2.5-72b-instruct",
            "meta-llama/llama-3.3-70b-instruct",
            "meta-llama/llama-3.1-8b-instruct:free"
        ]
        
        for model in model_queue:
            try:
                response = or_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=500  # Strictly limit worst-case output to fit free accounts/credits
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