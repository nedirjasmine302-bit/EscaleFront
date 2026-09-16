// La fonction isForgotFormValid (validation du formulaire "mot de passe oublié")
import { test, expect } from "vitest";
import { isForgotFormValid } from "../src/forgot-password.js";

const valid = { email: "jean@mail.fr", pseudo: "Jean_75" };

test("formulaire valide : email correct et pseudo au bon format", () => {
  expect(isForgotFormValid(valid)).toBe(true);
});

test("email invalide : invalide", () => {
  expect(isForgotFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("pseudo hors format : invalide", () => {
  expect(isForgotFormValid({ ...valid, pseudo: "ab" })).toBe(false);
});
