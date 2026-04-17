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
DAY_COUNT_RE = re.compile(r"\b([3-6])[- ]day\b|([3-6])\s*天", re.I)
UPPER_LOWER_RE = re.compile(r"\bupper/?lower\b|(?:上肢下肢|上下肢)", re.I)
HYPERTROPHY_RE = re.compile(r"\bhypertrophy\b|(?:增肌|肌肥大)", re.I)


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def _latin_word_count(text: str) -> int:
    return len(LATIN_WORD_RE.findall(text or ""))


def _is_cjk_user_message(text: str) -> bool:
    return _contains_cjk(text)


def _original_user_message(text: str) -> str:
    source = str(text or "").strip()
    if not source:
        return ""
    head = source.split("\n\n", 1)[0].strip()
    return head or source


def _requested_training_days(text: str) -> int | None:
    match = DAY_COUNT_RE.search(text or "")
    if not match:
        return None
    for group in match.groups():
        if group:
            try:
                return int(group)
            except Exception:
                return None
    return None


def _looks_like_markdown_table(text: str) -> bool:
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    if "|" not in lines[0]:
        return False
    return any(re.match(r"^\|?\s*:?-{3,}", line.replace("|", "").strip()) for line in lines[1:3])


def _needs_rewrite(user_message: str, text: str) -> bool:
    original_message = _original_user_message(user_message)
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
    if _is_cjk_user_message(original_message):
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


def _fallback_training_plan(user_message: str, is_cjk: bool) -> str:
    original = _original_user_message(user_message)
    day_count = _requested_training_days(original) or 4
    upper_lower = bool(UPPER_LOWER_RE.search(original))
    hypertrophy = bool(HYPERTROPHY_RE.search(original))

    if day_count == 4 or upper_lower:
        if is_cjk:
            return "\n".join(
                [
                    f"- 第1天 上肢：卧推 4x6-8，划船 4x8-10，上斜哑铃卧推 3x8-10，下拉 3x10-12，侧平举 3x12-15。",
                    "- 第2天 下肢：深蹲 4x6-8，罗马尼亚硬拉 4x8-10，腿举 3x10-12，腿弯举 3x10-12，小腿提踵 3x12-15。",
                    "- 第3天 上肢：肩推 4x6-8，坐姿划船 4x8-10，双杠臂屈伸或俯卧撑 3x8-12，面拉 3x12-15，弯举 3x10-12。",
                    "- 第4天 下肢：硬拉 3x4-6，保加利亚分腿蹲 3x8-10，臀桥 3x8-10，腿屈伸 3x12-15，核心训练 3组。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Upper: bench press 4x6-8, row 4x8-10, incline dumbbell press 3x8-10, lat pulldown 3x10-12, lateral raise 3x12-15.",
                "- Day 2 Lower: squat 4x6-8, Romanian deadlift 4x8-10, leg press 3x10-12, leg curl 3x10-12, calf raise 3x12-15.",
                "- Day 3 Upper: overhead press 4x6-8, seated row 4x8-10, dips or push-ups 3x8-12, face pulls 3x12-15, curls 3x10-12.",
                "- Day 4 Lower: deadlift 3x4-6, Bulgarian split squat 3x8-10, hip thrust 3x8-10, leg extension 3x12-15, core work 3 rounds.",
            ]
        )

    if is_cjk:
        return (
            "- 训练日A：深蹲 4x6-8，卧推 4x6-8，划船 4x8-10，腿弯举 3x10-12，平板支撑 3组。\n"
            "- 训练日B：硬拉 3x4-6，肩推 4x6-8，下拉 4x8-10，箭步蹲 3x8-10，卷腹 3组。\n"
            "- 每周按 A-B-A / B-A-B 轮换。"
        )
    return (
        "- Day A: squat 4x6-8, bench press 4x6-8, row 4x8-10, leg curl 3x10-12, plank 3 rounds.\n"
        "- Day B: deadlift 3x4-6, overhead press 4x6-8, lat pulldown 4x8-10, lunges 3x8-10, crunches 3 rounds.\n"
        "- Alternate A-B-A and B-A-B across weeks."
    )


def _fallback_answer(user_message: str, user_profile: dict[str, Any] | None = None) -> str:
    original = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original)
    day_count = _requested_training_days(original) or 4
    goal = "增肌" if HYPERTROPHY_RE.search(original) else "提升力量与训练一致性"
    goal_en = "hypertrophy" if HYPERTROPHY_RE.search(original) else "strength and consistency"

    if is_cjk:
        return (
            "目标与前提\n"
            f"- 目标先按{goal}处理。\n"
            f"- 先给你一个最适合的 {day_count} 天训练安排；如有伤病或器械限制，再单独调整。\n\n"
            "训练安排\n"
            f"{_fallback_training_plan(original, True)}\n\n"
            "进阶规则\n"
            "- 当同一动作在所有工作组都达到次数上限且动作稳定时，下次加重 2.5-5%。\n\n"
            "恢复与注意事项\n"
            "- 每次训练前做 5-8 分钟热身；主动作保留 1-2 次余力；连续疲劳明显时先减一组而不是硬顶。"
        )
    return (
        "Goal and assumptions\n"
        f"- Treat the main goal as {goal_en}.\n"
        f"- Start with one best-fit {day_count}-day plan and adjust later if you have injury limits or equipment constraints.\n\n"
        "Training plan\n"
        f"{_fallback_training_plan(original, False)}\n\n"
        "Progression rule\n"
        "- Increase load by 2.5-5% once every work set reaches the top of the rep range with solid form.\n\n"
        "Safety and recovery\n"
        "- Warm up for 5-8 minutes, leave 1-2 reps in reserve on main lifts, and reduce one set before pushing through obvious fatigue."
    )


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    original_message = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original_message)
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
        f"Original user question:\n{original_message}\n\n"
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
    original_message = _original_user_message(message)
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                original_message,
                topk=4,
                min_sim=0.72,
                source_types=["exercise", "strength", "workout", "free_exercise_db"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))
    user_block = _build_user_block(original_message, user_profile, evidence)

    msgs = [
        {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    out = manager.generate(msgs, adapter="workout")
    if _needs_rewrite(original_message, out):
        rewritten = _rewrite_answer(message, out).strip()
        if rewritten:
            out = rewritten
    if _needs_rewrite(original_message, out):
        out = _fallback_answer(original_message, user_profile)
    out = _strip_nutrition_leak(_fallback_clean(out)).strip()
    return out, evidence
