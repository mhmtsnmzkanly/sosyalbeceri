export const STAGE = { width: 1080, height: 1920 } as const;

export const SAFE_AREA = { top: 100, right: 78, bottom: 130, left: 78 } as const;

export const CARD_LAYOUT = {
  width: 872,
  minHeight: 1250,
  preferredHeight: 1500,
  maxHeight: 1740,
  radius: 34,
  borderWidth: 7,
  paddingX: 48,
  minTopPadding: 46,
  maxTopPadding: 46,
  minBottomPadding: 38,
  maxBottomPadding: 60,
  shadowBlur: 34,
  shadowOffsetX: 0,
  shadowOffsetY: 14,
  contactShadowEnabled: false,
  contactShadowBlur: 8,
  contactShadowOffsetX: 0,
  contactShadowOffsetY: 3,
} as const;


export const SECTIONS = {
  headerHeight: 100,
  categoryHeight: 64,
  questionHeight: 232,
  answersHeight: 570,
} as const;

export const HEADER = {
  contentHeight: 86,
} as const;

export const HEADER_META = {
  defaultDifficulty: 1,
  mascotBoxSize: 52,
  mascotVisibleSize: 72,
  mascotOffsetX: -10,
  mascotOffsetY: -12,
  rightStackGap: 24,
  categoryToSeparatorGap: 5,
  separatorToIdGap: 5,
  separatorHeight: 2,
  separatorWidthRatio: 0.8,
  separatorMinWidth: 54,
  separatorMaxWidth: 120,
  separatorOpacity: 0.25,
  cardIdFontSize: 18,
  cardIdWeight: 600,
  cardIdBottomPadding: 10,
  difficultyFrames: [
    { x: 217, y: 405, width: 230, height: 261 },
    { x: 477, y: 432, width: 235, height: 238 },
    { x: 746, y: 432, width: 236, height: 240 },
    { x: 1013, y: 405, width: 249, height: 271 },
  ],
} as const;

export const CATEGORY = {
  badgeHeight: 86,
  labelHeight: 46,
  badgeRadius: 26,
  paddingX: 28,
  estimatedCharacterWidth: 13,
  minimumWidth: 220,
  minimumFontSize: 17,
  baselineOffset: 32,
} as const;

export const QUESTION = {
  alignment: "center",
  scenarioHeight: 140,
  questionHeight: 134,
  scenarioInitialSize: 31,
  scenarioMinimumSize: 25,
  scenarioLineHeight: 1.32,
  questionInitialSize: 42,
  questionMinimumSize: 33,
  questionLineHeight: 1.16,
} as const;

export const MEDIA = {
  minHeight: 340,
  preferredHeight: 390,
  maxHeight: 460,
  radius: 26,
  innerPadding: 8,
} as const;

export const ANSWER_GRID = {
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
} as const;


export const QUESTION_DIVIDER = {
  height: 2,
  strokeWidth: 1.5,
  lineWidth: 76,
  centerGap: 20,
} as const;

export const VERTICAL_SPACING = {
  topPadding: {
    min: CARD_LAYOUT.minTopPadding,
    preferred: 46,
    max: CARD_LAYOUT.maxTopPadding,
    weight: 0.5,
  },
  headerToScenario: {
    min: 18,
    preferred: 22,
    max: 120,
    weight: 0.65,
  },
  scenarioToQuestion: {
    min: 12,
    preferred: 14,
    max: 24,
    weight: 0.55,
  },
  questionToDivider: {
    min: 18,
    preferred: 20,
    max: 36,
    weight: 0.7,
  },
  dividerToMedia: {
    min: 18,
    preferred: 20,
    max: 42,
    weight: 0.8,
  },
  mediaToAnswers: {
    min: 30,
    preferred: 38,
    max: 72,
    weight: 1.2,
  },
  dividerToAnswersWithoutMedia: {
    min: 40,
    preferred: 62,
    max: 120,
    weight: 1,
  },
  answersToBottom: {
    min: 78,
    preferred: 82,
    max: 380,
    weight: 0.45,
  },
} as const;

export const TYPOGRAPHY = {
  family: "Atkinson Hyperlegible Next",
  regularWeight: 400,
  mediumWeight: 500,
  headerSize: 28,
  headerWeight: 700,
  categorySize: 21,
  categoryWeight: 700,
  scenarioWeight: 600,
  questionWeight: 700,
  answerLabelSize: 28,
  answerLabelWeight: 700,
  answerWeight: 400,
} as const;

export const PATTERN = {
  outerOpacity: 0.22,
  innerGeometricOpacity: 0.054,
  paperTextureOpacity: 0.45,
} as const;

export const LAYOUT = {
  stage: STAGE,
  safeArea: SAFE_AREA,
  card: CARD_LAYOUT,
  sections: SECTIONS,
  header: HEADER,
  headerMeta: HEADER_META,
  category: CATEGORY,
  question: QUESTION,
  media: MEDIA,
  answers: ANSWER_GRID,
  questionDivider: QUESTION_DIVIDER,
  spacing: VERTICAL_SPACING,
  typography: TYPOGRAPHY,
  pattern: PATTERN,
} as const;


type WidenLiterals<T> = T extends CanvasTextAlign
  ? CanvasTextAlign
  : T extends string
    ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : { [Key in keyof T]: WidenLiterals<T[Key]> };

export type LayoutTokens = WidenLiterals<typeof LAYOUT>;
