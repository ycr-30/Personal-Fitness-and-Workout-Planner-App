import json
import os
from pathlib import Path
import re
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Always load backend/.env before importing modules that read env at import time.
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

from agents.model_manager import manager
from agents.nutrition_agent import (
    answer as nutrition_answer,
    answer_card_pack as nutrition_card_pack,
    answer_food_estimate as nutrition_food_estimate,
    answer_target_pack as nutrition_target_pack,
)
from agents.router import BOTH_EXPLICIT, route, scoped_message
from agents.workout_agent import answer as workout_answer

app = FastAPI(title="KeepFit Multi-Agent API", version="0.1.0")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


class ChatReq(BaseModel):
    message: str | None = None
    user_profile: dict[str, Any] | None = None
    use_rag: bool = False

    # Compatibility fields for existing Node gateway payload
    messages: list[dict[str, Any]] | None = None
    user: dict[str, Any] | None = None
    ragContext: str | None = None
    sources: list[dict[str, Any]] | None = None


class NutritionCardsReq(BaseModel):
    selected_date: str | None = None
    goal_type: str | None = None
    active_meal_type: str | None = None
    summary: dict[str, Any] | None = None
    trends: list[dict[str, Any]] | None = None
    user_profile: dict[str, Any] | None = None
    use_rag: bool = False


class NutritionTargetsReq(BaseModel):
    goal_type: str | None = None
    plan_goal_label: str | None = None
    nutrition_summary: dict[str, Any] | None = None
    workout_context: dict[str, Any] | None = None
    user_profile: dict[str, Any] | None = None
    use_rag: bool = False


class NutritionFoodEstimateReq(BaseModel):
    food_name: str | None = None
    brand_or_note: str | None = None
    quantity: float | None = None
    unit: str | None = None
    meal_type: str | None = None
    user_profile: dict[str, Any] | None = None
    use_rag: bool = False


class AnalyticsInsightReq(BaseModel):
    summary: dict[str, Any] | None = None
    range_days: int | None = None
    snapshot_version: str | None = None
    user_profile: dict[str, Any] | None = None


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4000")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _extract_message(req: ChatReq) -> str:
    if req.message and req.message.strip():
        return req.message.strip()

    # Compatibility mode: extract latest user message from "messages"
    if req.messages:
        for item in reversed(req.messages):
            if str(item.get("role", "")).lower() != "user":
                continue
            content = item.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                merged = "\n".join(
                    str(part.get("text", "")).strip() for part in content if isinstance(part, dict)
                ).strip()
                if merged:
                    return merged
    return ""


def _extract_profile(req: ChatReq) -> dict[str, Any] | None:
    return req.user_profile if req.user_profile else req.user


def _extract_external_evidence(req: ChatReq) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for source in req.sources or []:
        if not isinstance(source, dict):
            continue
        evidence.append(
            {
                "title": str(source.get("title") or "Upstream Source"),
                "source_type": str(source.get("sourceType") or source.get("source_type") or "upstream"),
                "source_uri": str(source.get("sourceUri") or source.get("source_uri") or ""),
                "similarity": float(source.get("similarity") or 0.0),
                "chunk_text": "",
            }
        )
    if req.ragContext and req.ragContext.strip():
        evidence.append(
            {
                "title": "Upstream RAG Context",
                "source_type": "upstream_rag",
                "source_uri": "",
                "similarity": 0.0,
                "chunk_text": req.ragContext.strip()[:700],
            }
        )
    return evidence


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


ANALYTICS_DIRTY_RE = re.compile(
    r"\b(?:WORKOUT ADVICE|NUTRITION ADVICE|Draft response|Key conclusions?|"
    r"Risks?\s*/\s*bottlenecks?|Next\s*7[- ]day action plan|Sources?)\b",
    re.I,
)


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


