import type { SKRSContext2D } from "@napi-rs/canvas";
import { fitTextToBox } from "../text/fit-text.js";
import { wrapText } from "../text/wrap-text.js";
import type { AnswerKey, CardData } from "../types.js";
import { LAYOUT, type LayoutTokens } from "./constants.js";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export type CardLayoutState = "MIN" | "MEDIUM" | "MAX";

export interface ResolvedSpacing {
  topPadding: number;
  headerToScenario: number;
  scenarioToQuestion: number;
  questionToDivider: number;
  dividerToMedia: number;
  mediaToAnswers: number;
  dividerToAnswers: number;
  answersToBottom: number;
}

export interface LayoutMetrics {
  cardHeight: number;
  cardY: number;
  topPadding: number;
  headerHeight: number;
  headerToScenarioGap: number;
  scenarioHeight: number;
  scenarioToQuestionGap: number;
  questionHeight: number;
  questionToDividerGap: number;
  dividerToMediaGap?: number | undefined;
  mediaHeight?: number | undefined;
  mediaToAnswersGap?: number | undefined;
  dividerToAnswersGap?: number | undefined;
  answerGridHeight: number;
  answersToBottomGap: number;
  answerFontSize: number;
  unusedFlexibleSpace: number;
}

export interface ResolvedHeaderMeta {
  difficultyMascotRect: Rect;
  categoryBadgeRect: Rect;
  categorySeparatorRect: Rect;
  cardIdRect: Rect;
  categoryFontSize: number;
}

export interface ResolvedContentLayout {
  cardRect: Rect;
  cardState: CardLayoutState;
  contentHeight: number;
  naturalCardHeight: number;
  preferredCardHeight: number;
  spacing: ResolvedSpacing;
  metrics: LayoutMetrics;
  headerRect: Rect;
  headerMeta: ResolvedHeaderMeta;
  scenarioRect: Rect;
  questionTextRect: Rect;
  questionRect: Rect;
  questionDividerRect: Rect;
  mediaRect?: Rect | undefined;
  answersRect: Rect;
  answerRects: Readonly<Record<AnswerKey, Rect>>;
  answerBoxHeight: number;
  answerFontSize: number;
}

type SpacingKey = keyof ResolvedSpacing;

interface SpacingRule {
  key: SpacingKey;
  min: number;
  preferred: number;
  max: number;
  weight: number;
}

const ANSWER_KEYS: readonly AnswerKey[] = ["A", "B", "C", "D"];
const DISTRIBUTION_TOLERANCE = 0.001;

