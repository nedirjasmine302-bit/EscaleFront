// La fonction isContactFormValid
import { test, expect } from "vitest";
import { isContactFormValid } from "../src/contact.js";

const valid = {
  type: "contact",
  name: "Jean",
  email: "jean@mail.fr",
  phone: "",
  message: "Bonjour, je voudrais des informations sur vos offres de voyage."
};

test("formulaire valide quand tous les champs requis sont bons", () => {
  expect(isContactFormValid(valid)).toBe(true);
});

test("type non choisi : invalide", () => {
  expect(isContactFormValid({ ...valid, type: "" })).toBe(false);
});

test("nom de moins de 2 caractères : invalide", () => {
  expect(isContactFormValid({ ...valid, name: "J" })).toBe(false);
});

test("email au mauvais format : invalide", () => {
  expect(isContactFormValid({ ...valid, email: "pas-un-email" })).toBe(false);
});

test("message de moins de 30 caractères : invalide", () => {
  expect(isContactFormValid({ ...valid, message: "Trop court" })).toBe(false);
});

test("téléphone facultatif, mais rejeté s'il est mal formaté", () => {
  expect(isContactFormValid({ ...valid, phone: "123" })).toBe(false);
  expect(isContactFormValid({ ...valid, phone: "06 12 34 56 78" })).toBe(true);
});
