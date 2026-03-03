import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.model_manager import manager
from agents.nutrition_agent import answer as nutrition_answer
from agents.router import route
from agents.workout_agent import answer as workout_answer

load_dotenv()

app = FastAPI(title="KeepFit Multi-Agent API", version="0.1.0")


class ChatReq(BaseModel):
    message: str | None = None
    user_profile: dict[str, Any] | None = None
    use_rag: bool = False

    # Compatibility fields for existing Node gateway payload
    messages: list[dict[str, Any]] | None = None
    user: dict[str, Any] | None = None
    ragContext: str | None = None
    sources: list[dict[str, Any]] | None = None


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
        message,
        user_profile=profile,
        use_rag=req.use_rag,
        external_evidence=external_evidence,
    )
    out_n, ev_n = nutrition_answer(
        message,
        user_profile=profile,
        use_rag=req.use_rag,
        external_evidence=external_evidence,
    )
    merged = "WORKOUT ADVICE:\n" + out_w + "\n\nNUTRITION ADVICE:\n" + out_n
    response = {
        "route": "both",
        "answer": merged,
        "evidence": {"workout": ev_w, "nutrition": ev_n},
    }
    response["content"] = merged
    return response
