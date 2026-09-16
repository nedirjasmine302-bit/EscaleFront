// La fonction isResetFormValid
import { test, expect } from "vitest";
import { isResetFormValid } from "../src/reset-password.js";

const valid = {
  email: "jean@mail.fr",
  temp: "Temp123!",
  password: "New123!@",
  password2: "New123!@"
};

test("formulaire valide : email, mot de passe temporaire, nouveau mot de passe fort et confirmation", () => {
  expect(isResetFormValid(valid)).toBe(true);
});

test("email invalide : invalide", () => {
  expect(isResetFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("mot de passe temporaire vide : invalide", () => {
  expect(isResetFormValid({ ...valid, temp: "" })).toBe(false);
});

test("nouveau mot de passe faible : invalide", () => {
  expect(isResetFormValid({ ...valid, password: "faible", password2: "faible" })).toBe(false);
});

test("confirmation différente : invalide", () => {
  expect(isResetFormValid({ ...valid, password2: "Autre123!" })).toBe(false);
});
