import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API = "http://localhost:8000/api/v1";

// ─── Tile colors ────────────────────────────────────────────────────────────
const TILE = {
  G: { bg: "#3B6D11", text: "#fff", label: "Correct" },
  Y: { bg: "#BA7517", text: "#fff", label: "Wrong position" },
  B: { bg: "#5F5E5A", text: "#fff", label: "Absent" },
  "": { bg: "var(--color-background-secondary)", text: "var(--color-text-primary)", label: "" },
};

// ─── Shared tile component ───────────────────────────────────────────────────
function Tile({ letter = "", status = "", size = 52, onClick }) {
  const { bg, text } = TILE[status] ?? TILE[""];
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size,
        background: bg, color: text,
        border: `0.5px solid ${status ? "transparent" : "var(--color-border-secondary)"}`,
        borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 500,
        textTransform: "uppercase",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "background 0.15s",
      }}
    >
      {letter}
    </div>
  );
}

// ─── Row of 5 tiles ──────────────────────────────────────────────────────────
function TileRow({ word = "", pattern = "", size = 52, onTileClick }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Tile
          key={i}
          letter={word[i] ?? ""}
          status={pattern[i] ?? ""}
          size={size}
          onClick={onTileClick ? () => onTileClick(i) : undefined}
        />
      ))}
    </div>
  );
}

