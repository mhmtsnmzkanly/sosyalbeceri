import assert from "node:assert/strict";
import test from "node:test";
import { loadCardInput } from "../src/load-card.js";
import type { CardData } from "../src/types.js";
import { validateCard } from "../src/validate-card.js";

const validCard: CardData = {
  id: "MK-TEST",
  category: "Empati",
  scenario: "Biri size bir şey anlattı.",
  question: "Ne dersiniz?",
  answers: { A: "A cevabı", B: "B cevabı", C: "C cevabı", D: "D cevabı" },
};

test("validates a complete card", async () => {
  assert.deepEqual(await validateCard(validCard, process.cwd()), validCard);
});

test("rejects a missing answer key", async () => {
  const invalid: unknown = { ...validCard, answers: { A: "A", B: "B", C: "C" } };
  await assert.rejects(validateCard(invalid, process.cwd()), /keys A, B, C, and D/);
});

test("ignores unused metadata and unknown top-level fields", async () => {
  const validated = await validateCard({
    ...validCard,
    series: "legacy-series",
    correctAnswer: "E",
    cta: null,
    arbitraryMetadata: { source: "import" },
  }, process.cwd());
  assert.deepEqual(validated, validCard);
});

test("requires answer keys but ignores additional answer metadata", async () => {
  const validated = await validateCard({
    ...validCard,
    answers: {
      ...validCard.answers,
      explanation: "Renderer tarafından kullanılmaz.",
    },
  }, process.cwd());
  assert.deepEqual(validated.answers, validCard.answers);
});

test("accepts an optional difficulty from 1 to 4", async () => {
  const card = await validateCard({ ...validCard, difficulty: 4 }, process.cwd());
  assert.equal(card.difficulty, 4);
});

test("rejects an invalid difficulty", async () => {
  await assert.rejects(
    validateCard({ ...validCard, difficulty: 5 }, process.cwd()),
    /difficulty must be an integer from 1 to 4/,
  );
});

test("detects the Claude card collection as a batch input", async () => {
  const input = await loadCardInput(
    "data/claude-cards.json",
    process.cwd(),
  );
    assert.equal(input.kind, "batch");
  if (input.kind === "batch") {
    assert.equal(input.cards.length, 122);
    assert.equal(input.cards[0]?.id, "MK-001");
    assert.equal(input.cards.at(-1)?.id, "MK-122");
  }
});
