import assert from "node:assert/strict";
import test from "node:test";
import { getAssetConfig } from "../src/asset-config.js";
import { getTheme } from "../src/theme-type.js";

test("theme colors can be overridden through environment variables", () => {
  const theme = getTheme({
    THEME_PRIMARY: "#123456",
    THEME_SHADOW: "rgba(1, 2, 3, 0.4)",
  });

  assert.equal(theme.primary, "#123456");
  assert.equal(theme.shadow, "rgba(1, 2, 3, 0.4)");
  assert.equal(theme.cardBackground, "#FFFDF9");
});

test("font and global image assets can be overridden through environment variables", () => {
  const assets = getAssetConfig({
    FONT_FAMILY: "Custom Local Family",
    FONT_REGULAR_PATH: "assets/fonts/custom/regular.ttf",
    ASSET_OUTER_PATTERN: "assets/patterns/custom-outer.png",
    ASSET_DIFFICULTY_SPRITE: "assets/icons/custom-sprite.png",
  });

  assert.equal(assets.fonts.family, "Custom Local Family");
  assert.equal(assets.fonts.files[0].path, "assets/fonts/custom/regular.ttf");
  assert.equal(assets.fonts.files[1].weight, 500);
  assert.equal(assets.outerPatternPath, "assets/patterns/custom-outer.png");
  assert.equal(assets.difficultySpritePath, "assets/icons/custom-sprite.png");
});
