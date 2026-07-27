import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { loadFonts } from "../src/assets/load-fonts.js";
import { ANSWER_KEYS } from "../src/draw/answers.js";
import {
  ANSWER_GRID,
  LAYOUT,
  STAGE,
  TYPOGRAPHY,
  type LayoutTokens,
} from "../src/layout/constants.js";
import {
  calculateGridHeight,
  resolveLayout,
} from "../src/layout/resolve-layout.js";
import { renderCard } from "../src/render-card.js";
import { wrapText } from "../src/text/wrap-text.js";
import type { CardData } from "../src/types.js";

const projectRoot = process.cwd();
await loadFonts(projectRoot);
const context = createCanvas(STAGE.width, STAGE.height).getContext("2d");

const baseCard: CardData = {
  id: "MK-TEST",
  category: "Empati",
  scenario: "Bir arkadaşınız heyecanla projesini anlatıyor.",
  question: "Ne dersiniz?",
  answers: {
    A: "Tebrikler!",
    B: "Çok güzel olmuş.",
    C: "Harika fikir.",
    D: "Başarılar dilerim.",
  },
};

const longAnswer = [
  "Bu seçenek oldukça uzun bir metin içeriyor.",
  "Detaylı açıklama yapılarak şıkkın yüksekliğinin ve tüm diğer üç şıkkın",
  "yüksekliğinin aynı oranda artmasını sağlıyoruz.",
].join(" ");

const longCard: CardData = {
  ...baseCard,
  answers: {
    ...baseCard.answers,
    B: longAnswer,
  },
};

