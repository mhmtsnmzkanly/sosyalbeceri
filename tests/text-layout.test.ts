import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { calculateSharedAnswerFontSize } from "../src/draw/answers.js";
import { fitTextToBox } from "../src/text/fit-text.js";
import { wrapText } from "../src/text/wrap-text.js";

const context = createCanvas(600, 600).getContext("2d");

test("wrapText keeps Turkish text within the maximum width", () => {
  const wrapped = wrapText(context, "Şarjım yüzde doksan dokuz, görüşürüz.", {
    maxWidth: 170, fontFamily: "sans-serif", fontWeight: 500, fontSize: 24,
  });
  assert.ok(wrapped.lines.length > 1);
  context.font = wrapped.font;
  assert.ok(wrapped.lines.every((line) => context.measureText(line).width <= 170));
});

test("fitTextToBox reduces size until the text fits", () => {
  const fitted = fitTextToBox(context, "Uzun bir Türkçe cümle küçük bir kutuya sığmalıdır.", {
    maxWidth: 180, maxHeight: 100, fontFamily: "sans-serif", fontWeight: 500,
    initialFontSize: 30, minimumFontSize: 14, lineHeight: 1.2, alignment: "left",
  });
  assert.ok(fitted.fontSize < 30);
  assert.ok(fitted.height <= 100);
});

test("fitTextToBox throws when minimum size cannot fit", () => {
  assert.throws(() => fitTextToBox(context, "Bu metin imkânsız derecede küçük bir kutuya sığmaz.", {
    maxWidth: 40, maxHeight: 10, fontFamily: "sans-serif", fontWeight: 500,
    initialFontSize: 20, minimumFontSize: 18, lineHeight: 1.2, alignment: "left",
  }), /does not fit/);
});

test("all answers receive one shared font size", () => {
  const size = calculateSharedAnswerFontSize(context, {
    A: "Kısa.",
    B: "Bu seçenek diğerlerinden belirgin biçimde daha uzun bir cevap içeriyor.",
    C: "Orta uzunlukta cevap.",
    D: "Bir başka kısa cevap.",
  }, {
    maxWidth: 180, maxHeight: 100, fontFamily: "sans-serif", fontWeight: 500,
    initialFontSize: 28, minimumFontSize: 14, lineHeight: 1.2,
  });
  assert.ok(size < 28);
  assert.ok(size >= 14);
});