export function calculateGridHeight(
  rows: number,
  boxHeight: number,
  rowGap: number,
): number {
  if (rows <= 0) return 0;
  return rows * boxHeight + (rows - 1) * rowGap;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function sumRules(
  rules: readonly SpacingRule[],
  field: "min" | "preferred" | "max",
): number {
  return rules.reduce((sum, rule) => sum + rule[field], 0);
}

function createSpacingRules(
  card: CardData,
  layout: LayoutTokens,
): readonly SpacingRule[] {
  const common: SpacingRule[] = [
    { key: "topPadding", ...layout.spacing.topPadding },
    { key: "headerToScenario", ...layout.spacing.headerToScenario },
    { key: "scenarioToQuestion", ...layout.spacing.scenarioToQuestion },
    { key: "questionToDivider", ...layout.spacing.questionToDivider },
  ];

  if (card.media !== undefined) {
    common.push(
      { key: "dividerToMedia", ...layout.spacing.dividerToMedia },
      { key: "mediaToAnswers", ...layout.spacing.mediaToAnswers },
    );
  } else {
    common.push({
      key: "dividerToAnswers",
      ...layout.spacing.dividerToAnswersWithoutMedia,
    });
  }

  common.push(
    { key: "answersToBottom", ...layout.spacing.answersToBottom },
  );
  return common;
}

function distributeWithinBounds(
  values: Map<SpacingKey, number>,
  rules: readonly SpacingRule[],
  available: number,
  upperField: "preferred" | "max",
): number {
  let remaining = available;
  let active = rules.filter((rule) => (
    (values.get(rule.key) ?? rule.min) < rule[upperField]
  ));

  while (remaining > DISTRIBUTION_TOLERANCE && active.length > 0) {
    const totalWeight = active.reduce((sum, rule) => sum + rule.weight, 0);
    let distributed = 0;

    for (const rule of active) {
      const current = values.get(rule.key) ?? rule.min;
      const capacity = rule[upperField] - current;
      const share = remaining * (rule.weight / totalWeight);
      const addition = Math.min(capacity, share);
      values.set(rule.key, current + addition);
      distributed += addition;
    }

    if (distributed <= DISTRIBUTION_TOLERANCE) break;
    remaining -= distributed;
    active = active.filter((rule) => (
      (values.get(rule.key) ?? rule.min)
        < rule[upperField] - DISTRIBUTION_TOLERANCE
    ));
  }

  return remaining;
}

function distributeSpacing(
  totalHeight: number,
  rules: readonly SpacingRule[],
): { spacing: ResolvedSpacing; unused: number } {
  const minimumTotal = sumRules(rules, "min");
  const preferredTotal = sumRules(rules, "preferred");
  const maximumTotal = sumRules(rules, "max");
  if (totalHeight < minimumTotal - DISTRIBUTION_TOLERANCE) {
    throw new Error(
      `Vertical spacing is ${(minimumTotal - totalHeight).toFixed(2)}px short of its safe minimum`,
    );
  }
  if (totalHeight > maximumTotal + DISTRIBUTION_TOLERANCE) {
    throw new Error(
      `Adaptive spacing capacity is ${(totalHeight - maximumTotal).toFixed(2)}px short of the selected card height`,
    );
  }

  const values = new Map<SpacingKey, number>();
  let remaining: number;
  if (totalHeight >= preferredTotal) {
    for (const rule of rules) values.set(rule.key, rule.preferred);
    remaining = distributeWithinBounds(
      values,
      rules,
      totalHeight - preferredTotal,
      "max",
    );
  } else {
    for (const rule of rules) values.set(rule.key, rule.min);
    remaining = distributeWithinBounds(
      values,
      rules,
      totalHeight - minimumTotal,
      "preferred",
    );
  }

  if (remaining > DISTRIBUTION_TOLERANCE) {
    throw new Error(
      `Adaptive spacing distribution left ${remaining.toFixed(2)}px unresolved`,
    );
  }

  return {
    spacing: {
      topPadding: values.get("topPadding") ?? 0,
      headerToScenario: values.get("headerToScenario") ?? 0,
      scenarioToQuestion: values.get("scenarioToQuestion") ?? 0,
      questionToDivider: values.get("questionToDivider") ?? 0,
      dividerToMedia: values.get("dividerToMedia") ?? 0,
      mediaToAnswers: values.get("mediaToAnswers") ?? 0,
      dividerToAnswers: values.get("dividerToAnswers") ?? 0,
      answersToBottom: values.get("answersToBottom") ?? 0,
    },
    unused: Math.max(0, remaining),
  };
}

function fitSingleLineFontSize(
  context: SKRSContext2D,
  text: string,
  maximumWidth: number,
  fontFamily: string,
  fontWeight: number,
  initialFontSize: number,
  minimumFontSize: number,
): number {
  for (let fontSize = initialFontSize; fontSize >= minimumFontSize; fontSize -= 1) {
    context.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
    if (context.measureText(text).width <= maximumWidth) return fontSize;
  }
  throw new Error(
    `Category "${text}" does not fit on one line at minimum font size ${minimumFontSize}px`,
  );
}

function calculateAnswerRect(
  index: number,
  answersRect: Rect,
  columns: number,
  columnGap: number,
  rowGap: number,
  boxWidth: number,
  boxHeight: number,
): Rect {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: answersRect.x + column * (boxWidth + columnGap),
    y: answersRect.y + row * (boxHeight + rowGap),
    width: boxWidth,
    height: boxHeight,
  };
}

function resolveCardState(
  cardHeight: number,
  layout: LayoutTokens,
): CardLayoutState {
  if (cardHeight <= layout.card.minHeight + DISTRIBUTION_TOLERANCE) return "MIN";
  if (cardHeight <= layout.card.preferredHeight + DISTRIBUTION_TOLERANCE) {
    return "MEDIUM";
  }
  return "MAX";
}

function resolveMediaHeight(
  card: CardData,
  contentWidth: number,
  layout: LayoutTokens,
  mediaDimensions?: MediaDimensions,
): number {
  if (card.media === undefined) return 0;
  if (
    (card.media.fit ?? "contain") !== "contain"
    || mediaDimensions === undefined
    || mediaDimensions.width <= 0
    || mediaDimensions.height <= 0
  ) {
    return layout.media.preferredHeight;
  }

  const drawableWidth = contentWidth - layout.media.innerPadding * 2;
  const intrinsicHeight = (
    drawableWidth * (mediaDimensions.height / mediaDimensions.width)
    + layout.media.innerPadding * 2
  );
  return clamp(
    intrinsicHeight,
    layout.media.minHeight,
    layout.media.maxHeight,
  );
}

