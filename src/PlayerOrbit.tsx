interface Player {
  _id: string;
  playerId: string;
  name: string;
  color: string;
  typingText: string;
  guessResult?: "correct" | "close" | "near" | "far";
}

interface GameState {
  phase: string;
  playerScores: Record<string, number>;
}

interface Props {
  players: Player[];
  gameState: GameState;
  myPlayerId: string;
}

const ORBIT_RADIUS = 280;

export function PlayerOrbit({ players, gameState, myPlayerId }: Props) {
  const count = players.length;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {players.map((player, index) => {
        const angle = (index / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + (ORBIT_RADIUS / window.innerWidth) * 100 * Math.cos(angle);
        const y = 50 + (ORBIT_RADIUS / window.innerHeight) * 100 * Math.sin(angle);

        const score = gameState.playerScores[player.playerId] ?? 0;
        const isMe = player.playerId === myPlayerId;

        let glowColor = "transparent";
        let borderColor = player.color;
        if (player.guessResult === "correct") {
          glowColor = "rgba(34,197,94,0.6)";
          borderColor = "#22c55e";
        } else if (player.guessResult === "close") {
          glowColor = "rgba(234,179,8,0.6)";
          borderColor = "#eab308";
        } else if (player.guessResult === "near") {
          glowColor = "rgba(249,115,22,0.6)";
          borderColor = "#f97316";
        } else if (player.guessResult === "far") {
          glowColor = "rgba(239,68,68,0.6)";
          borderColor = "#ef4444";
        }

        return (
          <div
            key={player.playerId}
            className="absolute flex flex-col items-center gap-1 pointer-events-auto"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white border-2 transition-all duration-300"
              style={{
                backgroundColor: player.color + "33",
                borderColor,
                boxShadow:
                  glowColor !== "transparent"
                    ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`
                    : isMe
                    ? `0 0 12px ${player.color}88`
                    : "none",
              }}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>

            <div className="text-center">
              <div
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: player.color,
                  backgroundColor: player.color + "22",
                  border: `1px solid ${player.color}44`,
                }}
              >
                {player.name}
                {isMe && <span className="text-gray-500 ml-1">(you)</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono">
                {score.toLocaleString()} pts
              </div>
            </div>

            {player.typingText && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div
                  className="text-xs px-2 py-1 rounded-lg bg-gray-800/90 border border-gray-700 text-gray-300 max-w-24 truncate"
                  style={{ borderColor: player.color + "66" }}
                >
                  ✏️ {player.typingText}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
