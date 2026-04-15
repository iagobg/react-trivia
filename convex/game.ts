import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ");
}

function calcScore(roundStartTime: number): number {
  const elapsed = (Date.now() - roundStartTime) / 1000;
  return Math.max(250, Math.round(1000 - 30 * Math.max(0, elapsed - 5)));
}

const HINT_TIMES = [10, 15, 20, 25, 28];
const ROUND_DURATION = 30000; 

export const getGameState = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("gameState").first();
    return state;
  },
});

export const getPlayers = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 15000;
    return await ctx.db
      .query("players")
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect();
  },
});

export const initGame = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("gameState").first();
    if (!existing) {
      await ctx.db.insert("gameState", {
        phase: "standby",
        questions: [],
        currentIndex: 0,
        revealedHints: 0,
        playerScores: {},
        closestGuess: undefined,
        roundWinner: undefined,
        soClosePlayerId: undefined,
        soClosePlayerName: undefined,
      });
    }
  },
});

export const loadQuestions = mutation({
  args: {
    questions: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        hints: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameState").first();
    if (!state) throw new Error("Game not initialized");
    await ctx.db.patch(state._id, {
      phase: "loaded",
      questions: args.questions,
      currentIndex: 0,
      playerScores: {},
      closestGuess: undefined,
      roundWinner: undefined,
    });
  },
});

export const startQuiz = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("gameState").first();
    if (!state || state.phase !== "loaded") return;
    if (state.questions.length === 0) return;

    const now = Date.now();
    await ctx.db.patch(state._id, {
      phase: "in_progress",
      currentIndex: 0,
      roundStartTime: now,
      revealedHints: 0,
      closestGuess: undefined,
      roundWinner: undefined,
      soClosePlayerId: undefined,
      soClosePlayerName: undefined,
    });

    const oldEvents = await ctx.db.query("scheduledEvents").collect();
    for (const e of oldEvents) {
      await ctx.db.delete(e._id);
    }

    for (let i = 0; i < HINT_TIMES.length; i++) {
      await ctx.scheduler.runAfter(
        HINT_TIMES[i] * 1000,
        internal.game.triggerHint,
        { roundIndex: 0, hintIndex: i }
      );
    }

    await ctx.scheduler.runAfter(ROUND_DURATION, internal.game.roundTimeout, {
      roundIndex: 0,
    });

    const players = await ctx.db.query("players").collect();
    for (const p of players) {
      await ctx.db.patch(p._id, { guessResult: undefined, typingText: "" });
    }
  },
});

export const submitGuess = mutation({
  args: {
    playerId: v.string(),
    playerName: v.string(),
    guessText: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameState").first();
    if (!state || state.phase !== "in_progress") return null;

    const question = state.questions[state.currentIndex];
    if (!question) return null;

    const normalized = normalizeAnswer(args.guessText);
    const normalizedAnswer = normalizeAnswer(question.answer);
    const distance = levenshtein(normalized, normalizedAnswer);

    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    let guessResult: "correct" | "close" | "near" | "far";
    if (distance === 0) guessResult = "correct";
    else if (distance <= 2) guessResult = "close";
    else if (distance <= 4) guessResult = "near";
    else guessResult = "far";

    if (player) {
      await ctx.db.patch(player._id, { guessResult, typingText: "" });
    }

    // Update closest guess
    const now = Date.now();
    const currentClosest = state.closestGuess;
    let newClosest = currentClosest;
    if (
      !currentClosest ||
      distance < currentClosest.distance ||
      (distance === currentClosest.distance &&
        now < currentClosest.submittedAt)
    ) {
      newClosest = {
        playerId: args.playerId,
        playerName: args.playerName,
        distance,
        guessText: args.guessText,
        submittedAt: now,
      };
    }

    if (distance === 0) {
      // Correct answer!
      const score = calcScore(state.roundStartTime!);
      const newScores = { ...state.playerScores };
      newScores[args.playerId] = (newScores[args.playerId] ?? 0) + score;

      await ctx.db.patch(state._id, {
        playerScores: newScores,
        closestGuess: newClosest,
        roundWinner: {
          playerId: args.playerId,
          playerName: args.playerName,
          score,
          isConsolation: false,
        },
        soClosePlayerId: undefined,
        soClosePlayerName: undefined,
      });

      await ctx.scheduler.runAfter(3000, internal.game.advanceRound, {
        fromIndex: state.currentIndex,
      });

      return { result: "correct", score, distance };
    } else {
      const soClose = distance <= 2;
      await ctx.db.patch(state._id, {
        closestGuess: newClosest,
        soClosePlayerId: soClose ? args.playerId : state.soClosePlayerId,
        soClosePlayerName: soClose ? args.playerName : state.soClosePlayerName,
      });
      return { result: guessResult, distance };
    }
  },
});

