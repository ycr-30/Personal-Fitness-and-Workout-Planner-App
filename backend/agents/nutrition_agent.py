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
    r"squat|deadlift|bench|lunge|push[- ]?up|pull[- ]?up|sets?|reps?|workout routine|exercise routine)\b|"
    r"(?:平板支撑|卷腹|俄罗斯转体|抬腿|深蹲|硬拉|卧推|组数|次数|训练动作|训练安排)",
    re.I,
)


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
    if WORKOUT_LEAK_RE.search(text):
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


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    target_language = "Chinese" if _is_cjk_user_message(user_message) else "English"
    rewrite_user = (
        "Rewrite the draft answer so it is directly usable.\n"
        "Rules:\n"
        f"- Output only in {target_language}.\n"
        "- Answer ONLY the nutrition and dietary part of the request.\n"
        "- Do NOT include exercise names, workout routines, sets, reps, or exercise programming.\n"
        "- Give exactly ONE best-fit plan unless the user explicitly asked for alternatives.\n"
        "- Use the user details already provided instead of replacing them with generic advice.\n"
        "- If body weight and goal are available, include specific calorie and protein ranges.\n"
        "- If information is missing, make only ONE conservative assumption and state it briefly.\n"
        "- Use exactly four sections with these meanings, translated into the target language:\n"
        "  1) Target calories and protein\n"
        "  2) 1-day meal plan\n"
        "  3) Weekly adjustment rule\n"
        "  4) Snack guardrail\n"
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
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                message,
                topk=4,
                min_sim=0.72,
                source_types=["nhs", "uk_guideline", "cofid", "usda", "openfoodfacts"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))
    user_block = _build_user_block(message, user_profile, evidence)

    msgs = [
        {"role": "system", "content": NUTRITION_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    out = manager.generate(msgs, adapter="nutrition")
    if _needs_rewrite(message, out):
        rewritten = _rewrite_answer(message, out).strip()
        if rewritten:
            out = rewritten
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
