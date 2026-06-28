import random
from fastapi import APIRouter, HTTPException

from solver import (
    get_word_list,
    is_valid_word,
    compute_pattern,
    filter_candidates,
    frequency_best_guess,
    entropy_best_guess,
)
from .models import (
    SolveStepRequest,
    SolveStepResponse,
    SolverSuggestion,
    EvaluateRequest,
    EvaluateResponse,
    BenchmarkRequest,
    BenchmarkResponse,
    SolverBenchmarkStats,
    WordListResponse,
)

router = APIRouter()
WORD_LIST = get_word_list()


# ---------------------------------------------------------------------------
# POST /solve/step
# ---------------------------------------------------------------------------

@router.post("/solve/step", response_model=SolveStepResponse)
def solve_step(body: SolveStepRequest):
    """
    Given the history of guesses + patterns so far, return the next
    recommended guess from both the frequency solver and the entropy solver.

    - Pass an empty history for the very first guess.
    - Each entry in history is { guess: "crane", pattern: "BYBGB" }.
    """
    # Build the surviving candidate list by applying all past clues
    candidates = list(WORD_LIST)
    for hr in body.history:
        candidates = filter_candidates(candidates, hr.guess, hr.pattern)

    if not candidates:
        raise HTTPException(
            status_code=422,
            detail="No candidates remain — the history may contain contradictory clues.",
        )

    # Run both solvers
    freq_result = frequency_best_guess(candidates, WORD_LIST)
    entr_result = entropy_best_guess(candidates, WORD_LIST)

    freq_suggestion = SolverSuggestion(
        word=freq_result["word"],
        score=freq_result["score"],
        top5=freq_result["top5"],
    )

    entr_suggestion = SolverSuggestion(
        word=entr_result["word"],
        score=0.0,  # entropy solver uses bits, not a 0-1 score
        entropy=entr_result["entropy"],
        is_candidate=entr_result.get("top5", [{}])[0].get("is_candidate"),
        top5=entr_result["top5"],
    )

    return SolveStepResponse(
        candidates_remaining=len(candidates),
        frequency_solver=freq_suggestion,
        entropy_solver=entr_suggestion,
        solvers_agree=freq_suggestion.word == entr_suggestion.word,
    )


# ---------------------------------------------------------------------------
# POST /evaluate
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate(body: EvaluateRequest):
    """
    Given a guess and the true answer, return the colour pattern.
    Useful for the interactive frontend board.
    """

    if not is_valid_word(body.guess):
        raise HTTPException(
            status_code=400,
            detail="Not in word list"
        )

    pattern = compute_pattern(body.guess, body.answer)
    return EvaluateResponse(
        guess=body.guess,
        answer=body.answer,
        pattern=pattern,
        solved=pattern == "GGGGG",
    )


# ---------------------------------------------------------------------------
# POST /benchmark
# ---------------------------------------------------------------------------

@router.post("/benchmark", response_model=BenchmarkResponse)
def benchmark(body: BenchmarkRequest):
    """
    Run both solvers against N randomly sampled Wordle games and compare
    their performance. This is the showpiece endpoint for the LinkedIn demo.

    WARNING: entropy solver is O(n²) per guess — keep n_games ≤ 200 for
    reasonable response times without caching. Consider running this
    async/background in production.
    """
    sample = random.sample(WORD_LIST, min(body.n_games, len(WORD_LIST)))

    def run_solver(solver_fn, starting_guess_override=None):
        distributions = {str(i): 0 for i in range(1, 7)}
        distributions["7+"] = 0
        failed = []

        for answer in sample:
            candidates = list(WORD_LIST)
            solved = False

            for attempt in range(1, 7):
                if attempt == 1 and starting_guess_override:
                    guess = starting_guess_override
                else:
                    result = solver_fn(candidates, WORD_LIST)
                    guess = result["word"]

                pattern = compute_pattern(guess, answer)
                candidates = filter_candidates(candidates, guess, pattern)

                if pattern == "GGGGG":
                    distributions[str(attempt)] += 1
                    solved = True
                    break

            if not solved:
                distributions["7+"] += 1
                failed.append(answer)

        total = len(sample)
        wins = sum(v for k, v in distributions.items() if k != "7+")
        avg = sum(int(k) * v for k, v in distributions.items() if k != "7+") / max(wins, 1)

        return SolverBenchmarkStats(
            solver=solver_fn.__module__.split(".")[-1],
            avg_guesses=round(avg, 3),
            win_rate=round(wins / total, 4),
            distribution=distributions,
            failed_words=failed,
        )

    override = body.starting_guess
    freq_stats = run_solver(frequency_best_guess, override)
    entr_stats = run_solver(entropy_best_guess, override)

    # Head-to-head: compare per-game guess count (rough — full per-game tracking
    # would require restructuring; this compares aggregate wins)
    h2h = {
        "note": "Aggregate comparison; per-game head-to-head requires full game logs.",
        "frequency_avg_guesses": freq_stats.avg_guesses,
        "entropy_avg_guesses": entr_stats.avg_guesses,
        "frequency_win_rate": freq_stats.win_rate,
        "entropy_win_rate": entr_stats.win_rate,
    }

    return BenchmarkResponse(
        n_games=len(sample),
        frequency_solver=freq_stats,
        entropy_solver=entr_stats,
        head_to_head=h2h,
    )


# ---------------------------------------------------------------------------
# GET /words
# ---------------------------------------------------------------------------

@router.get("/words", response_model=WordListResponse)
def get_words():
    """Return the full word list. Useful for the frontend to validate guesses."""
    return WordListResponse(count=len(WORD_LIST), words=WORD_LIST)