import { describe, it, expect } from "vitest";
import { logLightThemeRules, logLightTheme } from "@/lib/monaco/logTheme";

describe("logTheme", () => {
  describe("logLightThemeRules", () => {
    it("should be an array of theme rules", () => {
      expect(Array.isArray(logLightThemeRules)).toBe(true);
      expect(logLightThemeRules.length).toBeGreaterThan(0);
    });

    it("should have log.error rule", () => {
      const errorRule = logLightThemeRules.find(
        (rule) => rule.token === "log.error",
      );
      expect(errorRule).toBeDefined();
      expect(errorRule?.foreground).toBe("DC2626");
      expect(errorRule?.fontStyle).toBe("bold");
    });

    it("should have log.warn rule", () => {
      const warnRule = logLightThemeRules.find(
        (rule) => rule.token === "log.warn",
      );
      expect(warnRule).toBeDefined();
      expect(warnRule?.foreground).toBe("D97706");
      expect(warnRule?.fontStyle).toBe("bold");
    });

    it("should have log.info rule", () => {
      const infoRule = logLightThemeRules.find(
        (rule) => rule.token === "log.info",
      );
      expect(infoRule).toBeDefined();
      expect(infoRule?.foreground).toBe("2563EB");
    });

    it("should have log.debug rule", () => {
      const debugRule = logLightThemeRules.find(
        (rule) => rule.token === "log.debug",
      );
      expect(debugRule).toBeDefined();
      expect(debugRule?.foreground).toBe("6B7280");
    });

    it("should have log.timestamp rule", () => {
      const timestampRule = logLightThemeRules.find(
        (rule) => rule.token === "log.timestamp",
      );
      expect(timestampRule).toBeDefined();
      expect(timestampRule?.foreground).toBe("059669");
    });

    it("should have log.key rule", () => {
      const keyRule = logLightThemeRules.find(
        (rule) => rule.token === "log.key",
      );
      expect(keyRule).toBeDefined();
      expect(keyRule?.foreground).toBe("7C3AED");
    });

    it("should have log.url rule with underline", () => {
      const urlRule = logLightThemeRules.find(
        (rule) => rule.token === "log.url",
      );
      expect(urlRule).toBeDefined();
      expect(urlRule?.fontStyle).toBe("underline");
    });

    it("should have log.exception rule with italic", () => {
      const exceptionRule = logLightThemeRules.find(
        (rule) => rule.token === "log.exception",
      );
      expect(exceptionRule).toBeDefined();
      expect(exceptionRule?.fontStyle).toBe("italic");
    });

    it("should have string token rule", () => {
      const stringRule = logLightThemeRules.find(
        (rule) => rule.token === "string",
      );
      expect(stringRule).toBeDefined();
      expect(stringRule?.foreground).toBe("16A34A");
    });

    it("should have number token rule", () => {
      const numberRule = logLightThemeRules.find(
        (rule) => rule.token === "number",
      );
      expect(numberRule).toBeDefined();
      expect(numberRule?.foreground).toBe("D97706");
    });
  });

  describe("logLightTheme", () => {
    it("should have base set to vs", () => {
      expect(logLightTheme.base).toBe("vs");
    });

    it("should inherit from base theme", () => {
      expect(logLightTheme.inherit).toBe(true);
    });

    it("should use logLightThemeRules", () => {
      expect(logLightTheme.rules).toBe(logLightThemeRules);
    });

    it("should have empty colors object", () => {
      expect(logLightTheme.colors).toEqual({});
    });
  });
});
