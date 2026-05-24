import psycopg2
from pgvector.psycopg2 import register_vector
from google import genai
from config import DATABASE_URL, GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    return conn

def embed_text(text: str) -> list:
    from google.genai import types
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    return result.embeddings[0].values

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

def rag_query(user_input: str, user_profile: dict, mode: str = "danger") -> str:
    chunks = retrieve_context(user_input, category=mode if mode != "general" else None)
    context = format_context(chunks)
    prompt = build_prompt(user_input, user_profile, context, mode)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text

def build_prompt(user_input: str, user_profile: dict, context: str, mode: str) -> str:
    base_system = f"""You are MaternaAI, a compassionate maternal health assistant 
for women in Bangladesh. You respond in simple, warm language.
Always respond in the same language the user writes in (Bangla or English).
Never give a definitive medical diagnosis. Always recommend consulting a doctor for serious concerns.

User Profile:
- Name: {user_profile.get('name', 'Unknown')}
- Weeks pregnant: {user_profile.get('weeks_pregnant', 'Unknown')}
- Is postpartum: {user_profile.get('is_postpartum', False)}
- Location: {user_profile.get('location', 'Bangladesh')}

Relevant Medical Knowledge:
{context}
"""

    if mode == "danger":
        task = """Analyze the user's reported symptoms carefully.
1. Identify any danger signs based on the medical knowledge provided.
2. Rate danger level: SAFE / WARNING / DANGER
3. Explain what the symptoms might indicate in simple terms.
4. Give clear next steps (rest at home / see doctor soon / go to emergency NOW).
5. Also gently check if there are any signs of emotional distress or domestic abuse.
Respond warmly and clearly."""

    elif mode == "ppd":
        task = """The user may be experiencing postpartum depression.
1. Acknowledge their feelings with empathy first.
2. Based on what they shared, assess PPD risk: LOW / MODERATE / HIGH.
3. Provide 3-4 practical coping suggestions.
4. Encourage them to seek professional help if risk is moderate or high.
5. Remind them they are not alone and this is a medical condition, not a weakness."""

    elif mode == "nutrition":
        task = """Create a personalized daily nutrition plan.
1. Consider their trimester and any conditions mentioned.
2. Suggest 3 meals and 2 snacks with locally available Bangladeshi foods.
3. Highlight key nutrients needed (iron, folate, calcium, protein).
4. Keep suggestions affordable and realistic for Bangladesh."""

    else:
        task = "Answer the user's question using the medical knowledge provided. Be warm, clear, and concise."

    return f"{base_system}\n\nTask: {task}\n\nUser says: {user_input}"