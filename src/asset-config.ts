export interface FontAssetConfig {
  family: string;
  files: readonly [
    { path: string; weight: 400 },
    { path: string; weight: 500 },
    { path: string; weight: 600 },
    { path: string; weight: 700 },
  ];
}

export interface GlobalAssetConfig {
  fonts: FontAssetConfig;
  outerPatternPath: string;
  innerPatternPath: string;
  paperTexturePath: string;
  difficultySpritePath: string;
}

const DEFAULT_ASSETS: GlobalAssetConfig = {
  fonts: {
    family: "Atkinson Hyperlegible Next",
    files: [
      {
        path: "assets/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext-Regular.ttf",
        weight: 400,
      },
      {
        path: "assets/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext-Medium.ttf",
        weight: 500,
      },
      {
        path: "assets/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext-SemiBold.ttf",
        weight: 600,
      },
      {
        path: "assets/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext-Bold.ttf",
        weight: 700,
      },
    ],
  },
  outerPatternPath: "assets/patterns/fox-username-pattern.png",
  innerPatternPath: "assets/patterns/card-inner-geometric-pattern.png",
  paperTexturePath: "assets/patterns/paper-texture.svg",
  difficultySpritePath: "assets/icons/fox-difficulty-sprite.png",
};

function readValue(
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: string,
): string {
  const configured = environment[key]?.trim();
  return configured === undefined || configured.length === 0
    ? fallback
    : configured;
}

export function getAssetConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GlobalAssetConfig {
  return {
    fonts: {
      family: readValue(
        environment,
        "FONT_FAMILY",
        DEFAULT_ASSETS.fonts.family,
      ),
      files: [
        {
          path: readValue(
            environment,
            "FONT_REGULAR_PATH",
            DEFAULT_ASSETS.fonts.files[0].path,
          ),
          weight: 400,
        },
        {
          path: readValue(
            environment,
            "FONT_MEDIUM_PATH",
            DEFAULT_ASSETS.fonts.files[1].path,
          ),
          weight: 500,
        },
        {
          path: readValue(
            environment,
            "FONT_SEMIBOLD_PATH",
            DEFAULT_ASSETS.fonts.files[2].path,
          ),
          weight: 600,
        },
        {
          path: readValue(
            environment,
            "FONT_BOLD_PATH",
            DEFAULT_ASSETS.fonts.files[3].path,
          ),
          weight: 700,
        },
      ],
    },
    outerPatternPath: readValue(
      environment,
      "ASSET_OUTER_PATTERN",
      DEFAULT_ASSETS.outerPatternPath,
    ),
    innerPatternPath: readValue(
      environment,
      "ASSET_INNER_PATTERN",
      DEFAULT_ASSETS.innerPatternPath,
    ),
    paperTexturePath: readValue(
      environment,
      "ASSET_PAPER_TEXTURE",
      DEFAULT_ASSETS.paperTexturePath,
    ),
    difficultySpritePath: readValue(
      environment,
      "ASSET_DIFFICULTY_SPRITE",
      DEFAULT_ASSETS.difficultySpritePath,
    ),
  };
}
