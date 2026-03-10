import json
import re
from typing import Any

from .model_manager import manager
from .prompts import WORKOUT_SYSTEM_PROMPT
from .rag import retrieve

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,80}>|\{\{[^}\n]{1,80}\}\}|\[[A-Za-z_ ]{1,40}\]")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
LATIN_WORD_RE = re.compile(r"\b[A-Za-z]{3,}\b")


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def _latin_word_count(text: str) -> int:
    return len(LATIN_WORD_RE.findall(text or ""))


def _is_cjk_user_message(text: str) -> bool:
    return _contains_cjk(text)


def _needs_rewrite(user_message: str, answer: str) -> bool:
    text = (answer or "").strip()
    if not text:
        return True
    if PLACEHOLDER_RE.search(text):
        return True
    if _is_cjk_user_message(user_message) and not _contains_cjk(text):
        return True
    if _is_cjk_user_message(user_message) and _latin_word_count(text) >= 6:
        return True
    if not _is_cjk_user_message(user_message) and _contains_cjk(text):
        return True
    return False


def _fallback_clean(text: str) -> str:
    return PLACEHOLDER_RE.sub("（请补充具体信息）", text or "")


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    target_language = "Chinese" if _is_cjk_user_message(user_message) else "English"
    rewrite_user = (
        "Rewrite the draft answer so it is directly usable.\n"
        "Rules:\n"
        f"- Output only in {target_language}.\n"
        "- Do not mix languages in the same answer.\n"
        "- Do NOT output placeholders such as <...>, [X], {{...}}, TBD, N/A, null.\n"
        "- Do NOT output JSON.\n"
        "- Keep advice concrete and actionable.\n"
        "- Ask at most ONE concise follow-up question only if critical info is missing.\n\n"
        f"Original user question:\n{user_message}\n\n"
        f"Draft answer:\n{draft_answer}"
    )
    rewrite_msgs = [
        {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
        {"role": "user", "content": rewrite_user},
    ]
    return manager.generate(rewrite_msgs, adapter="workout")


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
    if _needs_rewrite(message, out):
        rewritten = _rewrite_answer(message, out).strip()
        if rewritten:
            out = rewritten
    out = _fallback_clean(out).strip()
    return out, evidence