function readPngDimensions(png: Buffer): { width: number; height: number } {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("layout measurements use the production Atkinson font family and weights", () => {
  assert.equal(TYPOGRAPHY.family, "Atkinson Hyperlegible Next");
  assert.ok(GlobalFonts.has(TYPOGRAPHY.family));

  const family = GlobalFonts.families.find(({ family: name }) => name === TYPOGRAPHY.family);
  assert.ok(family);
  const weights = new Set(family.styles.map(({ weight }) => weight));
  assert.deepEqual([...weights].sort((left, right) => left - right), [400, 500, 600, 700]);
});

test("approved answer layout remains one column by four rows", () => {
  assert.equal(ANSWER_GRID.columns, 1);
  assert.equal(ANSWER_GRID.rows, 4);
});

test("answer component visual and measurement tokens remain frozen", () => {
  assert.deepEqual(
    {
      columns: LAYOUT.answers.columns,
      rows: LAYOUT.answers.rows,
      columnGap: LAYOUT.answers.columnGap,
      rowGap: LAYOUT.answers.rowGap,
      minBoxHeight: LAYOUT.answers.minBoxHeight,
      maxBoxHeight: LAYOUT.answers.maxBoxHeight,
      paddingTop: LAYOUT.answers.paddingTop,
      paddingBottom: LAYOUT.answers.paddingBottom,
      paddingLeft: LAYOUT.answers.paddingLeft,
      paddingRight: LAYOUT.answers.paddingRight,
      radius: LAYOUT.answers.radius,
      borderWidth: LAYOUT.answers.borderWidth,
      labelDiameter: LAYOUT.answers.labelDiameter,
      labelLeft: LAYOUT.answers.labelLeft,
      labelTop: LAYOUT.answers.labelTop,
      labelTextGap: LAYOUT.answers.labelTextGap,
      textGap: LAYOUT.answers.textGap,
      textRightPadding: LAYOUT.answers.textRightPadding,
      textTopPadding: LAYOUT.answers.textTopPadding,
      textBottomPadding: LAYOUT.answers.textBottomPadding,
      initialFontSize: LAYOUT.answers.initialFontSize,
      minimumFontSize: LAYOUT.answers.minimumFontSize,
      lineHeight: LAYOUT.answers.lineHeight,
    },
    {
      columns: 1,
      rows: 4,
      columnGap: 0,
      rowGap: 16,
      minBoxHeight: 76,
      maxBoxHeight: 180,
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 20,
      paddingRight: 24,
      radius: 18,
      borderWidth: 1.5,
      labelDiameter: 56,
      labelLeft: 20,
      labelTop: 10,
      labelTextGap: 20,
      textGap: 20,
      textRightPadding: 24,
      textTopPadding: 18,
      textBottomPadding: 18,
      initialFontSize: 26,
      minimumFontSize: 19,
      lineHeight: 1.28,
    },
  );
});

test("question divider replaces the visible CTA and remains above the answer grid", () => {
  const layout = resolveLayout(context, baseCard);
  assert.ok(
    layout.questionTextRect.y + layout.questionTextRect.height
      <= layout.questionDividerRect.y,
  );
  assert.ok(
    layout.questionDividerRect.y + layout.questionDividerRect.height
      <= layout.answersRect.y,
  );
  assert.equal("ctaRect" in layout, false);
});

test("scenario and question alignment is centralized and centered", () => {
  assert.equal(LAYOUT.question.alignment, "center");
});

test("header meta anchors mascot left and the category stack right", () => {
  const resolved = resolveLayout(context, baseCard);
  const {
    difficultyMascotRect,
    categoryBadgeRect,
    categorySeparatorRect,
    cardIdRect,
  } = resolved.headerMeta;

  assert.equal(LAYOUT.headerMeta.defaultDifficulty, 1);
  assert.equal(resolved.headerRect.height, LAYOUT.header.contentHeight);
  assert.equal(
    difficultyMascotRect.x,
    resolved.headerRect.x + LAYOUT.headerMeta.mascotOffsetX,
  );
  assert.equal(
    categoryBadgeRect.x + categoryBadgeRect.width,
    resolved.headerRect.x + resolved.headerRect.width,
  );
  assert.equal(categoryBadgeRect.height, LAYOUT.category.badgeHeight);
  assert.ok(
    categorySeparatorRect.y
      >= categoryBadgeRect.y + LAYOUT.category.labelHeight,
  );
  assert.equal(
    categorySeparatorRect.x + categorySeparatorRect.width / 2,
    categoryBadgeRect.x + categoryBadgeRect.width / 2,
  );
  assert.ok(cardIdRect.y >= categorySeparatorRect.y + categorySeparatorRect.height);
  assert.equal(cardIdRect.x + cardIdRect.width, categoryBadgeRect.x + categoryBadgeRect.width);
  assert.ok(
    cardIdRect.y + cardIdRect.height
      <= (
        categoryBadgeRect.y
        + categoryBadgeRect.height
        - LAYOUT.headerMeta.cardIdBottomPadding
      ),
  );
  assert.equal(
    categoryBadgeRect.y + categoryBadgeRect.height
      - (cardIdRect.y + cardIdRect.height),
    LAYOUT.headerMeta.cardIdBottomPadding,
  );
  assert.ok(
    difficultyMascotRect.x + difficultyMascotRect.width
      + LAYOUT.headerMeta.rightStackGap
      <= categoryBadgeRect.x,
  );
  assert.ok(categorySeparatorRect.width > categorySeparatorRect.height);
  assert.equal("mascotToSeparatorGap" in LAYOUT.headerMeta, false);
});

test("long category labels remain single-line and inside the right content edge", () => {
  const resolved = resolveLayout(context, {
    ...baseCard,
    category: "Kişilerarası İletişimde Karmaşık Sınırları Yönetme",
  });
  const { difficultyMascotRect, categoryBadgeRect, categoryFontSize } =
    resolved.headerMeta;
  const contentRight = resolved.headerRect.x + resolved.headerRect.width;

  assert.equal(categoryBadgeRect.x + categoryBadgeRect.width, contentRight);
  assert.ok(categoryBadgeRect.x > difficultyMascotRect.x + difficultyMascotRect.width);
  assert.ok(categoryFontSize <= LAYOUT.typography.categorySize);
  assert.ok(categoryFontSize >= LAYOUT.category.minimumFontSize);
});

test("adaptive card height is clamped and centered on both axes", () => {
  const shortLayout = resolveLayout(context, baseCard);
  const denseLayout = resolveLayout(context, {
    ...baseCard,
    media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    answers: {
      A: longAnswer,
      B: longAnswer,
      C: longAnswer,
      D: longAnswer,
    },
  });
  const maximumLayout = resolveLayout(context, {
    ...baseCard,
    media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    answers: {
      ...baseCard.answers,
      D: "Söylediğimin sende bıraktığı etkiyi anlıyorum ve bunu açıkça konuşup daha dikkatli davranmak istiyorum. ".repeat(2),
    },
  });

  assert.equal(shortLayout.cardRect.height, LAYOUT.card.minHeight);
  assert.ok(denseLayout.cardRect.height > shortLayout.cardRect.height);
  assert.ok(denseLayout.cardRect.height <= LAYOUT.card.maxHeight);
  assert.equal(shortLayout.cardState, "MIN");
  assert.equal(denseLayout.cardState, "MEDIUM");
  assert.equal(maximumLayout.cardState, "MAX");
  for (const resolved of [shortLayout, denseLayout, maximumLayout]) {
    assert.equal(
      resolved.cardRect.x,
      (LAYOUT.stage.width - resolved.cardRect.width) / 2,
    );
    assert.equal(
      resolved.cardRect.y,
      (LAYOUT.stage.height - resolved.cardRect.height) / 2,
    );
  }
});

test("header top distance stays fixed across adaptive card sizes", () => {
  const layouts = [
    resolveLayout(context, baseCard),
    resolveLayout(context, longCard),
    resolveLayout(context, {
      ...longCard,
      media: {
        type: "image",
        src: "assets/screenshots/awkward-message.jpg",
      },
    }),
  ];

  for (const layout of layouts) {
    assert.equal(layout.spacing.topPadding, LAYOUT.card.minTopPadding);
    assert.equal(
      layout.headerRect.y - layout.cardRect.y,
      LAYOUT.card.minTopPadding,
    );
  }
  assert.equal(LAYOUT.card.minTopPadding, LAYOUT.card.maxTopPadding);
});

test("adaptive free space is distributed between sections instead of answer boxes", () => {
  const layout = resolveLayout(context, baseCard);
  assert.equal(layout.answerBoxHeight, LAYOUT.answers.minBoxHeight);
  assert.ok(
    layout.spacing.headerToScenario
      >= LAYOUT.spacing.headerToScenario.min,
  );
  assert.ok(
    layout.spacing.questionToDivider
      >= LAYOUT.spacing.questionToDivider.min,
  );
  assert.ok(
    layout.spacing.dividerToAnswers
      >= LAYOUT.spacing.dividerToAnswersWithoutMedia.min,
  );
  assert.ok(
    layout.spacing.answersToBottom >= LAYOUT.spacing.answersToBottom.min,
  );

  const resolvedBottom = (
    layout.answersRect.y
    + layout.answersRect.height
    + layout.spacing.answersToBottom
  );
  assert.ok(Math.abs(resolvedBottom - (layout.cardRect.y + layout.cardRect.height)) < 0.001);
  assert.ok(layout.metrics.unusedFlexibleSpace < 0.001);
});

test("question divider geometry is configured through centralized tokens", () => {
  assert.deepEqual(LAYOUT.questionDivider, {
    height: 2,
    strokeWidth: 1.5,
    lineWidth: 76,
    centerGap: 20,
  });
});

test("all four answers share one width, height, and font size", () => {
  const layout = resolveLayout(context, longCard);
  const rects = ANSWER_KEYS.map((key) => layout.answerRects[key]);
  const fontSizes = ANSWER_KEYS.map(() => layout.answerFontSize);

  assert.equal(rects.length, 4);
  assert.ok(rects.every((rect) => rect.width === rects[0]?.width));
  assert.ok(rects.every((rect) => rect.height === rects[0]?.height));
  assert.ok(fontSizes.every((fontSize) => fontSize === fontSizes[0]));
  assert.equal(rects[0]?.height, layout.answerBoxHeight);
});

test("answer-box height grows dynamically for longer content", () => {
  const shortLayout = resolveLayout(context, baseCard);
  const longLayout = resolveLayout(context, longCard);

  assert.ok(longLayout.answerBoxHeight > shortLayout.answerBoxHeight);
  assert.ok(shortLayout.answerBoxHeight >= LAYOUT.answers.minBoxHeight);
  assert.ok(longLayout.answerBoxHeight <= LAYOUT.answers.maxBoxHeight);
  assert.ok(longLayout.answerFontSize <= shortLayout.answerFontSize);
});

test("grid height includes one gap between every adjacent row", () => {
  const layout = resolveLayout(context, baseCard);
  const expected = (
    LAYOUT.answers.rows * layout.answerBoxHeight
    + (LAYOUT.answers.rows - 1) * LAYOUT.answers.rowGap
  );
  const oldIncorrectHeight = (
    LAYOUT.answers.rows * layout.answerBoxHeight
    + LAYOUT.answers.rowGap
  );

  assert.equal(LAYOUT.answers.rows - 1, 3);
  assert.equal(calculateGridHeight(4, layout.answerBoxHeight, LAYOUT.answers.rowGap), expected);
  assert.equal(layout.answersRect.height, expected);
  assert.equal(layout.answersRect.height - oldIncorrectHeight, 2 * LAYOUT.answers.rowGap);
  assert.equal(calculateGridHeight(0, layout.answerBoxHeight, LAYOUT.answers.rowGap), 0);
});

test("the final answer ends exactly at the resolved grid bottom", () => {
  const layout = resolveLayout(context, longCard);
  const finalAnswer = layout.answerRects.D;
  const finalAnswerBottom = finalAnswer.y + finalAnswer.height;
  const gridBottom = layout.answersRect.y + layout.answersRect.height;

  assert.ok(Math.abs(finalAnswerBottom - gridBottom) < 0.001);
});

test("media-present layout uses the complete grid height for its card boundary", () => {
  const mediaCard: CardData = {
    ...baseCard,
    media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
  };
  const layout = resolveLayout(context, mediaCard);
  const bottomLimit = (
    layout.cardRect.y
    + layout.cardRect.height
    - layout.spacing.answersToBottom
  );

  assert.ok(layout.mediaRect !== undefined);
  assert.ok(
    layout.questionRect.y + layout.questionRect.height
      < layout.questionDividerRect.y,
  );
  assert.ok(
    layout.questionDividerRect.y + layout.questionDividerRect.height
      < layout.mediaRect.y,
  );
  assert.ok(layout.mediaRect.y + layout.mediaRect.height < layout.answersRect.y);
  assert.ok(layout.answersRect.y + layout.answersRect.height <= bottomLimit + 0.001);
  assert.ok(layout.answerRects.D.y + layout.answerRects.D.height <= bottomLimit + 0.001);
});

test("media-absent layout does not reserve a media region", () => {
  const layout = resolveLayout(context, baseCard);
  assert.equal(layout.mediaRect, undefined);
  assert.equal(layout.metrics.mediaHeight, undefined);
  assert.equal(layout.spacing.dividerToMedia, 0);
  assert.equal(layout.spacing.mediaToAnswers, 0);
  assert.ok(
    layout.questionRect.y + layout.questionRect.height
      < layout.questionDividerRect.y,
  );
  assert.ok(
    layout.questionDividerRect.y + layout.questionDividerRect.height
      < layout.answersRect.y,
  );
});

test("bounded spacing roles stay within their configured ranges", () => {
  const mediaLayout = resolveLayout(
    context,
    {
      ...baseCard,
      media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    },
    LAYOUT,
    { width: 1200, height: 630 },
  );
  const noMediaLayout = resolveLayout(context, baseCard);

  const assertBounded = (
    value: number,
    bounds: { min: number; max: number },
  ): void => {
    assert.ok(value >= bounds.min - 0.001);
    assert.ok(value <= bounds.max + 0.001);
  };

  assertBounded(mediaLayout.spacing.topPadding, LAYOUT.spacing.topPadding);
  assertBounded(
    mediaLayout.spacing.headerToScenario,
    LAYOUT.spacing.headerToScenario,
  );
  assertBounded(
    mediaLayout.spacing.scenarioToQuestion,
    LAYOUT.spacing.scenarioToQuestion,
  );
  assertBounded(
    mediaLayout.spacing.questionToDivider,
    LAYOUT.spacing.questionToDivider,
  );
  assertBounded(
    mediaLayout.spacing.dividerToMedia,
    LAYOUT.spacing.dividerToMedia,
  );
  assertBounded(
    mediaLayout.spacing.mediaToAnswers,
    LAYOUT.spacing.mediaToAnswers,
  );
  assertBounded(
    mediaLayout.spacing.answersToBottom,
    LAYOUT.spacing.answersToBottom,
  );
  assertBounded(
    noMediaLayout.spacing.dividerToAnswers,
    LAYOUT.spacing.dividerToAnswersWithoutMedia,
  );
});

test("no-media free space is distributed without an oversized central gap", () => {
  const layout = resolveLayout(context, baseCard);
  assert.equal(layout.cardRect.height, LAYOUT.card.minHeight);
  assert.ok(
    layout.spacing.dividerToAnswers
      <= LAYOUT.spacing.dividerToAnswersWithoutMedia.max,
  );
  assert.ok(
    layout.spacing.answersToBottom
      < layout.cardRect.height - layout.contentHeight,
  );
  assert.ok(layout.spacing.headerToScenario > LAYOUT.spacing.headerToScenario.preferred);
});

test("contain media height follows source aspect ratio within centralized bounds", () => {
  const mediaCard: CardData = {
    ...baseCard,
    media: {
      type: "image",
      src: "assets/screenshots/awkward-message.jpg",
      fit: "contain",
    },
  };
  const landscape = resolveLayout(
    context,
    mediaCard,
    LAYOUT,
    { width: 1200, height: 630 },
  );
  const portrait = resolveLayout(
    context,
    mediaCard,
    LAYOUT,
    { width: 600, height: 1000 },
  );

  assert.ok(landscape.mediaRect);
  assert.ok(portrait.mediaRect);
  assert.ok(landscape.mediaRect.height >= LAYOUT.media.minHeight);
  assert.ok(landscape.mediaRect.height <= LAYOUT.media.maxHeight);
  assert.equal(portrait.mediaRect.height, LAYOUT.media.maxHeight);
  assert.ok(portrait.mediaRect.height > landscape.mediaRect.height);
});

test("all resolved content rectangles remain ordered and non-overlapping", () => {
  const cards: CardData[] = [
    baseCard,
    {
      ...longCard,
      media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    },
  ];

  for (const card of cards) {
    const layout = resolveLayout(context, card);
    assert.ok(layout.headerRect.y + layout.headerRect.height <= layout.scenarioRect.y);
    assert.ok(
      layout.scenarioRect.y + layout.scenarioRect.height
        <= layout.questionTextRect.y,
    );
    if (layout.mediaRect !== undefined) {
      assert.ok(
        layout.questionTextRect.y + layout.questionTextRect.height
          <= layout.questionDividerRect.y,
      );
      assert.ok(
        layout.questionDividerRect.y + layout.questionDividerRect.height
          <= layout.mediaRect.y,
      );
      assert.ok(layout.mediaRect.y + layout.mediaRect.height <= layout.answersRect.y);
    } else {
      assert.ok(
        layout.questionTextRect.y + layout.questionTextRect.height
          <= layout.questionDividerRect.y,
      );
      assert.ok(
        layout.questionDividerRect.y + layout.questionDividerRect.height
          <= layout.answersRect.y,
      );
    }
    assert.ok(
      layout.answersRect.y + layout.answersRect.height
        <= layout.cardRect.y + layout.cardRect.height,
    );
  }
});

test("dense content consumes flexible spacing before safety gaps are violated", () => {
  const denseCard: CardData = {
    ...baseCard,
    media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    answers: {
      A: longAnswer,
      B: longAnswer,
      C: longAnswer,
      D: `${longAnswer} ${longAnswer}`,
    },
  };
  const layout = resolveLayout(context, denseCard);

  assert.ok(layout.cardRect.height <= LAYOUT.card.maxHeight);
  assert.ok(
    layout.spacing.headerToScenario >= LAYOUT.spacing.headerToScenario.min,
  );
  assert.ok(
    layout.spacing.scenarioToQuestion
      >= LAYOUT.spacing.scenarioToQuestion.min,
  );
  assert.ok(
    layout.spacing.questionToDivider >= LAYOUT.spacing.questionToDivider.min,
  );
  assert.ok(
    layout.spacing.dividerToMedia >= LAYOUT.spacing.dividerToMedia.min,
  );
  assert.ok(
    layout.spacing.mediaToAnswers >= LAYOUT.spacing.mediaToAnswers.min,
  );
  assert.ok(
    layout.spacing.answersToBottom >= LAYOUT.spacing.answersToBottom.min,
  );
});

test("bottom overflow regression includes all three row gaps", () => {
  const baseline = resolveLayout(context, baseCard);
  const missingGapHeight = 2 * LAYOUT.answers.rowGap;
  const constrainedHeight = baseline.naturalCardHeight - missingGapHeight;
  const constrainedLayout: LayoutTokens = {
    ...LAYOUT,
    card: {
      ...LAYOUT.card,
      minHeight: constrainedHeight,
      preferredHeight: constrainedHeight,
      maxHeight: constrainedHeight,
    },
  };

  assert.throws(
    () => resolveLayout(context, baseCard, constrainedLayout),
    /maximum card height/,
  );
});

test("answer wrapping preserves all text without truncation or ellipsis", () => {
  const layout = resolveLayout(context, longCard);
  const answerRect = layout.answerRects.B;
  const textX = (
    answerRect.x
    + LAYOUT.answers.labelLeft
    + LAYOUT.answers.labelDiameter
    + LAYOUT.answers.labelTextGap
  );
  const textWidth = answerRect.width - (textX - answerRect.x) - LAYOUT.answers.textRightPadding;
  const wrapped = wrapText(context, longAnswer, {
    maxWidth: textWidth,
    fontFamily: LAYOUT.typography.family,
    fontWeight: LAYOUT.typography.answerWeight,
    fontSize: layout.answerFontSize,
  });

  context.font = wrapped.font;
  assert.equal(wrapped.lines.join(" "), longAnswer);
  assert.ok(wrapped.lines.every((line) => context.measureText(line).width <= textWidth));
  assert.ok(wrapped.lines.every((line) => !line.includes("…") && !line.includes("...")));
});

test("long production scenarios fit without truncation at the centralized limit", () => {
  const layout = resolveLayout(context, {
    ...baseCard,
    scenario: [
      "İyi kalpli ama sınır tanımayan komşunuz haftada birkaç kez",
      "kapınızı çalıyor; yardımsever biri olarak başladınız ama artık",
      "kendi hayatınıza yetişemiyorsunuz.",
    ].join(" "),
  });

  assert.ok(layout.scenarioRect.height <= LAYOUT.question.scenarioHeight);
  assert.ok(layout.scenarioRect.height > 82);
});

test("extreme answer content fails clearly at the minimum font size", () => {
  const overflowCard: CardData = {
    ...baseCard,
    media: { type: "image", src: "assets/screenshots/awkward-message.jpg" },
    answers: {
      A: "Çok uzun metin ".repeat(50),
      B: "Çok uzun metin ".repeat(50),
      C: "Çok uzun metin ".repeat(50),
      D: "Çok uzun metin ".repeat(50),
    },
  };
  assert.throws(() => resolveLayout(context, overflowCard), /minimum font size/);
});

test("rendered PNG dimensions remain exactly 1080 by 1920", async () => {
  const png = await renderCard(baseCard, { projectRoot });
  assert.deepEqual(readPngDimensions(png), STAGE);
});

test("all four difficulty mascot frames render without changing content geometry", async () => {
  const layouts = ([1, 2, 3, 4] as const).map((difficulty) => (
    resolveLayout(context, { ...baseCard, difficulty })
  ));
  for (const layout of layouts.slice(1)) {
    assert.deepEqual(layout.questionRect, layouts[0]?.questionRect);
    assert.deepEqual(layout.mediaRect, layouts[0]?.mediaRect);
    assert.deepEqual(
      layout.questionDividerRect,
      layouts[0]?.questionDividerRect,
    );
    assert.deepEqual(layout.answerRects, layouts[0]?.answerRects);
    assert.equal(layout.cardRect.height, layouts[0]?.cardRect.height);
    assert.equal(
      layout.cardRect.y,
      (STAGE.height - layout.cardRect.height) / 2,
    );
  }

  const pngs = await Promise.all(
    ([1, 2, 3, 4] as const).map((difficulty) => (
      renderCard({ ...baseCard, difficulty }, { projectRoot })
    )),
  );
  assert.ok(pngs.every((png) => readPngDimensions(png).width === STAGE.width));
  assert.equal(new Set(pngs.map((png) => png.toString("base64"))).size, 4);
});
