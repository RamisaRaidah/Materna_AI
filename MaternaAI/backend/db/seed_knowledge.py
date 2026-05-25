"""
Run this once to populate your RAG knowledge base.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from pgvector.psycopg2 import register_vector
import cohere
from config import DATABASE_URL, COHERE_API_KEY

co = cohere.Client(COHERE_API_KEY)

KNOWLEDGE_CHUNKS = [
    {
        "source": "WHO Maternal Health Guidelines",
        "category": "danger",
        "content": """Danger signs during pregnancy that require immediate medical attention:
1. Severe headache that does not go away, especially with visual disturbances or swelling.
2. Blurred vision or seeing spots, which may indicate preeclampsia.
3. Severe swelling of face, hands, or feet - sudden swelling is a warning sign.
4. Vaginal bleeding at any point during pregnancy.
5. Severe abdominal pain or cramping.
6. Baby not moving or reduced fetal movement after 28 weeks.
7. High fever above 38°C with chills.
8. Difficulty breathing or chest pain.
9. Fainting or loss of consciousness.
If any of these occur, the mother should go to a hospital or emergency facility immediately."""
    },
    {
        "source": "WHO Preeclampsia Guidelines",
        "category": "danger",
        "content": """Preeclampsia is a serious pregnancy complication characterized by high blood pressure 
and signs of damage to organs, most often the liver and kidneys. It usually begins after 20 weeks of pregnancy.
Symptoms include: protein in urine, severe headaches, changes in vision including blurriness, 
upper belly pain usually under the ribs on the right side, nausea or vomiting, decreased urine output,
decreased platelet levels in blood, impaired liver function, shortness of breath caused by fluid in the lungs.
Preeclampsia can be fatal if untreated. In Bangladesh it is one of the leading causes of maternal death.
Immediate hospitalization is required if preeclampsia is suspected."""
    },
    {
        "source": "WHO Nutrition During Pregnancy",
        "category": "nutrition",
        "content": """Key nutritional needs during pregnancy:
Iron: Pregnant women need 27mg of iron daily to prevent anemia. Good sources available in Bangladesh include
red meat, fish, lentils (dal), spinach, and fortified rice. Iron absorption increases when taken with vitamin C.
Folate/Folic Acid: 400-600 mcg daily, especially in first trimester, prevents neural tube defects.
Sources: green leafy vegetables, lentils, eggs, and fortified foods.
Calcium: 1000mg daily for bone development. Sources: milk, yogurt, small fish eaten with bones, dark green vegetables.
Protein: 70-100g daily for fetal growth. Sources: fish, eggs, lentils, chicken, dairy.
Avoid: raw fish, undercooked meat, excessive caffeine, alcohol."""
    },
    {
        "source": "UNICEF Bangladesh Nutrition Guidelines",
        "category": "nutrition",
        "content": """Nutrition recommendations for pregnant women in Bangladesh:
Common deficiencies in Bangladeshi pregnant women include iron, iodine, vitamin A, and zinc.
Recommended local foods: rice, lentils (masoor/moong dal), hilsa fish, eggs, green leafy vegetables 
like spinach and amaranth (shaak), pumpkin, sweet potato, jackfruit seeds, and seasonal fruits.
Iron deficiency anemia affects over 40% of pregnant women in Bangladesh.
Symptoms of anemia: fatigue, weakness, pale skin, shortness of breath.
Daily iron and folic acid supplements are recommended for all pregnant women in Bangladesh.
Iodized salt should be used for cooking to prevent iodine deficiency."""
    },
    {
        "source": "Postpartum Depression Clinical Guidelines",
        "category": "ppd",
        "content": """Postpartum depression (PPD) is a serious mental health condition that affects mothers 
after childbirth. It is NOT a sign of weakness or bad motherhood. It is a medical condition caused by 
hormonal changes, sleep deprivation, and emotional adjustment after birth.
Symptoms include: persistent sadness or emptiness, loss of interest in activities, difficulty bonding 
with the baby, withdrawal from family and friends, changes in appetite or sleep, intense irritability,
fear of not being a good mother, thoughts of harming oneself or the baby.
In Bangladesh, PPD is often misunderstood or dismissed. Cultural stigma prevents many women from seeking help.
PPD is treatable with counseling, support, and in some cases medication.
Risk factors: history of depression, lack of social support, difficult birth experience, financial stress."""
    },
    {
        "source": "Edinburgh Postnatal Depression Scale Guidelines",
        "category": "ppd",
        "content": """The Edinburgh Postnatal Depression Scale (EPDS) is a 10-question screening tool for PPD.
Scoring: 0-9 indicates low risk, 10-12 indicates possible depression, 13 or above indicates probable depression.
Question topics cover: ability to laugh, looking forward to things, blaming yourself, anxiety, fear, 
things getting on top of you, difficulty sleeping, feeling sad, crying, thoughts of self-harm.
The scale should be used as a starting point for conversation, not a definitive diagnosis.
Women scoring 10 or above should be referred to a healthcare professional for proper assessment."""
    },
    {
        "source": "WHO Antenatal Care Recommendations",
        "category": "general",
        "content": """WHO recommends at least 8 antenatal care visits during pregnancy:
- First visit: before 12 weeks (first trimester)
- Second visit: 20 weeks
- Third visit: 26 weeks
- Fourth visit: 30 weeks
- Fifth visit: 34 weeks
- Sixth visit: 36 weeks
- Seventh visit: 38 weeks
- Eighth visit: 40 weeks
Each visit should include blood pressure check, weight measurement, urine test, blood tests,
fetal heartbeat check, and counseling on nutrition, danger signs, and birth preparation.
In Bangladesh, many rural women have fewer visits due to access barriers."""
    },
]

def embed_text(text: str) -> list:
    response = co.embed(
        texts=[text],
        model="embed-english-v3.0",
        input_type="search_document"
    )
    return response.embeddings[0]

def seed_knowledge_base():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()

    print(f"Seeding {len(KNOWLEDGE_CHUNKS)} knowledge chunks...")

    for i, chunk in enumerate(KNOWLEDGE_CHUNKS):
        print(f"  Embedding chunk {i+1}/{len(KNOWLEDGE_CHUNKS)}: {chunk['source'][:50]}...")
        embedding = embed_text(chunk["content"])

        cur.execute("""
            INSERT INTO knowledge_chunks (source, category, content, embedding)
            VALUES (%s, %s, %s, %s)
        """, (chunk["source"], chunk["category"], chunk["content"], embedding))

    conn.commit()
    cur.close()
    conn.close()
    print("Done! Knowledge base seeded successfully.")

if __name__ == "__main__":
    seed_knowledge_base()