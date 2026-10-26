# LLM Chatbot

A simple chatbot starter with a FastAPI backend and a Next.js frontend.

## Requirements

- Python 3.10+
- Node.js 20.9+
- A Groq API key, an OpenAI API key, or an OpenAI-compatible LLM endpoint

## Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `GROQ_API_KEY` in `backend/.env` (optionally change `GROQ_MODEL` from
`openai/gpt-oss-120b`), then start the API:

```bash
uvicorn app.main:app --reload
```

The backend loads `backend/.env` automatically. For a Groq key previously saved as
`OPENAI_API_KEY`, either rename it to `GROQ_API_KEY` or set
`OPENAI_BASE_URL=https://api.groq.com/openai/v1`. A Groq key beginning with
`gsk_` is also detected automatically when saved as `OPENAI_API_KEY`.

The API is available at `http://localhost:8000`. The interactive API docs are at
`http://localhost:8000/docs`.

To use OpenAI, set `OPENAI_API_KEY` and `OPENAI_MODEL` in `backend/.env`. For another
OpenAI-compatible provider, set `OPENAI_BASE_URL`, `OPENAI_MODEL`, and
`OPENAI_API_KEY` if the provider requires one.

## Start the frontend

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if
the backend is running at a different URL.

## API

- `GET /api/health` checks that the API is running.
- `POST /api/chat` accepts `{ "messages": [{ "role": "user", "content": "Hi" }] }`
  and returns `{ "message": { "role": "assistant", "content": "..." } }`.
