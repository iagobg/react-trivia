import { useEffect, useRef, useState } from "react";

interface GameState {
  phase: string;
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
  };
  roundWinner?: {
    playerId: string;
    playerName: string;
    score: number;
    isConsolation: boolean;
  };
}

interface Props {
  gameState: GameState;
  currentQuestion: { question: string; answer: string; hints: string[] } | null;
}

const HINT_TIMES = [10, 15, 20, 25, 28];
const ROUND_DURATION = 30;

function calcScore(roundStartTime: number): number {
  const elapsed = (Date.now() - roundStartTime) / 1000;
  return Math.max(250, Math.round(1000 - 30 * Math.max(0, elapsed - 5)));
}

function calcTimeLeft(roundStartTime: number): number {
  const elapsed = (Date.now() - roundStartTime) / 1000;
  return Math.max(0, ROUND_DURATION - elapsed);
}

export function CentralHub({ gameState, currentQuestion }: Props) {
  const [liveScore, setLiveScore] = useState(1000);
  const [liveTime, setLiveTime] = useState(30);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (gameState.phase === "in_progress" && gameState.roundStartTime) {
      const startTime = gameState.roundStartTime;
      const animate = () => {
        setLiveScore(calcScore(startTime));
        setLiveTime(calcTimeLeft(startTime));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    } else if (gameState.phase === "results") {
      setLiveTime(0);
    }
  }, [gameState.phase, gameState.roundStartTime]);

  const timeLeft = liveTime;
  const progress = timeLeft / ROUND_DURATION;

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;

  let timerColor = "#22c55e";
  if (timeLeft <= 5) timerColor = "#ef4444";
  else if (timeLeft <= 14) timerColor = "#eab308";

  const isActive = gameState.phase === "in_progress";
  const isResults = gameState.phase === "results";

  return (
    <div className="relative z-10 flex flex-col items-center justify-center">
      <svg
        width="280"
        height="280"
        className="absolute"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        {isActive && (
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke={timerColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            style={{
              filter: `drop-shadow(0 0 6px ${timerColor})`,
              transition: "stroke 0.3s",
            }}
          />
        )}
      </svg>

      <div
        className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center text-center px-4
          bg-gray-900 border-2 shadow-2xl
          ${isActive && timeLeft <= 5 ? "animate-pulse" : ""}
          ${isActive ? "border-gray-700" : "border-gray-800"}
        `}
        style={{
          boxShadow: isActive
            ? `0 0 40px ${timerColor}33, inset 0 0 30px rgba(0,0,0,0.5)`
            : "0 0 40px rgba(99,102,241,0.2), inset 0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        {gameState.phase === "standby" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl">🧠</div>
            <div className="text-gray-400 text-sm font-medium">Waiting for quiz</div>
          </div>
        )}

        {gameState.phase === "loaded" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-4xl">✅</div>
            <div className="text-indigo-300 text-sm font-medium">
              {gameState.questions.length} questions loaded
            </div>
            <div className="text-gray-500 text-xs">Waiting to start...</div>
          </div>
        )}

        {isActive && (
          <div className="flex flex-col items-center gap-1">
            <div
              className="text-5xl font-black tabular-nums"
              style={{ color: timerColor, textShadow: `0 0 20px ${timerColor}` }}
            >
              {Math.ceil(timeLeft)}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">seconds</div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#f59e0b" }}>
              {liveScore.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">pts available</div>
            <div className="text-xs text-gray-600 mt-1">
              Q {gameState.currentIndex + 1}/{gameState.questions.length}
            </div>
          </div>
        )}

        {isResults && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl">
              {gameState.roundWinner?.isConsolation ? "🥈" : "🎉"}
            </div>
            <div className="text-white font-bold text-sm">
              {gameState.roundWinner
                ? gameState.roundWinner.isConsolation
                  ? "Closest Guess!"
                  : "Correct!"
                : "Time's Up!"}
            </div>
            {gameState.roundWinner && (
              <div className="text-yellow-400 text-xs font-semibold">
                {gameState.roundWinner.playerName}
              </div>
            )}
            {currentQuestion && (
              <div className="text-white font-bold text-sm">
                The answer was: {currentQuestion.answer}
              </div>
            )}
            <div className="text-gray-500 text-xs mt-1">Next round soon...</div>
          </div>
        )}
      </div>

      {currentQuestion && (
        <div className="mt-6 max-w-sm text-center">
          <div className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-2xl px-5 py-3">
            <p className="text-white font-semibold text-base leading-snug">
              {currentQuestion.question}
            </p>
          </div>
        </div>
      )}

      {currentQuestion && (isActive || isResults) && (
        <div className="mt-3 flex gap-2 flex-wrap justify-center max-w-sm">
          {HINT_TIMES.map((t, i) => {
            const revealed = i < gameState.revealedHints;
            return (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-500 ${
                  revealed
                    ? "bg-indigo-600/80 text-white border border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                    : "bg-gray-800/50 text-gray-600 border border-gray-700"
                }`}
              >
                {revealed ? (
                  <span>💡 {currentQuestion.hints[i]}</span>
                ) : (
                  <span>🔒 Hint {i + 1} @{t}s</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(isActive || isResults) && gameState.closestGuess && (
        <div className="mt-3 bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2 text-xs text-center">
          <span className="text-gray-500">🏆 Closest so far: </span>
          <span className="text-yellow-400 font-semibold">
            {gameState.closestGuess.playerName}
          </span>
          <span className="text-gray-500"> — "{gameState.closestGuess.guessText}"</span>
          <span className="text-gray-600"> (d={gameState.closestGuess.distance})</span>
        </div>
      )}
    </div>
  );
}
