import json
import re
from typing import Any

from .model_manager import manager
from .prompts import (
    NUTRITION_CARD_SYSTEM_PROMPT,
    NUTRITION_FOOD_ESTIMATE_SYSTEM_PROMPT,
    NUTRITION_SYSTEM_PROMPT,
    NUTRITION_TARGET_SYSTEM_PROMPT,
)
from .rag import retrieve

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,80}>|\{\{[^}\n]{1,80}\}\}|\[[A-Za-z_ ]{1,40}\]")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
LATIN_WORD_RE = re.compile(r"\b[A-Za-z]{3,}\b")
WORKOUT_LEAK_RE = re.compile(
    r"\b(?:plank|crunch(?:es)?|twist(?:s)?|leg raise(?:s)?|bicycle crunch(?:es)?|reverse crunch(?:es)?|"
    r"squat|deadlift|bench|lunge|push[- ]?up|pull[- ]?up|sets?|reps?|"
    r"workout routine|exercise routine|training plan|cardio day|full body|upper body|lower body|"
    r"goal and assumptions|training plan|progression rule|safety and recovery|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|"
    r"(?:平板支撑|卷腹|俄罗斯转体|抬腿|深蹲|硬拉|卧推|组数|次数|训练动作|训练安排|"
    r"训练计划|全身训练|上肢训练|下肢训练|周一|周二|周三|周四|周五|周六|周日)",
    re.I,
)
EN_SECTION_RE = re.compile(
    r"\b(?:Goal and assumptions|Training plan|Progression rule|Safety and recovery|"
    r"Target calories and protein|Meal plan|Weekly adjustment rule|Snack guardrails)\b",
    re.I,
)
DIRTY_TEMPLATE_RE = re.compile(r"\b(?:WORKOUT ADVICE|NUTRITION ADVICE)\b", re.I)
DURATION_WEEK_RE = re.compile(
    r"\b(?:7\s*day|7-day|weekly|week)\b|(?:一周|七天|7天|本周)",
    re.I,
)
ONE_DAY_RE = re.compile(r"\b(?:1[- ]day|one day)\b|(?:一天|1天)", re.I)
ZH_DAY_RE = re.compile(r"(?:周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日)")
EN_DAY_RE = re.compile(r"\b(?:day\s*[1-7]|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", re.I)
ZH_SECTION_TITLES = ("目标热量与蛋白", "饮食计划", "每周调整规则", "加餐与零食原则")
EN_SECTION_TITLES = ("Target calories and protein", "Meal plan", "Weekly adjustment rule", "Snack guardrails")


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


def _is_weekly_request(text: str) -> bool:
    return bool(DURATION_WEEK_RE.search(text or ""))


def _has_expected_sections(text: str, is_cjk: bool) -> bool:
    body = str(text or "")
    titles = ZH_SECTION_TITLES if is_cjk else EN_SECTION_TITLES
    return all(title in body for title in titles)


def _has_weekly_structure(text: str, is_cjk: bool) -> bool:
    body = str(text or "")
    matches = ZH_DAY_RE.findall(body) if is_cjk else EN_DAY_RE.findall(body)
    cleaned = {str(item).strip().lower() for item in matches if str(item).strip()}
    return len(cleaned) >= 5


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
    is_cjk = _is_cjk_user_message(original_message)
    if not body:
        return True
    if PLACEHOLDER_RE.search(body):
        return True
    if len(body) < 60:
        return True
    if _looks_like_markdown_table(body):
        return True
    if DIRTY_TEMPLATE_RE.search(body):
        return True
    if WORKOUT_LEAK_RE.search(body):
        return True
    if not _has_expected_sections(body, is_cjk):
        return True
    if _is_weekly_request(original_message):
        if ONE_DAY_RE.search(body):
            return True
        if not _has_weekly_structure(body, is_cjk):
            return True
    if is_cjk:
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


def _strip_workout_leak(text: str) -> str:
    kept_lines = []
    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if line and WORKOUT_LEAK_RE.search(line):
            continue
        kept_lines.append(raw_line)
    return "\n".join(kept_lines)


