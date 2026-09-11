// La fonction shouldReveal
import { test, expect } from "vitest";
import { shouldReveal } from "../modules/animations.js";

test("shouldReveal révèle un élément entré dans le viewport", () => {
  const result = shouldReveal({ isIntersecting: true });
  expect(result).toBe(true);
});

test("shouldReveal ne révèle pas un élément hors du viewport", () => {
  const result = shouldReveal({ isIntersecting: false });
  expect(result).toBe(false);
});