export const updateTyping = mutation({
  args: {
    playerId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
    if (player) {
      await ctx.db.patch(player._id, {
        typingText: args.text,
        lastSeen: Date.now(),
      });
    }
  },
});

export const joinGame = mutation({
  args: {
    playerId: v.string(),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("players", {
        playerId: args.playerId,
        name: args.name,
        color: args.color,
        typingText: "",
        lastSeen: Date.now(),
        guessResult: undefined,
      });
    }
  },
});

export const heartbeatPlayer = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
    if (player) {
      await ctx.db.patch(player._id, { lastSeen: Date.now() });
    }
  },
});

export const nextRound = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("gameState").first();
    if (!state) return;
    await ctx.runMutation(internal.game.advanceRound, {
      fromIndex: state.currentIndex,
    });
  },
});

export const forceReset = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("gameState").first();
    if (!state) return;
    await ctx.db.patch(state._id, {
      phase: "standby",
      questions: [],
      currentIndex: 0,
      roundStartTime: undefined,
      revealedHints: 0,
      playerScores: {},
      closestGuess: undefined,
      roundWinner: undefined,
      soClosePlayerId: undefined,
      soClosePlayerName: undefined,
    });
    const events = await ctx.db.query("scheduledEvents").collect();
    for (const e of events) {
      await ctx.db.delete(e._id);
    }
    const players = await ctx.db.query("players").collect();
    for (const p of players) {
      await ctx.db.patch(p._id, {
        guessResult: undefined,
        typingText: "",
      });
    }
  },
});

export const triggerHint = internalMutation({
  args: { roundIndex: v.number(), hintIndex: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameState").first();
    if (!state || state.phase !== "in_progress") return;
    if (state.currentIndex !== args.roundIndex) return;
    await ctx.db.patch(state._id, {
      revealedHints: Math.max(state.revealedHints, args.hintIndex + 1),
    });
  },
});

export const roundTimeout = internalMutation({
  args: { roundIndex: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameState").first();
    if (!state || state.phase !== "in_progress") return;
    if (state.currentIndex !== args.roundIndex) return;

    const newScores = { ...state.playerScores };
    let winner = state.roundWinner;

    if (state.closestGuess && !winner) {
      const consolationScore = 200;
      newScores[state.closestGuess.playerId] =
        (newScores[state.closestGuess.playerId] ?? 0) + consolationScore;
      winner = {
        playerId: state.closestGuess.playerId,
        playerName: state.closestGuess.playerName,
        score: consolationScore,
        isConsolation: true,
      };
    }

    await ctx.db.patch(state._id, {
      phase: "results",
      playerScores: newScores,
      roundWinner: winner,
    });

    await ctx.scheduler.runAfter(3000, internal.game.advanceRound, {
      fromIndex: args.roundIndex,
    });
  },
});

export const advanceRound = internalMutation({
  args: { fromIndex: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gameState").first();
    if (!state) return;
    if (state.currentIndex !== args.fromIndex) return;

    const nextIndex = args.fromIndex + 1;

    if (nextIndex >= state.questions.length) {
      // Game over → podium
      await ctx.db.patch(state._id, {
        phase: "podium",
        roundWinner: undefined,
        soClosePlayerId: undefined,
        soClosePlayerName: undefined,
      });
      return;
    }

    const now = Date.now();
    await ctx.db.patch(state._id, {
      phase: "in_progress",
      currentIndex: nextIndex,
      roundStartTime: now,
      revealedHints: 0,
      closestGuess: undefined,
      roundWinner: undefined,
      soClosePlayerId: undefined,
      soClosePlayerName: undefined,
    });

    const players = await ctx.db.query("players").collect();
    for (const p of players) {
      await ctx.db.patch(p._id, { guessResult: undefined, typingText: "" });
    }

    for (let i = 0; i < HINT_TIMES.length; i++) {
      await ctx.scheduler.runAfter(
        HINT_TIMES[i] * 1000,
        internal.game.triggerHint,
        { roundIndex: nextIndex, hintIndex: i }
      );
    }

    await ctx.scheduler.runAfter(ROUND_DURATION, internal.game.roundTimeout, {
      roundIndex: nextIndex,
    });
  },
});
