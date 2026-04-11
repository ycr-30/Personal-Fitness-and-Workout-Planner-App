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
from agents.router import route, scoped_message
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
    if _contains_cjk(message):
        merged = "训练建议:\n" + out_w + "\n\n饮食建议:\n" + out_n
    else:
        merged = "WORKOUT ADVICE:\n" + out_w + "\n\nNUTRITION ADVICE:\n" + out_n
    response = {
        "route": "both",
        "answer": merged,
        "evidence": {"workout": ev_w, "nutrition": ev_n},
    }
    response["content"] = merged
    return response


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
