import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CentralHub } from "./CentralHub";
import { PlayerOrbit } from "./PlayerOrbit";
import { PodiumScreen } from "./PodiumScreen";
import { toast } from "sonner";

interface GameState {
  _id: string;
  phase: "standby" | "loaded" | "in_progress" | "results" | "podium";
  questions: Array<{ question: string; answer: string; hints: string[] }>;
  currentIndex: number;
  roundStartTime?: number;
  revealedHints: number;
  playerScores: Record<string, number>;
  closestGuess?: {
    playerId: string;
    playerName: string;
    distance: number;
    guessText: string;
    submittedAt: number;
  };
  roundWinner?: {
    playerId: string;
    playerName: string;
    score: number;
    isConsolation: boolean;
  };
  soClosePlayerId?: string;
  soClosePlayerName?: string;
}

interface Props {
  gameState: GameState | null;
}

const EXAMPLE_QUESTIONS = [
  {
    "question": "European capital",
    "answer": "Paris",
    "hints": [
      "Largest city in France",
      "Starts with P",
      "_ I _ A _ (vowels scrambled)",
      "City of Light",
      "Sounds like 'pair is'"
    ]
  },
  {
    "question": "Biggest living land mammal",
    "answer": "Elephant",
    "hints": [
      "It's grey",
      "Starts with E",
      "A_E__E__ (vowels scrambled)",
      "It is said to have great memory",
      "Has a trunk and ivory tusks!"
    ]
  },
  {
    "question": "Largest ocean",
    "answer": "Pacific",
    "hints": [
      "It covers more than 60 million square miles",
      "Starts with P",
      "P_C_I_IC (vowels scrambled)",
      "Contains the Mariana Trench",
      "Opposite of 'Atlantic'"
    ]
  },
  {
    "question": "Smallest prime number",
    "answer": "Two",
    "hints": [
      "It's the only even prime",
      "Starts with T",
      "T_W_ (vowels scrambled)",
      "One less than three",
      "It's a number, not 'to' or 'too'"
    ]
  },
  {
    "question": "Chemical symbol for gold",
    "answer": "Au",
    "hints": [
      "Comes from the Latin word 'aurum'",
      "Starts with A",
      "A_ (vowels scrambled)",
      "Found in jewelry and electronics",
      "Value by weight"
    ]
  },
  {
    "question": "Fastest land animal",
    "answer": "Cheetah",
    "hints": [
      "It can run over 70 mph",
      "Starts with C",
      "C_E_E_A_ (vowels scrambled)",
      "Spotted cat from Africa",
      "Not a lion, tiger, or leopard"
    ]
  },
  {
    "question": "Capital of Japan",
    "answer": "Tokyo",
    "hints": [
      "Home to the Emperor of Japan",
      "Starts with T",
      "T_K_Y_ (vowels scrambled)",
      "Was formerly Edo",
      "Famous for cherry blossoms"
    ]
  },
  {
    "question": "Hardest natural substance",
    "answer": "Diamond",
    "hints": [
      "Made of pure carbon",
      "Starts with D",
      "D_A_O_N_ (vowels scrambled)",
      "A girl's best friend",
      "Used in drills and saws"
    ]
  },
  {
    "question": "Largest planet in our solar system",
    "answer": "Jupiter",
    "hints": [
      "Has a famous Great Red Spot",
      "Starts with J",
      "J_P_T_R (vowels scrambled)",
      "Fifth planet from the Sun",
      "Named after the king of gods"
    ]
  },
  {
    "question": "Most abundant gas in Earth's atmosphere",
    "answer": "Nitrogen",
    "hints": [
      "Makes up about 78% of air",
      "Starts with N",
      "N_T_O_E_ (vowels scrambled)",
      "Used in fertilizers",
      "Symbol is N2"
    ]
  }
]

