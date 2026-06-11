"""
Add a new PDF to the knowledge base without touching existing chunks.
Usage: python scripts/ingest_pdf.py <path.pdf> --source "WHO ANC 2024" --category danger
"""
import sys, os, argparse, time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymupdf4llm
from chonkie import SDPMChunker
import psycopg2
from pgvector.psycopg2 import register_vector
import cohere
from config import DATABASE_URL, COHERE_API_KEY

co = cohere.Client(COHERE_API_KEY)
VALID_CATEGORIES = {"danger", "nutrition", "ppd", "general", "antenatal", "postpartum"}

def extract_and_chunk(pdf_path: str) -> list[str]:
    # Converts PDF to clean markdown (preserves headers, lists, tables)
    md_text = pymupdf4llm.to_markdown(pdf_path)
    
    # Semantic chunking — splits where meaning shifts, not at arbitrary char counts
    chunker = SDPMChunker(
        embedding_model="minishlab/potion-base-8M",
        chunk_size=400,
        threshold=0.5
    )
    chunks = chunker.chunk(md_text)
    return [c.text for c in chunks if len(c.text.split()) > 20]

def ingest(pdf_path: str, source: str, category: str, dry_run: bool = False):
    print(f"Extracting: {pdf_path}")
    chunks = extract_and_chunk(pdf_path)
    print(f"Got {len(chunks)} chunks")

    if dry_run:
        for i, c in enumerate(chunks[:3]):
            print(f"\n--- Chunk {i+1} ---\n{c[:300]}...")
        print(f"\n[Dry run] Would insert {len(chunks)} chunks.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()

    # Prevent re-ingesting the same source twice
    cur.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE source = %s", (source,))
    if cur.fetchone()[0] > 0:
        print(f"Source '{source}' already exists in DB. Use --force to overwrite.")
        if not args.force:
            cur.close(); conn.close(); return
        cur.execute("DELETE FROM knowledge_chunks WHERE source = %s", (source,))
        conn.commit()
        print("Deleted old chunks, re-ingesting...")

    batch_size = 20
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        print(f"Embedding batch {i//batch_size + 1}...")

        retries = 5
        while retries > 0:
            try:
                response = co.embed(
                    texts=batch,
                    model="embed-multilingual-v3.0",
                    input_type="search_document",
                    embedding_types=["float"]
                )
                embeddings = response.embeddings.float
                break
            except Exception as e:
                retries -= 1
                print(f"Cohere error: {e}. Retries left: {retries}")
                if retries == 0: raise
                time.sleep(15)

        for text, embedding in zip(batch, embeddings):
            cur.execute("""
                INSERT INTO knowledge_chunks (source, category, content, embedding)
                VALUES (%s, %s, %s, %s)
            """, (source, category, text, embedding))

        conn.commit()
        if i + batch_size < len(chunks):
            time.sleep(2)

    cur.close()
    conn.close()
    print(f"Done. Inserted {len(chunks)} chunks from '{source}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("--source", required=True)
    parser.add_argument("--category", required=True, choices=list(VALID_CATEGORIES))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="Overwrite if source already exists")
    args = parser.parse_args()
    ingest(args.pdf_path, args.source, args.category, dry_run=args.dry_run)



"""
Preview first — always do this
python scripts/ingest_pdf.py docs/dghs_guidelines.pdf \
  --source "DGHS Nutrition 2024" --category nutrition --dry-run

Actually insert
python scripts/ingest_pdf.py docs/dghs_guidelines.pdf \
  --source "DGHS Nutrition 2024" --category nutrition

Re-ingest if you updated the PDF
python scripts/ingest_pdf.py docs/dghs_guidelines.pdf \
  --source "DGHS Nutrition 2024" --category nutrition --force

"""