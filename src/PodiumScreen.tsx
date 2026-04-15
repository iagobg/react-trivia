import { useEffect, useState } from "react";

interface Player {
  playerId: string;
  name: string;
  color: string;
}

interface GameState {
  playerScores: Record<string, number>;
}

interface Props {
  gameState: GameState;
  players: Player[];
  isAdmin: boolean;
}

export function PodiumScreen({ gameState, players }: Props) {
  const [revealed, setRevealed] = useState(0);

  const sorted = Object.entries(gameState.playerScores)
    .map(([playerId, score]) => {
      const player = players.find((p) => p.playerId === playerId);
      return {
        playerId,
        name: player?.name ?? playerId.slice(0, 8),
        color: player?.color ?? "#888",
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  useEffect(() => {
    if (revealed < sorted.length) {
      const t = setTimeout(() => setRevealed((r) => r + 1), 600);
      return () => clearTimeout(t);
    }
  }, [revealed, sorted.length]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              width: Math.random() * 8 + 4 + "px",
              height: Math.random() * 8 + 4 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              backgroundColor: ["#FF6B6B", "#4ECDC4", "#FFEAA7", "#DDA0DD", "#45B7D1"][
                Math.floor(Math.random() * 5)
              ],
              opacity: 0.6,
              animationDelay: Math.random() * 2 + "s",
              animationDuration: Math.random() * 2 + 1 + "s",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-4xl font-black text-white">Final Leaderboard</h1>
          <p className="text-gray-400 mt-2">Game Over!</p>
        </div>

        <div className="flex flex-col gap-3">
          {sorted.map((entry, index) => (
            <div
              key={entry.playerId}
              className={`transition-all duration-500 ${
                index < revealed
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}
            >
              <div
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${
                  index === 0
                    ? "bg-yellow-900/30 border-yellow-600/50"
                    : index === 1
                    ? "bg-gray-700/30 border-gray-500/50"
                    : index === 2
                    ? "bg-orange-900/30 border-orange-700/50"
                    : "bg-gray-800/30 border-gray-700/30"
                }`}
              >
                <div className="text-2xl w-8 text-center">
                  {medals[index] ?? `#${index + 1}`}
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg border-2"
                  style={{
                    backgroundColor: entry.color + "33",
                    borderColor: entry.color,
                  }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">{entry.name}</div>
                </div>
                <div className="text-right">
                  <div
                    className="text-xl font-black"
                    style={{ color: index === 0 ? "#fbbf24" : "#e5e7eb" }}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-gray-500 text-xs">points</div>
                </div>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No scores recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
