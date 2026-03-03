import logging
import os
from contextlib import closing

import numpy as np
import psycopg2
from sentence_transformers import SentenceTransformer

EMBED_MODEL = "BAAI/bge-base-en-v1.5"
_embedder = None
logger = logging.getLogger(__name__)


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBED_MODEL)
    return _embedder


def _vec_to_text(vec: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vec.tolist()) + "]"


def retrieve(query: str, topk: int = 4, min_sim: float = 0.72, source_types: list[str] | None = None):
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        return []

    try:
        emb = _get_embedder().encode([query], normalize_embeddings=True)[0].astype(np.float32)
    except Exception as exc:
        logger.warning("RAG embedding failed: %s", exc)
        return []

    emb_txt = _vec_to_text(emb)
    sql = """
    select chunk_id, document_id, title, source_type, source_uri, chunk_text, similarity
    from public.match_rag_chunks(%s::vector, %s, %s, '{}'::jsonb);
    """

    rows = []
    try:
        with closing(psycopg2.connect(db_url, connect_timeout=20, sslmode="require")) as conn:
            conn.set_session(autocommit=True)
            with conn.cursor() as cur:
                cur.execute(sql, (emb_txt, max(8, topk * 3), min_sim))
                rows = cur.fetchall()
    except Exception as exc:
        logger.warning("RAG query failed: %s", exc)
        return []

    allowed_types = set(source_types or [])
    items = []
    for (chunk_id, doc_id, title, stype, uri, text, sim) in rows:
        if allowed_types and stype not in allowed_types:
            continue
        items.append(
            {
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "title": title,
                "source_type": stype,
                "source_uri": uri,
                "similarity": float(sim),
                "chunk_text": (text or "")[:700],
            }
        )
        if len(items) >= topk:
            break
    return items
