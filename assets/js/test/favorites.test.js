// La fonction removeFavoriteById
import { test, expect } from "vitest";
import { removeFavoriteById } from "../src/favorites.js";

const favorites = [
  { id: 1, name: "Santorin" },
  { id: 2, name: "Kyoto" },
  { id: 3, name: "Chamonix" }
];

test("removeFavoriteById retire la destination correspondante", () => {
  const result = removeFavoriteById(favorites, 2);
  expect(result).toHaveLength(2);
  expect(result.some((d) => d.id === 2)).toBe(false);
});

test("removeFavoriteById laisse la liste inchangée si l'id est absent", () => {
  const result = removeFavoriteById(favorites, 999);
  expect(result).toHaveLength(3);
});
