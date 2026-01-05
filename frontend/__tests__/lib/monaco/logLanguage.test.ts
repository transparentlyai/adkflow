import { describe, it, expect } from "vitest";
import {
  logLanguageConfig,
  logLanguageDefinition,
} from "@/lib/monaco/logLanguage";

describe("logLanguage", () => {
  describe("logLanguageConfig", () => {
    it("should have line comment configuration", () => {
      expect(logLanguageConfig.comments?.lineComment).toBe("#");
    });

    it("should have bracket pairs", () => {
      expect(logLanguageConfig.brackets).toEqual([
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ]);
    });

    it("should have auto closing pairs", () => {
      expect(logLanguageConfig.autoClosingPairs).toHaveLength(5);
      expect(logLanguageConfig.autoClosingPairs).toContainEqual({
        open: "{",
        close: "}",
      });
      expect(logLanguageConfig.autoClosingPairs).toContainEqual({
        open: '"',
        close: '"',
      });
    });

    it("should have surrounding pairs", () => {
      expect(logLanguageConfig.surroundingPairs).toHaveLength(5);
    });

    it("should have folding markers", () => {
      expect(logLanguageConfig.folding?.markers).toBeDefined();
      expect(logLanguageConfig.folding?.markers?.start).toBeDefined();
      expect(logLanguageConfig.folding?.markers?.end).toBeDefined();
    });
  });

  describe("logLanguageDefinition", () => {
    it("should have empty default token", () => {
      expect(logLanguageDefinition.defaultToken).toBe("");
    });

    it("should have .log token postfix", () => {
      expect(logLanguageDefinition.tokenPostfix).toBe(".log");
    });

    it("should have tokenizer rules", () => {
      expect(logLanguageDefinition.tokenizer).toBeDefined();
      expect(logLanguageDefinition.tokenizer.root).toBeDefined();
      expect(Array.isArray(logLanguageDefinition.tokenizer.root)).toBe(true);
    });

    it("should have JSON object tokenizer state", () => {
      expect(logLanguageDefinition.tokenizer.jsonObject).toBeDefined();
      expect(Array.isArray(logLanguageDefinition.tokenizer.jsonObject)).toBe(
        true,
      );
    });

    it("should have JSON array tokenizer state", () => {
      expect(logLanguageDefinition.tokenizer.jsonArray).toBeDefined();
      expect(Array.isArray(logLanguageDefinition.tokenizer.jsonArray)).toBe(
        true,
      );
    });

    it("should have multiple root tokenizer rules", () => {
      expect(logLanguageDefinition.tokenizer.root.length).toBeGreaterThan(10);
    });

    it("should have log level tokens in root", () => {
      const rootRules = logLanguageDefinition.tokenizer.root;
      const hasErrorRule = rootRules.some(
        (rule) =>
          Array.isArray(rule) &&
          typeof rule[1] === "string" &&
          rule[1] === "log.error",
      );
      expect(hasErrorRule).toBe(true);
    });
  });
});
