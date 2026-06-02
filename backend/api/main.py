from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from solver.word_list import get_word_list
from solver.pattern import cached_pattern
from api.routes import router


# ---------------------------------------------------------------------------
# Lifespan: warm the LRU cache on startup so first requests aren't slow
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Warming pattern cache...")
    words = get_word_list()
    # Pre-compute a subset of common openers × all answers to seed the cache
    openers = ["crane", "salet", "audio", "raise", "slate"]
    for opener in openers:
        for answer in words:
            cached_pattern(opener, answer)
    print(f"Cache warmed for {len(openers)} openers × {len(words)} words.")
    yield
    print("Shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Optimal Wordle Solver API",
    description=(
        "Compares two solving strategies — frequency heuristic vs. "
        "information-theory (entropy) — for the NYT Wordle game."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the React frontend (dev + prod) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Vite / CRA dev server
        "http://localhost:5173",   # Vite default
        "https://your-frontend.vercel.app",  # TODO: replace with real domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check (useful for Railway / Render deployment)
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}
    