export function resolveLayout(
  context: SKRSContext2D,
  card: CardData,
  layout: LayoutTokens = LAYOUT,
  mediaDimensions?: MediaDimensions,
): ResolvedContentLayout {
  const cardX = (layout.stage.width - layout.card.width) / 2;
  const contentX = cardX + layout.card.paddingX;
  const contentWidth = layout.card.width - layout.card.paddingX * 2;
  const headerHeight = Math.max(
    layout.header.contentHeight,
    layout.category.badgeHeight,
    layout.headerMeta.mascotBoxSize,
  );

  const scenarioFitted = fitTextToBox(context, card.scenario, {
    maxWidth: contentWidth,
    maxHeight: layout.question.scenarioHeight,
    fontFamily: layout.typography.family,
    fontWeight: layout.typography.scenarioWeight,
    initialFontSize: layout.question.scenarioInitialSize,
    minimumFontSize: layout.question.scenarioMinimumSize,
    lineHeight: layout.question.scenarioLineHeight,
    alignment: layout.question.alignment,
  });
  const questionFitted = fitTextToBox(context, card.question, {
    maxWidth: contentWidth,
    maxHeight: layout.question.questionHeight,
    fontFamily: layout.typography.family,
    fontWeight: layout.typography.questionWeight,
    initialFontSize: layout.question.questionInitialSize,
    minimumFontSize: layout.question.questionMinimumSize,
    lineHeight: layout.question.questionLineHeight,
    alignment: layout.question.alignment,
  });
  const mediaHeight = resolveMediaHeight(
    card,
    contentWidth,
    layout,
    mediaDimensions,
  );
  const spacingRules = createSpacingRules(card, layout);
  const minimumSpacingHeight = sumRules(spacingRules, "min");
  const preferredSpacingHeight = sumRules(spacingRules, "preferred");

  const columns = layout.answers.columns;
  const rows = layout.answers.rows;
  const columnGap = layout.answers.columnGap;
  const rowGap = layout.answers.rowGap;
  if (columns <= 0 || rows <= 0) {
    throw new Error("Answer grid must have positive row and column counts");
  }
  if (columns * rows < ANSWER_KEYS.length) {
    throw new Error(
      `Answer grid has ${columns * rows} cells but requires ${ANSWER_KEYS.length}`,
    );
  }

  const boxWidth = (
    contentWidth - Math.max(0, columns - 1) * columnGap
  ) / columns;
  const textWidth = (
    boxWidth
    - layout.answers.labelLeft
    - layout.answers.labelDiameter
    - layout.answers.labelTextGap
    - layout.answers.paddingRight
  );
  const verticalPadding = (
    layout.answers.paddingTop + layout.answers.paddingBottom
  );
  const fixedBlockHeightWithoutAnswers = (
    headerHeight
    + scenarioFitted.height
    + questionFitted.height
    + mediaHeight
    + layout.questionDivider.height
  );

  let resolvedFontSize: number | undefined;
  let resolvedBoxHeight: number | undefined;
  let minimumRequiredHeight: number | undefined;
  let preferredCardHeight: number | undefined;

  for (
    let fontSize = layout.answers.initialFontSize;
    fontSize >= layout.answers.minimumFontSize;
    fontSize -= 1
  ) {
    let maxTextHeight = 0;
    for (const key of ANSWER_KEYS) {
      const wrapped = wrapText(context, card.answers[key], {
        maxWidth: textWidth,
        fontFamily: layout.typography.family,
        fontWeight: layout.typography.answerWeight,
        fontSize,
      });
      maxTextHeight = Math.max(
        maxTextHeight,
        wrapped.lines.length * fontSize * layout.answers.lineHeight,
      );
    }

    const calculatedBoxHeight = Math.max(
      layout.answers.minBoxHeight,
      Math.ceil(maxTextHeight + verticalPadding),
    );
    const gridHeight = calculateGridHeight(rows, calculatedBoxHeight, rowGap);
    const fixedContentHeight = fixedBlockHeightWithoutAnswers + gridHeight;
    const candidateMinimumHeight = fixedContentHeight + minimumSpacingHeight;

    if (
      calculatedBoxHeight <= layout.answers.maxBoxHeight
      && candidateMinimumHeight <= layout.card.maxHeight
    ) {
      resolvedFontSize = fontSize;
      resolvedBoxHeight = calculatedBoxHeight;
      minimumRequiredHeight = candidateMinimumHeight;
      preferredCardHeight = fixedContentHeight + preferredSpacingHeight;
      break;
    }
  }

  if (
    resolvedFontSize === undefined
    || resolvedBoxHeight === undefined
    || minimumRequiredHeight === undefined
    || preferredCardHeight === undefined
  ) {
    throw new Error(
      `Answer text does not fit within maximum card height ${layout.card.maxHeight}px at minimum font size ${layout.answers.minimumFontSize}px for card ${card.id}`,
    );
  }

  const answersGridHeight = calculateGridHeight(
    rows,
    resolvedBoxHeight,
    rowGap,
  );
  const contentHeight = fixedBlockHeightWithoutAnswers + answersGridHeight;
  const cardHeight = clamp(
    Math.max(minimumRequiredHeight, preferredCardHeight),
    layout.card.minHeight,
    layout.card.maxHeight,
  );
  const cardY = (layout.stage.height - cardHeight) / 2;
  const cardRect: Rect = {
    x: cardX,
    y: cardY,
    width: layout.card.width,
    height: cardHeight,
  };
  const distributed = distributeSpacing(
    cardHeight - contentHeight,
    spacingRules,
  );
  const spacing = distributed.spacing;

  const headerRect: Rect = {
    x: contentX,
    y: cardRect.y + spacing.topPadding,
    width: contentWidth,
    height: headerHeight,
  };
  const categoryLabel = card.category.toLocaleUpperCase("tr-TR");
  const maximumCategoryWidth = (
    contentWidth
    - layout.headerMeta.mascotBoxSize
    - layout.headerMeta.rightStackGap
  );
  const maximumCategoryTextWidth = (
    maximumCategoryWidth - layout.category.paddingX * 2
  );
  const categoryFontSize = fitSingleLineFontSize(
    context,
    categoryLabel,
    maximumCategoryTextWidth,
    layout.typography.family,
    layout.typography.categoryWeight,
    layout.typography.categorySize,
    layout.category.minimumFontSize,
  );
  context.font = (
    `${layout.typography.categoryWeight} `
    + `${categoryFontSize}px `
    + `"${layout.typography.family}"`
  );
  const categoryWidth = Math.min(
    maximumCategoryWidth,
    Math.max(
      layout.category.minimumWidth,
      context.measureText(categoryLabel).width + layout.category.paddingX * 2,
    ),
  );
  const difficultyMascotRect: Rect = {
    x: headerRect.x + layout.headerMeta.mascotOffsetX,
    y: (
      headerRect.y
      + (headerRect.height - layout.headerMeta.mascotBoxSize) / 2
      + layout.headerMeta.mascotOffsetY
    ),
    width: layout.headerMeta.mascotBoxSize,
    height: layout.headerMeta.mascotBoxSize,
  };
  const categoryBadgeRect: Rect = {
    x: headerRect.x + headerRect.width - categoryWidth,
    y: headerRect.y,
    width: categoryWidth,
    height: layout.category.badgeHeight,
  };
  const categorySeparatorWidth = clamp(
    categoryBadgeRect.width * layout.headerMeta.separatorWidthRatio,
    layout.headerMeta.separatorMinWidth,
    layout.headerMeta.separatorMaxWidth,
  );
  const cardIdRect: Rect = {
    x: categoryBadgeRect.x,
    y: (
      categoryBadgeRect.y
      + categoryBadgeRect.height
      - layout.headerMeta.cardIdBottomPadding
      - layout.headerMeta.cardIdFontSize
    ),
    width: categoryBadgeRect.width,
    height: layout.headerMeta.cardIdFontSize,
  };
  const categorySeparatorRect: Rect = {
    x: (
      categoryBadgeRect.x
      + (categoryBadgeRect.width - categorySeparatorWidth) / 2
    ),
    y: (
      cardIdRect.y
      - layout.headerMeta.separatorToIdGap
      - layout.headerMeta.separatorHeight
    ),
    width: categorySeparatorWidth,
    height: layout.headerMeta.separatorHeight,
  };
  const categoryLabelBottom = (
    categoryBadgeRect.y + layout.category.labelHeight
  );
  if (
    categorySeparatorRect.y
      < categoryLabelBottom + layout.headerMeta.categoryToSeparatorGap
  ) {
    throw new Error("Header category metadata does not fit inside its badge");
  }
  const cardIdBottom = cardIdRect.y + cardIdRect.height;
  const categoryBadgeInnerBottom = (
    categoryBadgeRect.y
    + categoryBadgeRect.height
    - layout.headerMeta.cardIdBottomPadding
  );
  if (cardIdBottom > categoryBadgeInnerBottom) {
    throw new Error(
      `Header card ID exceeds its badge by ${(cardIdBottom - categoryBadgeInnerBottom).toFixed(2)}px`,
    );
  }

  const scenarioRect: Rect = {
    x: contentX,
    y: headerRect.y + headerRect.height + spacing.headerToScenario,
    width: contentWidth,
    height: scenarioFitted.height,
  };
  const questionTextRect: Rect = {
    x: contentX,
    y: scenarioRect.y + scenarioRect.height + spacing.scenarioToQuestion,
    width: contentWidth,
    height: questionFitted.height,
  };
  const questionRect: Rect = {
    x: contentX,
    y: scenarioRect.y,
    width: contentWidth,
    height: (
      scenarioRect.height
      + spacing.scenarioToQuestion
      + questionTextRect.height
    ),
  };

  const questionDividerRect: Rect = {
    x: contentX,
    y: (
      questionTextRect.y
      + questionTextRect.height
      + spacing.questionToDivider
    ),
    width: contentWidth,
    height: layout.questionDivider.height,
  };

  let mediaRect: Rect | undefined;
  let currentY = questionDividerRect.y + questionDividerRect.height;
  if (card.media !== undefined) {
    mediaRect = {
      x: contentX,
      y: currentY + spacing.dividerToMedia,
      width: contentWidth,
      height: mediaHeight,
    };
    currentY = mediaRect.y + mediaRect.height;
  }

  const answersRect: Rect = {
    x: contentX,
    y: (
      currentY
      + (
        card.media === undefined
          ? spacing.dividerToAnswers
          : spacing.mediaToAnswers
      )
    ),
    width: contentWidth,
    height: answersGridHeight,
  };
  const answerRects: Readonly<Record<AnswerKey, Rect>> = {
    A: calculateAnswerRect(
      0,
      answersRect,
      columns,
      columnGap,
      rowGap,
      boxWidth,
      resolvedBoxHeight,
    ),
    B: calculateAnswerRect(
      1,
      answersRect,
      columns,
      columnGap,
      rowGap,
      boxWidth,
      resolvedBoxHeight,
    ),
    C: calculateAnswerRect(
      2,
      answersRect,
      columns,
      columnGap,
      rowGap,
      boxWidth,
      resolvedBoxHeight,
    ),
    D: calculateAnswerRect(
      3,
      answersRect,
      columns,
      columnGap,
      rowGap,
      boxWidth,
      resolvedBoxHeight,
    ),
  };

  const resolvedBottom = (
    answersRect.y + answersRect.height + spacing.answersToBottom
  );
  const cardBottom = cardRect.y + cardRect.height;
  if (Math.abs(resolvedBottom - cardBottom) > DISTRIBUTION_TOLERANCE) {
    throw new Error(
      `Resolved content for card ${card.id} ends at ${resolvedBottom.toFixed(2)}px instead of card bottom ${cardBottom.toFixed(2)}px`,
    );
  }

  const metrics: LayoutMetrics = {
    cardHeight,
    cardY,
    topPadding: spacing.topPadding,
    headerHeight,
    headerToScenarioGap: spacing.headerToScenario,
    scenarioHeight: scenarioRect.height,
    scenarioToQuestionGap: spacing.scenarioToQuestion,
    questionHeight: questionTextRect.height,
    questionToDividerGap: spacing.questionToDivider,
    dividerToMediaGap: mediaRect === undefined
      ? undefined
      : spacing.dividerToMedia,
    mediaHeight: mediaRect?.height,
    mediaToAnswersGap: mediaRect === undefined
      ? undefined
      : spacing.mediaToAnswers,
    dividerToAnswersGap: mediaRect === undefined
      ? spacing.dividerToAnswers
      : undefined,
    answerGridHeight: answersRect.height,
    answersToBottomGap: spacing.answersToBottom,
    answerFontSize: resolvedFontSize,
    unusedFlexibleSpace: distributed.unused,
  };

  return {
    cardRect,
    cardState: resolveCardState(cardHeight, layout),
    contentHeight,
    naturalCardHeight: minimumRequiredHeight,
    preferredCardHeight,
    spacing,
    metrics,
    headerRect,
    headerMeta: {
      difficultyMascotRect,
      categoryBadgeRect,
      categorySeparatorRect,
      cardIdRect,
      categoryFontSize,
    },
    scenarioRect,
    questionTextRect,
    questionRect,
    questionDividerRect,
    mediaRect,
    answersRect,
    answerRects,
    answerBoxHeight: resolvedBoxHeight,
    answerFontSize: resolvedFontSize,
  };
}