export function AdminView({ gameState }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadQuestions = useMutation(api.game.loadQuestions);
  const startQuiz = useMutation(api.game.startQuiz);
  const nextRound = useMutation(api.game.nextRound);
  const forceReset = useMutation(api.game.forceReset);

  const players = useQuery(api.game.getPlayers) ?? [];

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        setValidationError("JSON must be an array of questions");
        return;
      }

      const questions = data.map((q: unknown, i: number) => {
        const item = q as Record<string, unknown>;
        if (!item.question || !item.answer) {
          throw new Error(`Question ${i + 1} missing 'question' or 'answer' field`);
        }
        const hints = Array.isArray(item.hints)
          ? (item.hints as string[]).slice(0, 5)
          : ["Hint 1", "Hint 2", "Hint 3", "Hint 4", "Hint 5"];
        while (hints.length < 5) hints.push(`Hint ${hints.length + 1}`);
        return {
          question: String(item.question),
          answer: String(item.answer),
          hints,
        };
      });

      await loadQuestions({ questions });
      toast.success(`Loaded ${questions.length} questions!`);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Invalid JSON");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleLoadExample = async () => {
    await loadQuestions({ questions: EXAMPLE_QUESTIONS });
    toast.success("Loaded 10 example questions!");
  };

  if (!gameState) return null;

  if (gameState.phase === "podium") {
    return (
      <div>
        <AdminHeader
          gameState={gameState}
          onFileLoad={handleFileLoad}
          onLoadExample={handleLoadExample}
          onStart={() => startQuiz()}
          onNext={() => nextRound()}
          onReset={() => forceReset()}
          fileRef={fileRef}
          validationError={validationError}
        />
        <PodiumScreen gameState={gameState} players={players} isAdmin={true} />
      </div>
    );
  }

  const currentQuestion =
    gameState.phase === "in_progress" || gameState.phase === "results"
      ? gameState.questions[gameState.currentIndex]
      : null;

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden relative flex items-center justify-center">
      <AdminHeader
        gameState={gameState}
        onFileLoad={handleFileLoad}
        onLoadExample={handleLoadExample}
        onStart={() => startQuiz()}
        onNext={() => nextRound()}
        onReset={() => forceReset()}
        fileRef={fileRef}
        validationError={validationError}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>

      <div className="relative w-full h-screen flex items-center justify-center pt-16">
        <PlayerOrbit players={players} gameState={gameState} myPlayerId="" />
        <CentralHub gameState={gameState} currentQuestion={currentQuestion} />
      </div>

      {gameState.phase === "results" && currentQuestion && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-green-900/80 border border-green-600 rounded-2xl px-6 py-3 text-center">
            <div className="text-green-400 text-xs uppercase tracking-widest mb-1">Answer</div>
            <div className="text-white font-bold text-xl">{currentQuestion.answer}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminHeader({
  gameState,
  onFileLoad,
  onLoadExample,
  onStart,
  onNext,
  onReset,
  fileRef,
  validationError,
}: {
  gameState: GameState;
  onFileLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadExample: () => void;
  onStart: () => void;
  onNext: () => void;
  onReset: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  validationError: string | null;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-indigo-400 font-bold text-sm mr-2">👑 ADMIN</span>

        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            gameState.phase === "standby"
              ? "bg-gray-700 text-gray-300"
              : gameState.phase === "loaded"
              ? "bg-indigo-800 text-indigo-200"
              : gameState.phase === "in_progress"
              ? "bg-green-800 text-green-200"
              : gameState.phase === "results"
              ? "bg-yellow-800 text-yellow-200"
              : "bg-purple-800 text-purple-200"
          }`}
        >
          {gameState.phase.replace("_", " ").toUpperCase()}
          {gameState.phase === "in_progress" &&
            ` — Q${gameState.currentIndex + 1}/${gameState.questions.length}`}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={onFileLoad}
            className="hidden"
            id="json-upload"
          />
          <label
            htmlFor="json-upload"
            className="cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors font-medium"
          >
            📂 Load JSON
          </label>
          <button
            onClick={onLoadExample}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Demo
          </button>
        </div>

        <button
          onClick={onStart}
          disabled={gameState.phase !== "loaded"}
          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
        >
          ▶ Start Quiz
        </button>

        <button
          onClick={onNext}
          disabled={
            gameState.phase !== "in_progress" && gameState.phase !== "results"
          }
          className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
        >
          ⏭ Next Round
        </button>

        <button
          onClick={onReset}
          className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-medium"
        >
          🔄 Force Reset
        </button>
      </div>

      {validationError && (
        <div className="mt-1 text-red-400 text-xs px-2">{validationError}</div>
      )}
    </div>
  );
}
