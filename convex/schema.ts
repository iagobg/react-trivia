import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  gameState: defineTable({
    phase: v.union(
      v.literal("standby"),
      v.literal("loaded"),
      v.literal("in_progress"),
      v.literal("results"),
      v.literal("podium")
    ),
    questions: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        hints: v.array(v.string()),
      })
    ),
    currentIndex: v.number(),
    roundStartTime: v.optional(v.number()),
    revealedHints: v.number(),
    playerScores: v.record(v.string(), v.number()),
    closestGuess: v.optional(
      v.object({
        playerId: v.string(),
        playerName: v.string(),
        distance: v.number(),
        guessText: v.string(),
        submittedAt: v.number(),
      })
    ),
    roundWinner: v.optional(
      v.object({
        playerId: v.string(),
        playerName: v.string(),
        score: v.number(),
        isConsolation: v.boolean(),
      })
    ),
    soClosePlayerId: v.optional(v.string()),
    soClosePlayerName: v.optional(v.string()),
  }),

  players: defineTable({
    playerId: v.string(),
    name: v.string(),
    color: v.string(),
    typingText: v.string(),
    lastSeen: v.number(),
    guessResult: v.optional(
      v.union(
        v.literal("correct"),
        v.literal("close"),
        v.literal("near"),
        v.literal("far")
      )
    ),
  }).index("by_playerId", ["playerId"]),

  scheduledEvents: defineTable({
    type: v.union(
      v.literal("timeout"),
      v.literal("hint"),
      v.literal("next_round"),
      v.literal("results_end")
    ),
    roundIndex: v.number(),
    hintIndex: v.optional(v.number()),
    scheduledJobId: v.optional(v.string()),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
