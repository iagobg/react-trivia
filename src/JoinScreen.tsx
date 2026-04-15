import { useState } from "react";

interface Props {
  onJoin: (name: string) => void;
}

export function JoinScreen({ onJoin }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) return;
    onJoin(trimmed);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🧠</div>
          <h1 className="text-4xl font-bold text-white mb-2">React Trivia</h1>
          <p className="text-gray-400 text-lg">Real-time trivia</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="px-6 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white text-xl text-center focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 w-72"
            autoFocus
          />
          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors"
          >
            Join Game →
          </button>
        </form>
      </div>
    </div>
  );
}
