import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { GameView } from "./GameView";
import { AdminView } from "./AdminView";
import { JoinScreen } from "./JoinScreen";

const PLAYER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F0B27A", "#82E0AA", "#F1948A", "#AED6F1", "#A9DFBF",
  "#FAD7A0", "#D2B4DE", "#A3E4D7", "#F9E79F", "#FDFEFE",
];

function getRandomColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

function generatePlayerId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const isAdmin = window.location.pathname === "/admin";
  const initGame = useMutation(api.game.initGame);
  const gameState = useQuery(api.game.getGameState);

  const [playerId] = useState(() => {
    const stored = sessionStorage.getItem("trivia_player_id");
    if (stored) return stored;
    const id = generatePlayerId();
    sessionStorage.setItem("trivia_player_id", id);
    return id;
  });

  const [playerName, setPlayerName] = useState(() =>
    sessionStorage.getItem("trivia_player_name") || ""
  );
  const [playerColor] = useState(() => {
    const stored = sessionStorage.getItem("trivia_player_color");
    if (stored) return stored;
    const color = getRandomColor();
    sessionStorage.setItem("trivia_player_color", color);
    return color;
  });
  const [hasJoined, setHasJoined] = useState(() =>
    !!sessionStorage.getItem("trivia_player_name")
  );

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleJoin = (name: string) => {
    sessionStorage.setItem("trivia_player_name", name);
    setPlayerName(name);
    setHasJoined(true);
  };

  if (gameState === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <>
        <AdminView gameState={gameState} />
        <Toaster theme="dark" />
      </>
    );
  }

  if (!hasJoined) {
    return (
      <>
        <JoinScreen onJoin={handleJoin} />
        <Toaster theme="dark" />
      </>
    );
  }

  return (
    <>
      <GameView
        playerId={playerId}
        playerName={playerName}
        playerColor={playerColor}
        gameState={gameState}
      />
      <Toaster theme="dark" />
    </>
  );
}
