"""
Word list management for the Wordle solver.
Uses the official NYT Wordle answer list (~2300 words).
"""

import os
import json
from pathlib import Path

# Official Wordle answers
with open(os.path.join(os.path.dirname(__file__), "words.txt")) as f:
    WORDLE_ANSWERS = [line.strip() for line in f if line.strip()]

# Deduplicate and filter to exactly 5-letter words
WORDLE_ANSWERS = sorted(set(w.lower() for w in WORDLE_ANSWERS if len(w) == 5))


def get_word_list() -> list[str]:
    """Return the full Wordle answer word list."""
    return list(WORDLE_ANSWERS)


def is_valid_word(word: str) -> bool:
    """Check if a word is in the valid word list."""
    return word.lower() in WORDLE_ANSWERS