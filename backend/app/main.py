import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=20_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)


class ChatResponse(BaseModel):
    message: ChatMessage


@asynccontextmanager
async def lifespan(app: FastAPI):
    openai_api_key = os.getenv("OPENAI_API_KEY")
    configured_base_url = os.getenv("OPENAI_BASE_URL")
    using_groq = (
        (openai_api_key or "").startswith("gsk_")
        or "groq.com" in (configured_base_url or "")
    )
    api_key = openai_api_key
    base_url = (
        os.getenv("GROQ_BASE_URL", GROQ_BASE_URL)
        if using_groq
        else configured_base_url
    )
    app.state.openai_client = (
        AsyncOpenAI(api_key=api_key or "not-needed", base_url=base_url)
        if api_key or base_url
        else None
    )
    app.state.model = (
        os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        if using_groq
        else os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    )
    yield
    if app.state.openai_client is not None:
        await app.state.openai_client.close()


app = FastAPI(title="Chat Bot API", version="0.1.0", lifespan=lifespan)

origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    client: AsyncOpenAI | None = request.app.state.openai_client
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Configure OPENAI_API_KEY or OPENAI_BASE_URL in backend/.env to enable chat.",
        )

    try:
        completion = await client.chat.completions.create(
            model=request.app.state.model,
            messages=[message.model_dump() for message in payload.messages],
        )
    except OpenAIError as exc:
        error_message = str(getattr(exc, "message", None) or exc)
        secret = os.getenv("OPENAI_API_KEY")
        if secret:
            error_message = error_message.replace(secret, "[REDACTED]")
        logger.error(
            "LLM provider request failed (status=%s, request_id=%s): %s",
            getattr(exc, "status_code", None),
            getattr(exc, "request_id", None),
            error_message,
        )
        raise HTTPException(
            status_code=502,
            detail="The LLM provider could not complete the request.",
        ) from exc

    content = completion.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=502,
            detail="The LLM provider returned an empty response.",
        )

    return ChatResponse(message=ChatMessage(role="assistant", content=content))