// ─── Solver suggestion card ──────────────────────────────────────────────────
function SuggestionCard({ title, result, color }) {
  if (!result) return (
    <div style={cardStyle}>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "8px 0 0" }}>—</p>
    </div>
  );

  const accent = color === "teal" ? "#1D9E75" : "#534AB7";
  const accentBg = color === "teal" ? "#E1F5EE" : "#EEEDFE";
  const accentText = color === "teal" ? "#085041" : "#26215C";

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500,
          color: accent, letterSpacing: 3, textTransform: "uppercase",
        }}>
          {result.word}
        </span>
        {result.is_candidate !== false && (
          <span style={{ fontSize: 11, background: accentBg, color: accentText, padding: "2px 8px", borderRadius: 20 }}>
            candidate
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>
        {result.entropy != null
          ? `${result.entropy.toFixed(2)} bits expected info`
          : `score ${result.score?.toFixed(3)}`}
        {" · "}{result.candidates_remaining} words remain
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {(result.top5 ?? []).map((w, i) => (
          <span key={i} style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: i === 0 ? accentText : "var(--color-text-secondary)",
            background: i === 0 ? accentBg : "var(--color-background-secondary)",
            padding: "2px 7px", borderRadius: 4,
          }}>
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-lg)",
  padding: "14px 16px",
  flex: 1,
};

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ view, setView }) {
  const tabs = ["play", "solver", "benchmark"];
  const labels = { play: "Play", solver: "Solver", benchmark: "Benchmark" };
  return (
    <nav style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setView(t)}
          style={{
            background: "none", border: "none", padding: "8px 16px",
            fontSize: 14, fontWeight: view === t ? 500 : 400,
            color: view === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: view === t ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            cursor: "pointer", marginBottom: -1,
          }}
        >
          {labels[t]}
        </button>
      ))}
    </nav>
  );
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function Keyboard({ letterStates, onKey }) {
  const keyStyle = (ch) => {
    const s = letterStates[ch] ?? "";
    const { bg, text } = TILE[s] ?? TILE[""];
    return {
      background: s ? bg : "var(--color-background-secondary)",
      color: s ? text : "var(--color-text-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 5, padding: "12px 10px", fontSize: 13, fontWeight: 500,
      cursor: "pointer", minWidth: 32, textTransform: "uppercase",
    };
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 16 }}>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 5 }}>
          {ri === 2 && (
            <button onClick={() => onKey("Enter")} style={{ ...keyStyle(""), minWidth: 52, fontSize: 11 }}>enter</button>
          )}
          {row.split("").map((ch) => (
            <button key={ch} onClick={() => onKey(ch)} style={keyStyle(ch)}>{ch}</button>
          ))}
          {ri === 2 && (
            <button onClick={() => onKey("Backspace")} style={{ ...keyStyle(""), minWidth: 44, fontSize: 11 }}>⌫</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW 1: PLAY
// ═══════════════════════════════════════════════════════════════════════════
function PlayView() {
  const [answer, setAnswer] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState("");
  const [solverResult, setSolverResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [letterStates, setLetterStates] = useState({});
  const [toast, setToast] = useState("");

  const fetchSolver = useCallback(async (hist) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/solve/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: hist }),
      });
      const data = await res.json();
      setSolverResult(data);
    } catch {
      setError("Could not reach the API. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (answer) fetchSolver([]);
  }, [answer, fetchSolver]);

  const showToast = (message) => {
    setToast(message);
  
    setTimeout(() => {
      setToast("");
    }, 2000);
  };

  const startGame = () => {
    const w = answerInput.toLowerCase().trim();
    if (w.length !== 5 || !/^[a-z]+$/.test(w)) {
      setError("Enter a valid 5-letter word as the secret answer.");
      return;
    }
    setAnswer(w);
    setHistory([]);
    setCurrent("");
    setSolverResult(null);
    setGameOver(false);
    setLetterStates({});
    setError("");
  };

  const handleKey = async (key) => {
    if (gameOver || !answer) return;
    if (key === "Backspace") { setCurrent((c) => c.slice(0, -1)); return; }
    if (key === "Enter") {
      if (current.length !== 5) { setError("Type 5 letters first."); return; }
      setError("");
      setLoading(true);
      try {
        const res = await fetch(`${API}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guess: current, answer }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          showToast(data.detail || "Not in word list");

          setLoading(false);
          return;
        }

        const newEntry = { guess: data.guess, pattern: data.pattern };
        const newHistory = [...history, newEntry];

        const newStates = { ...letterStates };
        data.pattern.split("").forEach((s, i) => {
          const ch = current[i];
          const priority = { G: 3, Y: 2, B: 1 };
          if ((priority[s] ?? 0) > (priority[newStates[ch]] ?? 0)) newStates[ch] = s;
        });
        setLetterStates(newStates);
        setHistory(newHistory);
        setCurrent("");

        if (data.solved) { setGameOver(true); setSolverResult(null); return; }
        if (newHistory.length >= 6) { setGameOver(true); setSolverResult(null); return; }
        await fetchSolver(newHistory);
      } catch {
        setError("API error evaluating guess.");
        setLoading(false);
      }
      return;
    }
    if (/^[a-zA-Z]$/.test(key) && current.length < 5) {
      setCurrent((c) => c + key.toLowerCase());
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT") return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const won = history.length > 0 && history[history.length - 1]?.pattern === "GGGGG";
  const lost = !won && gameOver;

  return (
    <div>
        {toast && (
            <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#FF0000",
              color: "#fff",
              borderRadius: 8,
              padding: "16px 28px",
              fontSize: 18,
              fontWeight: 700,
              zIndex: 9999,
              boxShadow: "0 4px 12px rgba(0,0,0,.25)"
            }}
            >
              {toast}
            </div>
          )}
      {!answer ? (
        <div style={{ maxWidth: 360 }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Enter the secret answer word to start. The solver will suggest guesses after each move.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              placeholder="secret word"
              maxLength={5}
              style={{ fontFamily: "var(--font-mono)", textTransform: "lowercase", width: 140 }}
            />
            <button onClick={startGame}>Start game</button>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginTop: 8 }}>{error}</p>}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {history.map((h, i) => (
                <TileRow key={i} word={h.guess} pattern={h.pattern} />
              ))}
              {!gameOver && history.length < 6 && (
                <TileRow word={current} pattern="" />
              )}
              {Array.from({ length: Math.max(0, 5 - history.length - (gameOver ? 0 : 1)) }).map((_, i) => (
                <TileRow key={`empty-${i}`} word="" pattern="" />
              ))}
            </div>
            {gameOver ? (
              <div style={{ marginBottom: 12 }}>
                {won
                  ? <p style={{ fontWeight: 500, color: "#1D9E75" }}>Solved in {history.length} {history.length === 1 ? "guess" : "guesses"}!</p>
                  : <p style={{ fontWeight: 500, color: "var(--color-text-danger)" }}>The answer was <span style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{answer}</span></p>
                }
                <button onClick={() => { setAnswer(""); setAnswerInput(""); }}>New game</button>
              </div>
            ) : (
              <Keyboard letterStates={letterStates} onKey={handleKey} />
            )}
            {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginTop: 8 }}>{error}</p>}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1 }}>
              {loading ? "Thinking…" : gameOver ? "Game over" : "Next guess"}
            </p>
            {!gameOver && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <SuggestionCard title="Frequency solver" result={solverResult?.frequency_solver} color="purple" />
                <SuggestionCard title="Entropy solver" result={solverResult?.entropy_solver} color="teal" />
                {solverResult?.solvers_agree && (
                  <p style={{ fontSize: 12, color: "#1D9E75", margin: 0 }}>Both solvers agree ✓</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW 2: SOLVER ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════
const CYCLE = { "": "B", B: "Y", Y: "G", G: "" };

function SolverView() {
  const [history, setHistory] = useState([]);
  const [guessInput, setGuessInput] = useState("");
  const [pendingPattern, setPendingPattern] = useState(["", "", "", "", ""]);
  const [solverResult, setSolverResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSolver = async (hist) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/solve/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: hist }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? "API error");
        return;
      }
      setSolverResult(await res.json());
    } catch {
      setError("Could not reach API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSolver([]); }, []);

  const cyclePatternAt = (i) => {
    setPendingPattern((p) => {
      const next = [...p];
      next[i] = CYCLE[next[i] ?? ""] ?? "B";
      return next;
    });
  };

  const addGuess = () => {
    const w = guessInput.toLowerCase().trim();
    if (w.length !== 5 || !/^[a-z]+$/.test(w)) { setError("Guess must be 5 letters."); return; }
    if (pendingPattern.some((p) => p === "")) { setError("Click each tile to set its colour (B/Y/G)."); return; }
    const pattern = pendingPattern.join("");
    const newHistory = [...history, { guess: w, pattern }];
    setHistory(newHistory);
    setGuessInput("");
    setPendingPattern(["", "", "", "", ""]);
    setError("");
    if (pattern === "GGGGG") { setSolverResult(null); return; }
    fetchSolver(newHistory);
  };

  const reset = () => {
    setHistory([]);
    setGuessInput("");
    setPendingPattern(["", "", "", "", ""]);
    setSolverResult(null);
    setError("");
    fetchSolver([]);
  };

  const solved = history.length > 0 && history[history.length - 1]?.pattern === "GGGGG";

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      <div style={{ minWidth: 260 }}>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
          Enter your guess and click each tile to cycle its colour, then press Add.
        </p>

        {history.map((h, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <TileRow word={h.guess} pattern={h.pattern} />
          </div>
        ))}

        {!solved && history.length < 6 && (
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Tile
                  key={i}
                  letter={guessInput[i] ?? ""}
                  status={pendingPattern[i]}
                  size={52}
                  onClick={() => guessInput[i] && cyclePatternAt(i)}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <input
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value.toLowerCase().slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && addGuess()}
                placeholder="your guess"
                maxLength={5}
                style={{ fontFamily: "var(--font-mono)", width: 120 }}
              />
              <button onClick={addGuess}>Add</button>
              <button onClick={reset} style={{ fontSize: 13 }}>Reset</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>
              Click tiles to toggle: grey → yellow → green
            </p>
          </div>
        )}

        {solved && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontWeight: 500, color: "#1D9E75" }}>Solved in {history.length} guesses!</p>
            <button onClick={reset}>Start over</button>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginTop: 8 }}>{error}</p>}
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1 }}>
          {loading ? "Thinking…" : solved ? "Solved" : "Suggestions"}
        </p>
        {!solved && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SuggestionCard title="Frequency solver" result={solverResult?.frequency_solver} color="purple" />
            <SuggestionCard title="Entropy solver" result={solverResult?.entropy_solver} color="teal" />
            {solverResult?.solvers_agree && (
              <p style={{ fontSize: 12, color: "#1D9E75", margin: 0 }}>Both solvers agree ✓</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW 3: BENCHMARK
// ═══════════════════════════════════════════════════════════════════════════
function BenchmarkView() {
  const [nGames, setNGames] = useState(50);
  const [startingGuess, setStartingGuess] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = { n_games: nGames };
      if (startingGuess.trim().length === 5) body.starting_guess = startingGuess.trim().toLowerCase();
      const res = await fetch(`${API}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError("Benchmark failed — check the API."); return; }
      setResult(await res.json());
    } catch {
      setError("Could not reach API.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? ["1", "2", "3", "4", "5", "6", "7+"].map((k) => ({
        guesses: k,
        frequency: result.frequency_solver.distribution[k] ?? 0,
        entropy: result.entropy_solver.distribution[k] ?? 0,
      }))
    : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Games to simulate</label>
          <input type="number" min={1} max={500} value={nGames} onChange={(e) => setNGames(Number(e.target.value))} style={{ width: 90 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Override opening guess (optional)</label>
          <input
            value={startingGuess}
            onChange={(e) => setStartingGuess(e.target.value.toLowerCase().slice(0, 5))}
            placeholder="e.g. crane"
            maxLength={5}
            style={{ fontFamily: "var(--font-mono)", width: 110 }}
          />
        </div>
        <button onClick={run} disabled={loading} style={{ alignSelf: "flex-end" }}>
          {loading ? "Running…" : "Run benchmark"}
        </button>
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)" }}>{error}</p>}

      {loading && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Running {nGames} games — this may take a moment for large samples…
        </p>
      )}

      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Frequency avg guesses", value: result.frequency_solver.avg_guesses.toFixed(2) },
              { label: "Entropy avg guesses", value: result.entropy_solver.avg_guesses.toFixed(2) },
              { label: "Frequency win rate", value: `${(result.frequency_solver.win_rate * 100).toFixed(1)}%` },
              { label: "Entropy win rate", value: `${(result.entropy_solver.win_rate * 100).toFixed(1)}%` },
            ].map((m) => (
              <div key={m.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>{m.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{m.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>Guess distribution — {result.n_games} games</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="25%">
                <XAxis dataKey="guesses" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="frequency" name="Frequency" fill="#534AB7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="entropy" name="Entropy" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {(result.frequency_solver.failed_words.length > 0 || result.entropy_solver.failed_words.length > 0) && (
            <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["frequency_solver", "entropy_solver"].map((k) => result[k].failed_words.length > 0 && (
                <div key={k} style={{ ...cardStyle, maxWidth: 300 }}>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>
                    {k === "frequency_solver" ? "Frequency" : "Entropy"} failed words ({result[k].failed_words.length})
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.8 }}>
                    {result[k].failed_words.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("play");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px", fontFamily: "var(--font-sans, system-ui)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>Wordle solver</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
        Frequency vs entropy — two algorithms, head to head
      </p>
      <Nav view={view} setView={setView} />
      {view === "play" && <PlayView />}
      {view === "solver" && <SolverView />}
      {view === "benchmark" && <BenchmarkView />}
    </div>
  );
}
