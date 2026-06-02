from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ---------------------------------------------------------------------------
# Shared types
# ---------------------------------------------------------------------------

class GuessResult(BaseModel):
    """A single guess + its Wordle colour pattern."""
    guess: str = Field(..., description="5-letter word that was guessed")
    pattern: str = Field(
        ...,
        description="5-char pattern: G=green, Y=yellow, B=black/grey",
        examples=["GYBBB", "GGGGG"],
    )

    @field_validator("guess")
    @classmethod
    def guess_must_be_five_letters(cls, v: str) -> str:
        v = v.lower().strip()
        if len(v) != 5 or not v.isalpha():
            raise ValueError("guess must be exactly 5 alphabetic characters")
        return v

    @field_validator("pattern")
    @classmethod
    def pattern_must_be_valid(cls, v: str) -> str:
        v = v.upper().strip()
        if len(v) != 5 or not all(c in "GYB" for c in v):
            raise ValueError("pattern must be 5 chars of G/Y/B")
        return v


# ---------------------------------------------------------------------------
# /solve/step
# ---------------------------------------------------------------------------

class SolveStepRequest(BaseModel):
    """Request body for POST /solve/step"""
    history: list[GuessResult] = Field(
        default=[],
        description="All guesses + patterns played so far (empty = first guess)",
    )

    @field_validator("history")
    @classmethod
    def history_max_six(cls, v: list) -> list:
        if len(v) > 6:
            raise ValueError("Wordle only allows 6 guesses")
        return v


class SolverSuggestion(BaseModel):
    word: str
    score: float
    entropy: Optional[float] = None
    is_candidate: Optional[bool] = None
    top5: list[dict] = []


class SolveStepResponse(BaseModel):
    """Response body for POST /solve/step"""
    candidates_remaining: int
    frequency_solver: SolverSuggestion
    entropy_solver: SolverSuggestion
    # The two solvers sometimes agree — flag it
    solvers_agree: bool


# ---------------------------------------------------------------------------
# /evaluate
# ---------------------------------------------------------------------------

class EvaluateRequest(BaseModel):
    """Request body for POST /evaluate"""
    guess: str
    answer: str

    @field_validator("guess", "answer")
    @classmethod
    def must_be_five_letters(cls, v: str) -> str:
        v = v.lower().strip()
        if len(v) != 5 or not v.isalpha():
            raise ValueError("must be exactly 5 alphabetic characters")
        return v


class EvaluateResponse(BaseModel):
    guess: str
    answer: str
    pattern: str
    solved: bool  # pattern == "GGGGG"


# ---------------------------------------------------------------------------
# /benchmark
# ---------------------------------------------------------------------------

class BenchmarkRequest(BaseModel):
    """Request body for POST /benchmark (runs both solvers over N random games)"""
    n_games: int = Field(default=100, ge=1, le=500)
    starting_guess: Optional[str] = Field(
        default=None,
        description="Override the opening guess for both solvers",
    )


class SolverBenchmarkStats(BaseModel):
    solver: str
    avg_guesses: float
    win_rate: float          # fraction solved within 6 guesses
    distribution: dict[str, int]  # "1"→count, "2"→count … "7+"→count
    failed_words: list[str]


class BenchmarkResponse(BaseModel):
    n_games: int
    frequency_solver: SolverBenchmarkStats
    entropy_solver: SolverBenchmarkStats
    head_to_head: dict  # {"frequency_wins": N, "entropy_wins": N, "ties": N}


# ---------------------------------------------------------------------------
# /words
# ---------------------------------------------------------------------------

class WordListResponse(BaseModel):
    count: int
    words: list[str]