def _fallback_target_section(user_profile: dict[str, Any] | None, is_cjk: bool) -> str:
    weight = None
    goal = ""
    if isinstance(user_profile, dict):
        try:
            weight = float(user_profile.get("weightKg") or user_profile.get("weight") or 0) or None
        except Exception:
            weight = None
        goal = str(user_profile.get("goal") or user_profile.get("goalType") or "").strip().lower()

    if weight:
        protein_low = max(int(round(weight * 1.6)), 90)
        protein_high = max(int(round(weight * 2.0)), protein_low + 10)
    else:
        protein_low, protein_high = 100, 140

    if goal in {"fat_loss", "fat loss", "减脂"}:
        calories = "1600-1900 千卡/天" if is_cjk else "1600-1900 kcal/day"
    elif goal in {"muscle_gain", "muscle gain", "增肌"}:
        calories = "2200-2600 千卡/天" if is_cjk else "2200-2600 kcal/day"
    else:
        calories = "1800-2200 千卡/天" if is_cjk else "1800-2200 kcal/day"

    if is_cjk:
        return (
            f"- 先按 {calories} 作为起点。\n"
            f"- 蛋白建议先按 {protein_low}-{protein_high} 克/天执行。\n"
            "- 如果你之后补充了体重、目标和活动量，再把热量与蛋白精细化。"
        )
    return (
        f"- Start with {calories}.\n"
        f"- Keep protein around {protein_low}-{protein_high} g/day.\n"
        "- Refine both targets further once body weight, goal, and activity level are confirmed."
    )


def _fallback_meal_plan(is_cjk: bool, weekly: bool) -> str:
    if weekly and is_cjk:
        return "\n".join(
            [
                "- 周一：早餐燕麦+鸡蛋；午餐鸡胸肉饭+蔬菜；晚餐三文鱼+土豆+沙拉。",
                "- 周二：早餐希腊酸奶+水果；午餐牛肉意面+蔬菜；晚餐豆腐炒饭+青菜。",
                "- 周三：早餐全麦吐司+鸡蛋；午餐鸡腿饭+蔬菜；晚餐虾仁面+时蔬。",
                "- 周四：早餐燕麦奶昔+坚果；午餐火鸡三明治+水果；晚餐牛肉土豆碗。",
                "- 周五：早餐酸奶杯+燕麦；午餐三文鱼饭+西兰花；晚餐鸡肉卷+沙拉。",
                "- 周六：早餐鸡蛋卷+水果；午餐牛肉饭+时蔬；晚餐豆腐面+蘑菇。",
                "- 周日：早餐燕麦粥+酸奶；午餐烤鸡腿+米饭；晚餐虾仁藜麦碗+蔬菜。",
            ]
        )
    if weekly:
        return "\n".join(
            [
                "- Day 1: oats + eggs; chicken rice bowl; salmon with potatoes and salad.",
                "- Day 2: Greek yogurt + fruit; beef pasta with vegetables; tofu rice bowl.",
                "- Day 3: whole-grain toast + eggs; chicken thigh rice bowl; shrimp noodles with greens.",
                "- Day 4: oat smoothie + nuts; turkey sandwich + fruit; beef and potato bowl.",
                "- Day 5: yogurt cup + oats; salmon rice bowl + broccoli; chicken wrap + salad.",
                "- Day 6: omelette + fruit; beef rice bowl + vegetables; tofu noodles + mushrooms.",
                "- Day 7: porridge + yogurt; roast chicken + rice; shrimp quinoa bowl + vegetables.",
            ]
        )
    if is_cjk:
        return (
            "- 早餐：燕麦+鸡蛋+水果。\n"
            "- 午餐：鸡胸肉/豆腐+米饭+两份蔬菜。\n"
            "- 晚餐：鱼类/瘦牛肉+土豆或面+沙拉。\n"
            "- 加餐：酸奶、牛奶、水果或一小把坚果。"
        )
    return (
        "- Breakfast: oats, eggs, and fruit.\n"
        "- Lunch: chicken or tofu, rice, and two portions of vegetables.\n"
        "- Dinner: fish or lean beef, potatoes or noodles, and salad.\n"
        "- Snacks: yogurt, milk, fruit, or a small handful of nuts."
    )


