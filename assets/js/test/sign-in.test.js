// La fonction isSignInFormValid
import { test, expect } from "vitest";
import { isSignInFormValid } from "../src/sign-in.js";

const valid = { email: "jean@mail.fr", password: "Test123!" };

test("formulaire valide : email correct et mot de passe non vide", () => {
  expect(isSignInFormValid(valid)).toBe(true);
});

test("email au mauvais format : invalide", () => {
  expect(isSignInFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("mot de passe vide : invalide", () => {
  expect(isSignInFormValid({ ...valid, password: "" })).toBe(false);
});
