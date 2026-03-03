import json
from typing import Any

from .model_manager import manager
from .prompts import WORKOUT_SYSTEM_PROMPT
from .rag import retrieve


def _normalize_external_evidence(external_evidence: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for item in external_evidence or []:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "title": str(item.get("title") or "External source"),
                "source_type": str(item.get("source_type") or item.get("sourceType") or "external"),
                "source_uri": str(item.get("source_uri") or item.get("sourceUri") or ""),
                "similarity": float(item.get("similarity") or 0.0),
                "chunk_text": str(item.get("chunk_text") or item.get("chunkText") or "")[:700],
            }
        )
    return normalized


def _build_user_block(message: str, user_profile: dict[str, Any] | None, evidence: list[dict[str, Any]]) -> str:
    chunks = []
    if user_profile:
        chunks.append(f"User profile (JSON): {json.dumps(user_profile, ensure_ascii=False)}")
    chunks.append(message)

    if evidence:
        ev_blocks = []
        for idx, item in enumerate(evidence, 1):
            ev_blocks.append(
                f"[Evidence {idx}] {item['title']} ({item['source_type']}, sim={item['similarity']:.2f})\n"
                f"{item['chunk_text']}"
            )
        chunks.append("EVIDENCE (reference only, do not copy verbatim):\n" + "\n\n".join(ev_blocks))
    return "\n\n".join(chunks)


def answer(
    message: str,
    user_profile: dict[str, Any] | None = None,
    use_rag: bool = False,
    external_evidence: list[dict[str, Any]] | None = None,
):
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                message,
                topk=4,
                min_sim=0.72,
                source_types=["exercise", "strength", "workout", "free_exercise_db"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))
    user_block = _build_user_block(message, user_profile, evidence)

    msgs = [
        {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    out = manager.generate(msgs, adapter="workout")
    return out, evidence
