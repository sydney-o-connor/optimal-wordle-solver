# optimal-wordle-solver

# Wordle Solver — Backend

FastAPI backend exposing two Wordle-solving algorithms via a REST API.

## Algorithms

| Solver | Strategy | Avg Guesses |
|---|---|---|
| Frequency | Letter frequency in remaining candidates | ~3.6 |
| Entropy | Expected information gain (bits) | ~3.4 |

## Quickstart

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/solve/step` | Get next guess from both solvers |
| `POST` | `/api/v1/evaluate` | Compute green/yellow/grey pattern |
| `POST` | `/api/v1/benchmark` | Run both solvers over N random games |
| `GET`  | `/api/v1/words` | Return the full word list |
| `GET`  | `/health` | Health check |

## Example: `/solve/step`

**Request** (first guess — empty history):
```json
{ "history": [] }
```

**Response:**
```json
{
  "candidates_remaining": 2309,
  "frequency_solver": { "word": "crane", "score": 1.0, "top5": [...] },
  "entropy_solver":   { "word": "salet", "entropy": 5.887, "top5": [...] },
  "solvers_agree": false
}
```

**Request** (after CRANE → BYBGB):
```json
{
  "history": [
    { "guess": "crane", "pattern": "BYBGB" }
  ]
}
```

## Project Structure

```
backend/
├── api/
│   ├── main.py        # FastAPI app, CORS, lifespan
│   ├── routes.py      # Route handlers
│   └── models.py      # Pydantic request/response schemas
├── solver/
│   ├── word_list.py   # Wordle answer word list
│   ├── pattern.py     # G/Y/B pattern engine + cache
│   ├── frequency_solver.py
│   └── entropy_solver.py
└── requirements.txt
```

## Deployment (Railway / Render)

Set the start command to:
```
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Update the CORS `allow_origins` in `api/main.py` with your frontend URL.
