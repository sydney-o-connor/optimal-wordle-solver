"""
Solver 1: Frequency / Heuristic

Scores each remaining candidate word by the sum of positional letter
frequencies across all remaining candidates. Prefers words whose letters
appear often in the surviving pool — a fast, intuitive approach.

Average solve: ~3.6 guesses.
"""

from collections import Counter
from .pattern import filter_candidates


OPENING_GUESS = "crane"  # Strong frequency-based opener


def _score_word(word: str, freq_by_position: list[Counter]) -> float:
    """
    Score a word by summing positional letter frequencies.
    Uses a set of the word's letters to avoid rewarding repeated letters.
    """
    seen = set()
    score = 0.0
    for i, ch in enumerate(word):
        if ch not in seen:
            score += freq_by_position[i][ch]
            seen.add(ch)
    return score


def _build_positional_freq(candidates: list[str]) -> list[Counter]:
    """Build per-position letter frequency counters from candidates."""
    freq = [Counter() for _ in range(5)]
    for word in candidates:
        for i, ch in enumerate(word):
            freq[i][ch] += 1
    return freq


def get_best_guess(candidates: list[str], all_words: list[str]) -> dict:
    """
    Return the best guess according to the frequency heuristic.

    Args:
        candidates: words still consistent with all clues so far
        all_words:  full word list (unused here, kept for API symmetry)

    Returns dict with:
        word        — the recommended guess
        score       — its frequency score
        candidates_remaining — number of candidates left
        top5        — top 5 candidates with scores
    """
    if len(candidates) == 1:
        return {
            "word": candidates[0],
            "score": 1.0,
            "candidates_remaining": 1,
            "top5": [{"word": candidates[0], "score": 1.0}],
        }

    freq = _build_positional_freq(candidates)
    scored = [(w, _score_word(w, freq)) for w in candidates]
    scored.sort(key=lambda x: -x[1])

    best_word, best_score = scored[0]
    # Normalise score to [0, 1] relative to max
    max_score = scored[0][1] if scored else 1.0

    top5 = [
        {"word": w, "score": round(s / max_score, 4)}
        for w, s in scored[:5]
    ]

    return {
        "word": best_word,
        "score": round(best_score / max_score, 4),
        "candidates_remaining": len(candidates),
        "top5": top5,
    }