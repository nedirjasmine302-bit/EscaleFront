// La fonction filterByType
import { test, expect } from "vitest";
import { filterByType } from "../modules/filters.js";

const destinations = [
  { id: 1, name: "Santorin", type: "plage" },
  { id: 2, name: "Chamonix", type: "montagne" },
  { id: 3, name: "Kyoto", type: "ville" },
  { id: 4, name: "Bora Bora", type: "plage" }
];

test("filterByType renvoie toutes les destinations quand le type est 'all'", () => {
  const result = filterByType(destinations, "all");
  expect(result).toHaveLength(4);
});

test("filterByType ne renvoie que les destinations du type demandé", () => {
  const result = filterByType(destinations, "plage");
  expect(result).toHaveLength(2);
  expect(result.every((d) => d.type === "plage")).toBe(true);
});

test("filterByType renvoie une liste vide si aucun type ne correspond", () => {
  const result = filterByType(destinations, "nature");
  expect(result).toHaveLength(0);
});
