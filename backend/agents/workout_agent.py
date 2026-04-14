import json
import re
from typing import Any

from .model_manager import manager
from .prompts import WORKOUT_SYSTEM_PROMPT
from .rag import retrieve

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,80}>|\{\{[^}\n]{1,80}\}\}|\[[A-Za-z_ ]{1,40}\]")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
LATIN_WORD_RE = re.compile(r"\b[A-Za-z]{3,}\b")
NUTRITION_LEAK_RE = re.compile(
    r"\b(?:calories?|kcal|protein|carb(?:s)?|fat(?:s)?|macro(?:s)?|meal(?:s)?|diet|nutrition|breakfast|lunch|dinner|snack|hydration|water)\b|"
    r"(?:热量|卡路里|蛋白|碳水|脂肪|饮食|营养|早餐|午餐|晚餐|加餐|零食|补水|喝水)",
    re.I,
)
EN_SECTION_RE = re.compile(
    r"\b(?:Goal and assumptions|Training plan|Progression rule|Safety and recovery|"
    r"Target calories and protein|Meal plan|Weekly adjustment rule|Snack guardrails)\b",
    re.I,
)


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def _latin_word_count(text: str) -> int:
    return len(LATIN_WORD_RE.findall(text or ""))


def _is_cjk_user_message(text: str) -> bool:
    return _contains_cjk(text)


def _looks_like_markdown_table(text: str) -> bool:
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    if "|" not in lines[0]:
        return False
    return any(re.match(r"^\|?\s*:?-{3,}", line.replace("|", "").strip()) for line in lines[1:3])


def _needs_rewrite(user_message: str, text: str) -> bool:
    body = (text or "").strip()
    if not body:
        return True
    if PLACEHOLDER_RE.search(body):
        return True
    if len(body) < 60:
        return True
    if _looks_like_markdown_table(body):
        return True
    if NUTRITION_LEAK_RE.search(body):
        return True
    if _is_cjk_user_message(user_message):
        if EN_SECTION_RE.search(body):
            return True
        english_words = re.findall(r"[A-Za-z]{3,}", body)
        if len(english_words) >= 4:
            return True
    elif _contains_cjk(body):
        return True
    return False


def _fallback_clean(text: str) -> str:
    return PLACEHOLDER_RE.sub("（请补充具体信息）", text or "")


def _strip_nutrition_leak(text: str) -> str:
    kept_lines = []
    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if line and NUTRITION_LEAK_RE.search(line):
            continue
        kept_lines.append(raw_line)
    return "\n".join(kept_lines)


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    is_cjk = _is_cjk_user_message(user_message)
    target_language = "Chinese" if is_cjk else "English"

    if is_cjk:
        section_instruction = (
            "必须使用以下四个中文小节标题，且完全按此标题输出：\n"
            "1) 目标与前提\n"
            "2) 训练安排\n"
            "3) 进阶规则\n"
            "4) 恢复与注意事项\n"
        )
    else:
        section_instruction = (
            "Use these exact section titles:\n"
            "1) Goal and assumptions\n"
            "2) Training plan\n"
            "3) Progression rule\n"
            "4) Safety and recovery\n"
        )

    rewrite_user = (
        "Rewrite the draft answer so it is directly usable.\n"
        "Rules:\n"
        f"- Output only in {target_language}.\n"
        "- Answer ONLY the workout and exercise part of the request.\n"
        "- Do NOT include calories, protein targets, meal plans, food examples, or dietary suggestions.\n"
        "- Give exactly ONE best-fit plan unless the user explicitly asked for alternatives.\n"
        "- Use the user details already provided instead of replacing them with generic advice.\n"
        "- If information is missing, make only ONE conservative assumption and state it briefly.\n"
        f"- {section_instruction}\n"
        "- In the training plan, include specific sets, reps, and rest when relevant.\n"
        "- Use normal prose unless the user explicitly asked for a table. If they did, use a clean GitHub-flavored Markdown table.\n"
        "- Do not mix languages in the same answer.\n"
        "- Do NOT output placeholders such as <...>, [X], {{...}}, TBD, N/A, null.\n"
        "- Do NOT output JSON.\n"
        "- Keep advice concrete and actionable.\n"
        "- Ask at most ONE concise follow-up question only if critical info is missing and the answer would otherwise be unsafe or unusable.\n\n"
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
    out = _strip_nutrition_leak(_fallback_clean(out)).strip()
    return out, evidence
