"""
Pattern computation for Wordle.

For a given (guess, answer) pair, returns a 5-character pattern string:
  G = Green  (correct letter, correct position)
  Y = Yellow (correct letter, wrong position)
  B = Black/Grey (letter not in answer)

Example:
  guess  = "crane"
  answer = "trace"
  result = "YYGGG"  (c→Y, r→Y, a→G, n→B... actually computed properly below)
"""

from functools import lru_cache
from collections import Counter


def compute_pattern(guess: str, answer: str) -> str:
    """
    Compute the Wordle colour pattern for a guess against an answer.
    Handles duplicate letters correctly (same rules as NYT Wordle).

    Returns a 5-char string of 'G', 'Y', 'B'.
    """
    result = ["B"] * 5
    answer_chars = list(answer)
    guess_chars = list(guess)

    # First pass: mark greens and consume those answer letters
    for i in range(5):
        if guess_chars[i] == answer_chars[i]:
            result[i] = "G"
            answer_chars[i] = None  # consumed

    # Second pass: mark yellows
    for i in range(5):
        if result[i] == "G":
            continue
        if guess_chars[i] in answer_chars:
            result[i] = "Y"
            answer_chars[answer_chars.index(guess_chars[i])] = None  # consume first occurrence

    return "".join(result)


def is_consistent(guess: str, pattern: str, candidate: str) -> bool:
    """
    Return True if `candidate` is still possible given that
    `guess` produced `pattern`.
    """
    return compute_pattern(guess, candidate) == pattern


def filter_candidates(
    candidates: list[str],
    guess: str,
    pattern: str,
) -> list[str]:
    """
    Filter a candidate list to only words consistent with a guess/pattern pair.
    This is the core elimination step used by both solvers.
    """
    return [w for w in candidates if is_consistent(guess, pattern, w)]


# ---------------------------------------------------------------------------
# Precomputed pattern cache (speeds up entropy solver significantly)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=None)
def cached_pattern(guess: str, answer: str) -> str:
    """LRU-cached version of compute_pattern for entropy calculations."""
    return compute_pattern(guess, answer)


def build_pattern_matrix(word_list: list[str]) -> dict[tuple[str, str], str]:
    """
    Precompute all (guess, answer) pattern pairs for a given word list.
    Returns a dict keyed by (guess, answer) → pattern string.

    For 2300 words: 2300² ≈ 5.3M pairs — fast enough to compute once at startup.
    """
    matrix = {}
    for guess in word_list:
        for answer in word_list:
            matrix[(guess, answer)] = compute_pattern(guess, answer)
    return matrix