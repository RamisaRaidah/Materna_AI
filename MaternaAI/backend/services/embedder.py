"""
embedder.py — Materna AI
------------------------
সব embedding-related কাজ এখানে।
rag.py এবং seed_knowledge.py দুটোই এই file থেকে function নেবে।
"""

import cohere
from config import COHERE_API_KEY

# Cohere client initialize
co = cohere.Client(api_key=COHERE_API_KEY)

# Model info:
# - embed-multilingual-v3.0 → Bangla + English দুটোই বোঝে (RAG query এর জন্য)
# - embed-english-v3.0      → শুধু English (seed/document এর জন্য faster)
# Output dimension: 1024 (schema.sql এর vector(1024) এর সাথে match করে)

EMBED_MODEL_QUERY    = "embed-multilingual-v3.0"   # user query embed করতে
EMBED_MODEL_DOCUMENT = "embed-multilingual-v3.0"   # knowledge chunk embed করতে
EMBED_DIM            = 1024


def embed_query(text: str) -> list[float]:
    """
    User এর প্রশ্ন / input embed করার জন্য।
    input_type='search_query' — similarity search এর জন্য optimize।

    Args:
        text: User এর message (Bangla বা English)

    Returns:
        1024-dimensional float list
    """
    if not text or not text.strip():
        raise ValueError("embed_query: text খালি হতে পারবে না।")

    response = co.embed(
        texts=[text.strip()],
        model=EMBED_MODEL_QUERY,
        input_type="search_query",
        embedding_types=["float"]
    )

    embedding = response.embeddings.float[0]
    print(f"[embedder] query embedded → dim: {len(embedding)}")
    return embedding


def embed_document(text: str) -> list[float]:
    """
    Knowledge chunk / document embed করার জন্য।
    input_type='search_document' — database এ store করার জন্য optimize।

    Args:
        text: Medical knowledge chunk (WHO guidelines, etc.)

    Returns:
        1024-dimensional float list
    """
    if not text or not text.strip():
        raise ValueError("embed_document: text খালি হতে পারবে না।")

    response = co.embed(
        texts=[text.strip()],
        model=EMBED_MODEL_DOCUMENT,
        input_type="search_document",
        embedding_types=["float"]
    )

    embedding = response.embeddings.float[0]
    print(f"[embedder] document embedded → dim: {len(embedding)}")
    return embedding


def embed_documents_batch(texts: list[str], batch_size: int = 96) -> list[list[float]]:
    """
    অনেকগুলো chunk একসাথে embed করার জন্য (seed_knowledge.py তে use হবে)।
    Cohere এর rate limit এড়াতে batch এ পাঠায়।

    Args:
        texts:      Chunk এর list
        batch_size: একবারে কতটা পাঠাবে (Cohere max 96)

    Returns:
        Embedding এর list (texts এর সাথে same order)
    """
    if not texts:
        return []

    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = [t.strip() for t in texts[i: i + batch_size] if t.strip()]
        if not batch:
            continue

        print(f"[embedder] batch {i // batch_size + 1} → {len(batch)} chunks embedding হচ্ছে...")

        response = co.embed(
            texts=batch,
            model=EMBED_MODEL_DOCUMENT,
            input_type="search_document",
            embedding_types=["float"]
        )

        all_embeddings.extend(response.embeddings.float)

    print(f"[embedder] মোট {len(all_embeddings)} টি embedding তৈরি হয়েছে।")
    return all_embeddings