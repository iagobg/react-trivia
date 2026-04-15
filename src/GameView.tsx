import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CentralHub } from "./CentralHub";
import { PlayerOrbit } from "./PlayerOrbit";
import { PodiumScreen } from "./PodiumScreen";

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
  playerId: string;
  playerName: string;
  playerColor: string;
  gameState: GameState | null;
}

export function GameView({ playerId, playerName, playerColor, gameState }: Props) {
  const [inputText, setInputText] = useState("");
  const [myGuessResult, setMyGuessResult] = useState<string | null>(null);
  const [showSoClose, setShowSoClose] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const joinGame = useMutation(api.game.joinGame);
  const heartbeatPlayer = useMutation(api.game.heartbeatPlayer);
  const updateTyping = useMutation(api.game.updateTyping);
  const submitGuess = useMutation(api.game.submitGuess);

  const players = useQuery(api.game.getPlayers) ?? [];

  useEffect(() => {
    joinGame({ playerId, name: playerName, color: playerColor });
    const interval = setInterval(() => {
      heartbeatPlayer({ playerId });
    }, 5000);
    return () => clearInterval(interval);
  }, [playerId, playerName, playerColor, joinGame, heartbeatPlayer]);

  useEffect(() => {
    if (gameState?.phase === "in_progress") {
      setInputText("");
      setMyGuessResult(null);
    }
  }, [gameState?.currentIndex, gameState?.phase]);

  const prevSoClose = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      gameState?.soClosePlayerId &&
      gameState.soClosePlayerId !== prevSoClose.current
    ) {
      prevSoClose.current = gameState.soClosePlayerId;
      setShowSoClose(true);
      setTimeout(() => setShowSoClose(false), 2500);
    }
  }, [gameState?.soClosePlayerId]);

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);
      updateTyping({ playerId, text });
    },
    [playerId, updateTyping]
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputText.trim() && gameState?.phase === "in_progress") {
        const result = await submitGuess({
          playerId,
          playerName,
          guessText: inputText.trim(),
        });
        if (result) {
          setMyGuessResult(result.result as string);
          if (result.result === "correct") {
            setInputText("");
          }
        }
      }
    },
    [inputText, gameState?.phase, playerId, playerName, submitGuess]
  );

  if (!gameState) return null;

  if (gameState.phase === "podium") {
    return <PodiumScreen gameState={gameState} players={players} isAdmin={false} />;
  }

  const currentQuestion =
    gameState.phase === "in_progress" || gameState.phase === "results"
      ? gameState.questions[gameState.currentIndex]
      : null;


  const canInput =
    gameState.phase === "in_progress" && myGuessResult !== "correct";

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden relative flex items-center justify-center">
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

      {showSoClose && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-yellow-500 text-black font-bold text-xl px-6 py-3 rounded-2xl shadow-2xl">
            🔥 So Close! — {gameState.soClosePlayerName}
          </div>
        </div>
      )}

      {gameState.phase === "standby" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-800/80 backdrop-blur text-gray-300 px-6 py-2 rounded-full text-sm border border-gray-700">
            ⏳ Waiting for admin to load a quiz...
          </div>
        </div>
      )}
      {gameState.phase === "loaded" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-indigo-900/80 backdrop-blur text-indigo-300 px-6 py-2 rounded-full text-sm border border-indigo-700">
            ✅ Quiz loaded! Waiting for admin to start...
          </div>
        </div>
      )}

      <div className="relative w-full h-screen flex items-center justify-center">
        <PlayerOrbit
          players={players}
          gameState={gameState}
          myPlayerId={playerId}
        />
        <CentralHub
          gameState={gameState}
          currentQuestion={currentQuestion}
        />
      </div>

      {(gameState.phase === "in_progress" || gameState.phase === "results") && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
          {gameState.phase === "results" && gameState.roundWinner && (
            <div className="text-center mb-3">
              <div className="inline-block bg-gray-800/90 backdrop-blur rounded-xl px-4 py-2 text-sm">
                {gameState.roundWinner.isConsolation ? (
                  <span className="text-yellow-400">
                    🥈 Closest guess: <strong>{gameState.roundWinner.playerName}</strong> (+{gameState.roundWinner.score}), the answer was {currentQuestion.answer}.
                  </span>
                ) : (
                  <span className="text-green-400">
                    ✅ <strong>{gameState.roundWinner.playerName}</strong> got it! (+{gameState.roundWinner.score})
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              disabled={!canInput}
              placeholder={
                canInput
                  ? "Type your answer and press Enter..."
                  : gameState.phase === "results"
                  ? "Round over..."
                  : "✅ Correct!"
              }
              className={`w-full px-5 py-4 rounded-2xl text-white text-lg font-medium outline-none transition-all border-2 ${
                myGuessResult === "correct"
                  ? "bg-green-900/50 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                  : myGuessResult === "close"
                  ? "bg-yellow-900/50 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                  : myGuessResult === "near"
                  ? "bg-orange-900/50 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                  : myGuessResult === "far"
                  ? "bg-red-900/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  : "bg-gray-800/80 border-gray-600 focus:border-indigo-500"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              ↵ Enter
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