def _analytics_clean_text(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip().strip("-•\t ")
    if not text:
        return ""
    if ANALYTICS_DIRTY_RE.search(text):
        return ""
    return text


def _analytics_clean_list(value: Any, limit: int = 3) -> list[str]:
    if isinstance(value, list):
        source = value
    elif isinstance(value, str):
        source = [line for line in value.splitlines() if line.strip()]
    else:
        source = []

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in source:
        text = _analytics_clean_text(item)
        if not text:
            continue
        marker = text.casefold()
        if marker in seen:
            continue
        seen.add(marker)
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def _analytics_confidence(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"medium", "high"}:
        return normalized
    return "low"


def _analytics_number(value: Any, fallback: float = 0.0) -> float:
    try:
        parsed = float(value)
    except Exception:
        return fallback
    return parsed if parsed == parsed else fallback


def _supports_nutrition_analytics(summary: dict[str, Any]) -> bool:
    goal = str(((summary or {}).get("goal") or {}).get("primary") or "").strip().lower()
    if goal not in {"fat-loss", "muscle-gain", "maintenance"}:
        return False

    nutrition = (summary or {}).get("nutrition") if isinstance(summary, dict) else {}
    intake_kcal = _analytics_number((nutrition or {}).get("intakeKcal"), 0.0)
    deficit_kcal = _analytics_number((nutrition or {}).get("deficitKcal"), 0.0)
    note = _analytics_clean_text((nutrition or {}).get("intakeNote") or "")
    return intake_kcal > 0 or abs(deficit_kcal) > 0 or bool(note)


def _merge_analytics_payloads(
    workout_payload: dict[str, Any] | None,
    nutrition_payload: dict[str, Any] | None,
    range_days: int,
    snapshot_version: str,
) -> dict[str, Any] | None:
    if not workout_payload:
        return None

    key_insight = _analytics_clean_text(workout_payload.get("keyInsight"))
    if not key_insight:
        return None

    risks = _analytics_clean_list(workout_payload.get("risks"), limit=3)
    next_days = _analytics_clean_list(workout_payload.get("next7Days"), limit=3)
    confidence = _analytics_confidence(workout_payload.get("confidence"))

    if nutrition_payload:
        nutrition_risks = _analytics_clean_list(nutrition_payload.get("risks"), limit=2)
        nutrition_next = _analytics_clean_list(nutrition_payload.get("next7Days"), limit=2)

        for item in nutrition_risks:
            if item.casefold() not in {entry.casefold() for entry in risks}:
                risks.append(item)
            if len(risks) >= 3:
                break

        for item in nutrition_next:
            if item.casefold() not in {entry.casefold() for entry in next_days}:
                next_days.append(item)
            if len(next_days) >= 3:
                break

        if confidence == "high" and _analytics_confidence(nutrition_payload.get("confidence")) != "high":
            confidence = "medium"
        if _analytics_confidence(nutrition_payload.get("confidence")) == "low":
            confidence = "low"

    return {
        "keyInsight": key_insight,
        "risks": risks[:3],
        "next7Days": next_days[:3],
        "confidence": confidence,
        "insufficientData": False,
        "basedOn": {
            "timeRange": f"Last {range_days} days",
            "snapshotVersion": str(snapshot_version or "").strip(),
        },
    }


def _build_workout_analytics_prompt(
    summary: dict[str, Any],
    range_days: int,
    snapshot_version: str,
    user_profile: dict[str, Any] | None = None,
) -> str:
    return (
        "Return valid JSON only with this exact shape:\n"
        "{\n"
        '  "keyInsight": "one short paragraph",\n'
        '  "risks": ["short bullet", "short bullet"],\n'
        '  "next7Days": ["short action", "short action"],\n'
        '  "confidence": "low"\n'
        "}\n\n"
        "Rules:\n"
        "- Base every statement strictly on the supplied analytics snapshot.\n"
        "- Do not invent numbers, dates, goals, or progress that are not present.\n"
        "- keyInsight: max 1 short paragraph.\n"
        "- risks: max 3 short bullets.\n"
        "- next7Days: max 3 short, grounded, quantitative actions.\n"
        "- Only include workout, recovery, activity, and body-metric observations.\n"
        "- Do not include nutrition, calories, protein, meal plans, or supplements.\n"
        "- Do not output markdown, headings, labels, or extra keys.\n\n"
        f"User profile JSON:\n{json.dumps(user_profile or {}, ensure_ascii=False)}\n\n"
        f"Analytics summary JSON (Last {range_days} days, snapshot {snapshot_version}):\n"
        f"{json.dumps(summary or {}, ensure_ascii=False)}"
    )


def _build_nutrition_analytics_prompt(
    summary: dict[str, Any],
    range_days: int,
    snapshot_version: str,
    user_profile: dict[str, Any] | None = None,
) -> str:
    return (
        "Return valid JSON only with this exact shape:\n"
        "{\n"
        '  "risks": ["short bullet"],\n'
        '  "next7Days": ["short action"],\n'
        '  "confidence": "low"\n'
        "}\n\n"
        "Rules:\n"
        "- Only include nutrition-specific guidance if the goal and data clearly support it.\n"
        "- Use only the supplied analytics snapshot.\n"
        "- Keep every item short, grounded, and quantitative when possible.\n"
        "- Do not mention workout programming or body-measurement trends.\n"
        "- risks: max 2 short bullets.\n"
        "- next7Days: max 2 short actions.\n"
        "- Do not output markdown, headings, labels, or extra keys.\n\n"
        f"User profile JSON:\n{json.dumps(user_profile or {}, ensure_ascii=False)}\n\n"
        f"Analytics summary JSON (Last {range_days} days, snapshot {snapshot_version}):\n"
        f"{json.dumps(summary or {}, ensure_ascii=False)}"
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    preload = os.getenv("PRELOAD_MODEL", "false").strip().lower() in {"1", "true", "yes", "on"}
    if preload:
        manager.load()


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": manager.is_loaded}


@app.post("/chat")
def chat(req: ChatReq, authorization: str | None = Header(default=None)):
    inbound_api_key = os.getenv("INBOUND_API_KEY", "").strip()
    if inbound_api_key:
        expected = f"Bearer {inbound_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    message = _extract_message(req)
    if not message:
        raise HTTPException(status_code=422, detail="message is required (or provide messages[] with a user turn)")

    profile = _extract_profile(req)
    external_evidence = _extract_external_evidence(req)
    r = route(message)
    lowered = message.strip().lower()
    explicit_dual_intent = bool(BOTH_EXPLICIT.search(message))

    nutrition_only_guard = (
        re.search(r"(?:饮食计划|食谱|餐单|一周饮食|七天饮食|只要饮食|不要训练)", message, re.I)
        or re.search(
            r"\b(?:meal plan|diet plan|nutrition plan|nutrition only|diet only|no workout|no training)\b",
            lowered,
            re.I,
        )
    )

    workout_only_guard = (
        re.search(r"(?:训练计划|健身计划|只要训练|不要饮食)", message, re.I)
        or re.search(
            r"\b(?:workout plan|training plan|workout only|training only|no diet|no nutrition)\b",
            lowered,
            re.I,
        )
    )

    if nutrition_only_guard and not explicit_dual_intent:
        r = "nutrition"
    elif workout_only_guard and not explicit_dual_intent:
        r = "workout"

    if r == "nutrition":
        out, ev = nutrition_answer(
            message,
            user_profile=profile,
            use_rag=req.use_rag,
            external_evidence=external_evidence,
        )
        response = {"route": "nutrition", "answer": out, "evidence": ev}
        response["content"] = out  # compatibility for existing gateway parser
        return response

    if r == "workout":
        out, ev = workout_answer(
            message,
            user_profile=profile,
            use_rag=req.use_rag,
            external_evidence=external_evidence,
        )
        response = {"route": "workout", "answer": out, "evidence": ev}
        response["content"] = out
        return response

    is_cjk = _contains_cjk(message)
    out_w, ev_w = workout_answer(
        scoped_message(message, "workout"),
        user_profile=profile,
        use_rag=req.use_rag,
        external_evidence=external_evidence,
    )
    out_n, ev_n = nutrition_answer(
        scoped_message(message, "nutrition"),
        user_profile=profile,
        use_rag=req.use_rag,
        external_evidence=external_evidence,
    )
    if is_cjk:
        merged = f"训练建议：\n{out_w}\n\n饮食建议：\n{out_n}"
    else:
        merged = f"Workout guidance:\n{out_w}\n\nNutrition guidance:\n{out_n}"
    response = {
        "route": "both",
        "answer": merged,
        "evidence": {"workout": ev_w, "nutrition": ev_n},
    }
    response["content"] = merged
    return response


@app.post("/analytics/insight")
def analytics_insight(req: AnalyticsInsightReq, authorization: str | None = Header(default=None)):
    inbound_api_key = os.getenv("INBOUND_API_KEY", "").strip()
    if inbound_api_key:
        expected = f"Bearer {inbound_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    summary = req.summary or {}
    range_days = int(req.range_days or 30)
    range_days = max(7, min(range_days, 180))
    snapshot_version = str(req.snapshot_version or "").strip()
    profile = req.user_profile if isinstance(req.user_profile, dict) else None

    try:
        workout_prompt = _build_workout_analytics_prompt(summary, range_days, snapshot_version, profile)
        workout_messages = [
            {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
            {"role": "user", "content": workout_prompt},
        ]
        workout_raw = manager.generate(workout_messages, adapter="workout")
        workout_payload = _extract_json_payload(workout_raw)
        if not workout_payload:
            return {"route": "analytics_insight", "insight": None, "source": "unavailable"}

        nutrition_payload = None
        if _supports_nutrition_analytics(summary):
            nutrition_prompt = _build_nutrition_analytics_prompt(summary, range_days, snapshot_version, profile)
            nutrition_messages = [
                {"role": "system", "content": NUTRITION_SYSTEM_PROMPT},
                {"role": "user", "content": nutrition_prompt},
            ]
            nutrition_raw = manager.generate(nutrition_messages, adapter="nutrition")
            nutrition_payload = _extract_json_payload(nutrition_raw)

        merged = _merge_analytics_payloads(
            workout_payload,
            nutrition_payload,
            range_days,
            snapshot_version,
        )
        if not merged:
            return {"route": "analytics_insight", "insight": None, "source": "unavailable"}

        return {"route": "analytics_insight", "insight": merged, "source": "analytics_agents"}
    except Exception:
        return {"route": "analytics_insight", "insight": None, "source": "unavailable"}


@app.post("/nutrition/cards")
def nutrition_cards(req: NutritionCardsReq, authorization: str | None = Header(default=None)):
    inbound_api_key = os.getenv("INBOUND_API_KEY", "").strip()
    if inbound_api_key:
        expected = f"Bearer {inbound_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    context = {
        "selected_date": req.selected_date,
        "goal_type": req.goal_type,
        "active_meal_type": req.active_meal_type,
        "summary": req.summary or {},
        "trends": req.trends or [],
    }
    content, evidence = nutrition_card_pack(
        context,
        user_profile=req.user_profile,
        use_rag=req.use_rag,
        external_evidence=[],
    )
    return {
        "route": "nutrition_cards",
        "insight": content.get("insight", []),
        "recommendation": content.get("recommendation", []),
        "evidence": evidence,
    }


@app.post("/nutrition/targets")
def nutrition_targets(req: NutritionTargetsReq, authorization: str | None = Header(default=None)):
    inbound_api_key = os.getenv("INBOUND_API_KEY", "").strip()
    if inbound_api_key:
        expected = f"Bearer {inbound_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    context = {
        "goal_type": req.goal_type,
        "plan_goal_label": req.plan_goal_label,
        "nutrition_summary": req.nutrition_summary or {},
        "workout_context": req.workout_context or {},
    }
    content, evidence = nutrition_target_pack(
        context,
        user_profile=req.user_profile,
        use_rag=req.use_rag,
        external_evidence=[],
    )
    return {
        "route": "nutrition_targets",
        "calories_target": content.get("calories_target", 0),
        "protein_target_g": content.get("protein_target_g", 0),
        "carbs_target_g": content.get("carbs_target_g", 0),
        "fat_target_g": content.get("fat_target_g", 0),
        "explanation": content.get("explanation", ""),
        "source": content.get("source", "fallback"),
        "evidence": evidence,
    }


@app.post("/nutrition/estimate-food")
def nutrition_estimate_food(req: NutritionFoodEstimateReq, authorization: str | None = Header(default=None)):
    inbound_api_key = os.getenv("INBOUND_API_KEY", "").strip()
    if inbound_api_key:
        expected = f"Bearer {inbound_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    context = {
        "food_name": req.food_name,
        "brand_or_note": req.brand_or_note,
        "quantity": req.quantity,
        "unit": req.unit,
        "meal_type": req.meal_type,
    }
    content, evidence = nutrition_food_estimate(
        context,
        user_profile=req.user_profile,
        use_rag=req.use_rag,
        external_evidence=[],
    )
    return {
        "route": "nutrition_estimate_food",
        "calories": content.get("calories", 0),
        "protein_g": content.get("protein_g", 0),
        "carbs_g": content.get("carbs_g", 0),
        "fat_g": content.get("fat_g", 0),
        "explanation": content.get("explanation", ""),
        "source": content.get("source", "fallback"),
        "evidence": evidence,
    }
