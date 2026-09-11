// La fonction isSignUpFormValid
import { test, expect } from "vitest";
import { isSignUpFormValid } from "../src/sign-up.js";

const valid = {
  email: "nouveau@mail.fr",
  pseudo: "Nouveau",
  password: "Test123!",
  password2: "Test123!"
};

test("formulaire valide : email, pseudo, mot de passe fort et confirmation identique", () => {
  expect(isSignUpFormValid(valid)).toBe(true);
});

test("email au mauvais format : invalide", () => {
  expect(isSignUpFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("pseudo hors format (trop court) : invalide", () => {
  expect(isSignUpFormValid({ ...valid, pseudo: "ab" })).toBe(false);
});

test("mot de passe faible : invalide", () => {
  expect(isSignUpFormValid({ ...valid, password: "faible", password2: "faible" })).toBe(false);
});

test("confirmation différente du mot de passe : invalide", () => {
  expect(isSignUpFormValid({ ...valid, password2: "Autre123!" })).toBe(false);
});
