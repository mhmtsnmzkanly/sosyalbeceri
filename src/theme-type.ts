export interface CardTheme {
  canvasBackground: string;
  cardBackground: string;
  primary: string;
  primarySoft: string;
  text: string;
  mutedText: string;
  border: string;
  answerBorder: string;
  divider: string;
  patternFallback: string;
  mediaBackground: string;
  shadow: string;
  contactShadow: string;
  white: string;
}

const DEFAULT_THEME: CardTheme = {
  canvasBackground: "#F5F2EC",
  cardBackground: "#FFFDF9",
  primary: "#1557B0",
  primarySoft: "#E7EFFA",
  text: "#142033",
  mutedText: "#7D8794",
  border: "#1557B0",
  answerBorder: "#6799CF",
  divider: "#B8CEE5",
  patternFallback: "#6E91B8",
  mediaBackground: "#F3F6FA",
  shadow: "rgba(22, 55, 94, 0.14)",
  contactShadow: "rgba(22, 55, 94, 0.07)",
  white: "#FFFFFF",
};

const THEME_ENV_KEYS = {
  canvasBackground: "THEME_CANVAS_BACKGROUND",
  cardBackground: "THEME_CARD_BACKGROUND",
  primary: "THEME_PRIMARY",
  primarySoft: "THEME_PRIMARY_SOFT",
  text: "THEME_TEXT",
  mutedText: "THEME_MUTED_TEXT",
  border: "THEME_BORDER",
  answerBorder: "THEME_ANSWER_BORDER",
  divider: "THEME_DIVIDER",
  patternFallback: "THEME_PATTERN_FALLBACK",
  mediaBackground: "THEME_MEDIA_BACKGROUND",
  shadow: "THEME_SHADOW",
  contactShadow: "THEME_CONTACT_SHADOW",
  white: "THEME_WHITE",
} as const satisfies Record<keyof CardTheme, string>;

function readThemeValue(
  environment: NodeJS.ProcessEnv,
  key: keyof CardTheme,
): string {
  const configured = environment[THEME_ENV_KEYS[key]]?.trim();
  return configured === undefined || configured.length === 0
    ? DEFAULT_THEME[key]
    : configured;
}

export function getTheme(
  environment: NodeJS.ProcessEnv = process.env,
): CardTheme {
  return {
    canvasBackground: readThemeValue(environment, "canvasBackground"),
    cardBackground: readThemeValue(environment, "cardBackground"),
    primary: readThemeValue(environment, "primary"),
    primarySoft: readThemeValue(environment, "primarySoft"),
    text: readThemeValue(environment, "text"),
    mutedText: readThemeValue(environment, "mutedText"),
    border: readThemeValue(environment, "border"),
    answerBorder: readThemeValue(environment, "answerBorder"),
    divider: readThemeValue(environment, "divider"),
    patternFallback: readThemeValue(environment, "patternFallback"),
    mediaBackground: readThemeValue(environment, "mediaBackground"),
    shadow: readThemeValue(environment, "shadow"),
    contactShadow: readThemeValue(environment, "contactShadow"),
    white: readThemeValue(environment, "white"),
  };
}
