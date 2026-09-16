// La fonction isStaffFormValid
import { test, expect } from "vitest";
import { isStaffFormValid } from "../src/management.js";

const valid = {
  pseudo: "NouvelEmploye",
  email: "employe@mail.fr",
  password: "Test123!"
};

test("formulaire valide : pseudo, email et mot de passe fort", () => {
  expect(isStaffFormValid(valid)).toBe(true);
});

test("pseudo hors format : invalide", () => {
  expect(isStaffFormValid({ ...valid, pseudo: "ab" })).toBe(false);
});

test("email invalide : invalide", () => {
  expect(isStaffFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("mot de passe faible : invalide", () => {
  expect(isStaffFormValid({ ...valid, password: "faible" })).toBe(false);
});