def _fallback_weekly_rule(is_cjk: bool) -> str:
    if is_cjk:
        return "- 连续两周体重和围度都没变化时，再把每日热量上调或下调 100-150 千卡。"
    return "- Only adjust daily intake by 100-150 kcal after two consistent weeks with no change in weight or measurements."


def _fallback_snack_rule(is_cjk: bool) -> str:
    if is_cjk:
        return "- 优先选高蛋白或高饱腹感零食，如酸奶、水果、牛奶、蛋、少量坚果；避免把甜饮料和高糖零食当常规加餐。"
    return "- Prioritise high-protein or high-satiety snacks such as yogurt, fruit, milk, eggs, or a small portion of nuts, and avoid making sugary drinks or sweets your default snack."


def _fallback_answer(user_message: str, user_profile: dict[str, Any] | None = None) -> str:
    original_message = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original_message)
    weekly = _is_weekly_request(original_message)
    if is_cjk:
        return (
            "目标热量与蛋白\n"
            f"{_fallback_target_section(user_profile, True)}\n\n"
            "饮食计划\n"
            f"{_fallback_meal_plan(True, weekly)}\n\n"
            "每周调整规则\n"
            f"{_fallback_weekly_rule(True)}\n\n"
            "加餐与零食原则\n"
            f"{_fallback_snack_rule(True)}"
        )
    return (
        "Target calories and protein\n"
        f"{_fallback_target_section(user_profile, False)}\n\n"
        "Meal plan\n"
        f"{_fallback_meal_plan(False, weekly)}\n\n"
        "Weekly adjustment rule\n"
        f"{_fallback_weekly_rule(False)}\n\n"
        "Snack guardrails\n"
        f"{_fallback_snack_rule(False)}"
    )


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    original_message = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original_message)
    target_language = "Chinese" if is_cjk else "English"

    if is_cjk:
        section_instruction = (
            "必须使用以下四个中文小节标题，且完全按此标题输出：\n"
            "1) 目标热量与蛋白\n"
            "2) 饮食计划\n"
            "3) 每周调整规则\n"
            "4) 加餐与零食原则\n"
        )
        duration_instruction = (
            "如果用户问的是一周/七天饮食计划，就提供一周饮食计划。"
            "如果用户没有明确写时长，默认提供一天示例。"
        )
    else:
        section_instruction = (
            "Use these exact section titles:\n"
            "1) Target calories and protein\n"
            "2) Meal plan\n"
            "3) Weekly adjustment rule\n"
            "4) Snack guardrails\n"
        )
        duration_instruction = (
            "If the user asked for a weekly or 7-day meal plan, provide a weekly / 7-day meal plan. "
            "If no duration is specified, provide a 1-day example."
        )

    rewrite_user = (
        "Rewrite the draft answer so it is directly usable.\n"
        "Rules:\n"
        f"- Output only in {target_language}.\n"
        "- Answer ONLY the nutrition and dietary part of the request.\n"
        "- Do NOT include exercise names, workout routines, cardio plans, sets, reps, or training programming.\n"
        "- If the user explicitly asked only for a meal plan or nutrition plan, do not mention training at all.\n"
        "- Give exactly ONE best-fit plan unless the user explicitly asked for alternatives.\n"
        "- Use the user details already provided instead of replacing them with generic advice.\n"
        "- If body weight and goal are available, include specific calorie and protein ranges.\n"
        "- If information is missing, make only ONE conservative assumption and state it briefly.\n"
        f"- {duration_instruction}\n"
        f"- {section_instruction}\n"
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
        {"role": "system", "content": NUTRITION_SYSTEM_PROMPT},
        {"role": "user", "content": rewrite_user},
    ]
    return manager.generate(rewrite_msgs, adapter="nutrition")


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
                source_types=["nhs", "uk_guideline", "cofid", "usda", "openfoodfacts"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))
    user_block = _build_user_block(original_message, user_profile, evidence)

    msgs = [
        {"role": "system", "content": NUTRITION_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    out = manager.generate(msgs, adapter="nutrition")
    if _needs_rewrite(original_message, out):
        rewritten = _rewrite_answer(message, out).strip()
        if rewritten:
            out = rewritten
    if _needs_rewrite(original_message, out):
        out = _fallback_answer(original_message, user_profile)
    out = _strip_workout_leak(_fallback_clean(out)).strip()
    return out, evidence


def _extract_json_payload(text: str) -> dict[str, Any] | None:
    raw = str(text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if "\n" in raw:
            raw = raw.split("\n", 1)[1]
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(raw[start : end + 1])
    except Exception:
        return None


def _sanitize_card_lines(value: Any) -> list[str]:
    if isinstance(value, str):
        candidates = [line.strip(" -•\t") for line in value.splitlines()]
    elif isinstance(value, list):
        candidates = [str(item).strip() for item in value]
    else:
        candidates = []
    lines = []
    for item in candidates:
        cleaned = _strip_workout_leak(_fallback_clean(item)).strip()
        if not cleaned:
            continue
        lines.append(cleaned)
    return lines[:4]


def _fallback_card_pack(context: dict[str, Any]) -> dict[str, list[str]]:
    summary = context.get("summary") if isinstance(context, dict) else {}
    goal_type = str(context.get("goal_type") or "maintenance")
    meal_type = str(context.get("active_meal_type") or "meal")
    targets = summary.get("targets") if isinstance(summary, dict) else {}
    consumed_calories = float(summary.get("consumedCalories") or 0)
    calorie_target = float(targets.get("calories") or 0)
    protein = float(summary.get("proteinG") or 0)
    protein_target = float(targets.get("protein") or 0)
    water_ml = float(summary.get("waterMl") or 0)
    water_target = float(targets.get("water") or 0)

    insight = [
        f"Today you logged {int(round(consumed_calories))} kcal against a {int(round(calorie_target))} kcal target."
    ]
    if protein_target > 0:
        insight.append(
            f"Protein is at {int(round(protein))} g, which is {int(round((protein / protein_target) * 100))}% of target."
        )
    if water_target > 0:
        insight.append(
            f"Hydration is {int(round(water_ml))} ml out of {int(round(water_target))} ml."
        )

    recommendation = [
        f"For your next {meal_type}, prioritise the nutrients that are still behind target."
    ]
    if goal_type == "fat_loss":
        recommendation.append("Choose lean protein, fruit, and vegetables before adding calorie-dense extras.")
    elif goal_type == "muscle_gain":
        recommendation.append("Use an easy protein + carb combination so calories are easier to finish.")
    else:
        recommendation.append("Keep the meal balanced with protein, fibre, and enough fluids.")
    recommendation.append("A simple option is yogurt or chicken plus fruit, rice, oats, or potatoes.")

    return {
        "insight": insight[:4],
        "recommendation": recommendation[:4],
    }


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        parsed = float(value)
    except Exception:
        return fallback
    return parsed if parsed == parsed else fallback


def _fallback_target_pack(context: dict[str, Any], user_profile: dict[str, Any] | None = None) -> dict[str, Any]:
    goal_type = str((context or {}).get("goal_type") or "maintenance")
    workout_context = (context or {}).get("workout_context") if isinstance(context, dict) else {}
    summary = (context or {}).get("nutrition_summary") if isinstance(context, dict) else {}
    intake_hint = _to_float((summary or {}).get("targetCalories") or (summary or {}).get("caloriesTarget"))
    weight_kg = _to_float((user_profile or {}).get("weightKg"), 70.0)
    weight_kg = max(weight_kg, 45.0)
    weekly_minutes = _to_float((workout_context or {}).get("total_minutes"), 0.0)

    if intake_hint > 0:
        calories = intake_hint
    elif goal_type == "fat_loss":
        calories = weight_kg * 27
    elif goal_type == "muscle_gain":
        calories = weight_kg * 33
    else:
        calories = weight_kg * 30

    if weekly_minutes >= 240:
        calories += 120
    elif weekly_minutes <= 60 and goal_type == "fat_loss":
        calories -= 80

    protein = weight_kg * (2.2 if goal_type == "muscle_gain" else 2.0)
    fat = weight_kg * (0.8 if goal_type == "fat_loss" else 0.9)
    carbs = max((calories - protein * 4 - fat * 9) / 4, 0)

    return {
        "calories_target": int(round(calories)),
        "protein_target_g": int(round(protein)),
        "carbs_target_g": int(round(carbs)),
        "fat_target_g": int(round(fat)),
        "explanation": "Calculated from goal type, body weight, and recent training context.",
        "source": "fallback",
    }


def answer_card_pack(
    context: dict[str, Any],
    user_profile: dict[str, Any] | None = None,
    use_rag: bool = False,
    external_evidence: list[dict[str, Any]] | None = None,
):
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                json.dumps(context, ensure_ascii=False),
                topk=3,
                min_sim=0.72,
                source_types=["nhs", "uk_guideline", "cofid", "usda", "openfoodfacts"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))

    prompt = (
        "Return valid JSON only with this exact shape:\n"
        '{\n'
        '  "insight": ["short sentence", "short sentence"],\n'
        '  "recommendation": ["short sentence", "short sentence"]\n'
        '}\n\n'
        "Rules:\n"
        "- Keep 2 to 4 short sentences in each array.\n"
        "- insight: summarise today and recent nutrition performance.\n"
        "- recommendation: suggest the next meal or best next nutrition action.\n"
        "- Use the supplied goal type, current meal context, targets, and summary values.\n"
        "- Do not include markdown or extra keys.\n\n"
        f"User profile JSON:\n{json.dumps(user_profile or {}, ensure_ascii=False)}\n\n"
        f"Dashboard context JSON:\n{json.dumps(context or {}, ensure_ascii=False)}"
    )

    msgs = [
        {"role": "system", "content": NUTRITION_CARD_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        out = manager.generate(msgs, adapter="nutrition")
        payload = _extract_json_payload(out)
        if not payload:
            return _fallback_card_pack(context), evidence

        insight = _sanitize_card_lines(payload.get("insight"))
        recommendation = _sanitize_card_lines(payload.get("recommendation"))
        if not insight or not recommendation:
            return _fallback_card_pack(context), evidence

        return {"insight": insight, "recommendation": recommendation}, evidence
    except Exception:
        return _fallback_card_pack(context), evidence


def answer_target_pack(
    context: dict[str, Any],
    user_profile: dict[str, Any] | None = None,
    use_rag: bool = False,
    external_evidence: list[dict[str, Any]] | None = None,
):
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                json.dumps(context, ensure_ascii=False),
                topk=3,
                min_sim=0.72,
                source_types=["nhs", "uk_guideline", "cofid", "usda", "openfoodfacts"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))

    prompt = (
        "Return valid JSON only with this exact shape:\n"
        "{\n"
        '  "calories_target": 0,\n'
        '  "protein_target_g": 0,\n'
        '  "carbs_target_g": 0,\n'
        '  "fat_target_g": 0,\n'
        '  "explanation": "one short sentence"\n'
        "}\n\n"
        "Rules:\n"
        "- Output single daily targets, not ranges.\n"
        "- Use the mapped nutrition goal type as the primary driver.\n"
        "- Use linked workout goal, body weight, and training context if present.\n"
        "- Keep explanation to one short sentence.\n"
        "- Do not output markdown or extra keys.\n\n"
        f"User profile JSON:\n{json.dumps(user_profile or {}, ensure_ascii=False)}\n\n"
        f"Target context JSON:\n{json.dumps(context or {}, ensure_ascii=False)}"
    )

    msgs = [
        {"role": "system", "content": NUTRITION_TARGET_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        out = manager.generate(msgs, adapter="nutrition")
        payload = _extract_json_payload(out)
        if not payload:
            return _fallback_target_pack(context, user_profile), evidence

        calories = max(int(round(_to_float(payload.get("calories_target"), 0))), 0)
        protein = max(int(round(_to_float(payload.get("protein_target_g"), 0))), 0)
        carbs = max(int(round(_to_float(payload.get("carbs_target_g"), 0))), 0)
        fat = max(int(round(_to_float(payload.get("fat_target_g"), 0))), 0)
        explanation = _strip_workout_leak(_fallback_clean(str(payload.get("explanation") or ""))).strip()

        if not calories or not protein:
            return _fallback_target_pack(context, user_profile), evidence

        return {
            "calories_target": calories,
            "protein_target_g": protein,
            "carbs_target_g": carbs,
            "fat_target_g": fat,
            "explanation": explanation or "Generated from your linked workout goal and profile data.",
            "source": "nutrition_agent",
        }, evidence
    except Exception:
        return _fallback_target_pack(context, user_profile), evidence


def _fallback_food_estimate(context: dict[str, Any]) -> dict[str, Any]:
    quantity = max(_to_float((context or {}).get("quantity"), 0.0), 0.0)
    unit = str((context or {}).get("unit") or "g")
    normalized_quantity = quantity or (100.0 if unit == "g" else 1.0)

    if unit == "serving":
        calories = 320.0 * normalized_quantity
        protein = 18.0 * normalized_quantity
        carbs = 30.0 * normalized_quantity
        fat = 12.0 * normalized_quantity
    else:
        factor = normalized_quantity / 100.0
        calories = 180.0 * factor
        protein = 10.0 * factor
        carbs = 18.0 * factor
        fat = 6.0 * factor

    return {
        "calories": round(calories, 2),
        "protein_g": round(protein, 2),
        "carbs_g": round(carbs, 2),
        "fat_g": round(fat, 2),
        "explanation": "Estimated from a conservative generic food profile because the nutrition estimator was unavailable.",
        "source": "fallback",
    }


def answer_food_estimate(
    context: dict[str, Any],
    user_profile: dict[str, Any] | None = None,
    use_rag: bool = False,
    external_evidence: list[dict[str, Any]] | None = None,
):
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                json.dumps(context, ensure_ascii=False),
                topk=3,
                min_sim=0.72,
                source_types=["cofid", "usda", "openfoodfacts"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))

    prompt = (
        "Return valid JSON only with this exact shape:\n"
        "{\n"
        '  "calories": 0,\n'
        '  "protein_g": 0,\n'
        '  "carbs_g": 0,\n'
        '  "fat_g": 0,\n'
        '  "explanation": "one short sentence"\n'
        "}\n\n"
        "Rules:\n"
        "- Estimate totals for the exact quantity and unit provided.\n"
        "- Use one conservative assumption if the food is vague.\n"
        "- Keep explanation to one short sentence.\n"
        "- Do not output markdown or extra keys.\n\n"
        f"User profile JSON:\n{json.dumps(user_profile or {}, ensure_ascii=False)}\n\n"
        f"Food estimate context JSON:\n{json.dumps(context or {}, ensure_ascii=False)}"
    )

    msgs = [
        {"role": "system", "content": NUTRITION_FOOD_ESTIMATE_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        out = manager.generate(msgs, adapter="nutrition")
        payload = _extract_json_payload(out)
        if not payload:
          return _fallback_food_estimate(context), evidence

        calories = max(round(_to_float(payload.get("calories"), 0.0), 2), 0.0)
        protein = max(round(_to_float(payload.get("protein_g"), 0.0), 2), 0.0)
        carbs = max(round(_to_float(payload.get("carbs_g"), 0.0), 2), 0.0)
        fat = max(round(_to_float(payload.get("fat_g"), 0.0), 2), 0.0)
        explanation = _strip_workout_leak(_fallback_clean(str(payload.get("explanation") or ""))).strip()

        if calories <= 0:
            return _fallback_food_estimate(context), evidence

        return {
            "calories": calories,
            "protein_g": protein,
            "carbs_g": carbs,
            "fat_g": fat,
            "explanation": explanation or "Estimated from your food description and quantity.",
            "source": "nutrition_agent",
        }, evidence
    except Exception:
        return _fallback_food_estimate(context), evidence
