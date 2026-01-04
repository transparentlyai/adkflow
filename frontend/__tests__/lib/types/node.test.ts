import { describe, it, expect } from "vitest";
import { isTypeCompatible } from "@/lib/types/node";

describe("lib/types/node", () => {
  describe("isTypeCompatible", () => {
    it("should return false when outputSource is undefined", () => {
      expect(isTypeCompatible(undefined, "str", ["*"], ["*"])).toBe(false);
    });

    it("should return false when outputSource is null", () => {
      expect(isTypeCompatible(null, "str", ["*"], ["*"])).toBe(false);
    });

    it("should return false when outputType is undefined", () => {
      expect(isTypeCompatible("prompt", undefined, ["*"], ["*"])).toBe(false);
    });

    it("should return false when outputType is null", () => {
      expect(isTypeCompatible("prompt", null, ["*"], ["*"])).toBe(false);
    });

    it("should return false when acceptedSources is undefined", () => {
      expect(isTypeCompatible("prompt", "str", undefined, ["*"])).toBe(false);
    });

    it("should return false when acceptedSources is empty", () => {
      expect(isTypeCompatible("prompt", "str", [], ["*"])).toBe(false);
    });

    it("should return false when acceptedTypes is undefined", () => {
      expect(isTypeCompatible("prompt", "str", ["*"], undefined)).toBe(false);
    });

    it("should return false when acceptedTypes is empty", () => {
      expect(isTypeCompatible("prompt", "str", ["*"], [])).toBe(false);
    });

    it("should return true when both source and type match exactly", () => {
      expect(isTypeCompatible("prompt", "str", ["prompt"], ["str"])).toBe(true);
    });

    it("should return true when acceptedSources includes the output source", () => {
      expect(
        isTypeCompatible("prompt", "str", ["agent", "prompt", "tool"], ["str"]),
      ).toBe(true);
    });

    it("should return true when acceptedTypes includes the output type", () => {
      expect(
        isTypeCompatible("prompt", "str", ["prompt"], ["int", "str", "list"]),
      ).toBe(true);
    });

    it("should return true when outputSource is wildcard", () => {
      expect(isTypeCompatible("*", "str", ["prompt"], ["str"])).toBe(true);
    });

    it("should return true when acceptedSources includes wildcard", () => {
      expect(isTypeCompatible("prompt", "str", ["*"], ["str"])).toBe(true);
    });

    it("should return true when outputType is wildcard", () => {
      expect(isTypeCompatible("prompt", "*", ["prompt"], ["str"])).toBe(true);
    });

    it("should return true when acceptedTypes includes wildcard", () => {
      expect(isTypeCompatible("prompt", "str", ["prompt"], ["*"])).toBe(true);
    });

    it("should return true when both source and type are wildcards", () => {
      expect(isTypeCompatible("*", "*", ["prompt"], ["str"])).toBe(true);
    });

    it("should return true when both accepted arrays are wildcards", () => {
      expect(isTypeCompatible("prompt", "str", ["*"], ["*"])).toBe(true);
    });

    it("should return false when source matches but type does not", () => {
      expect(isTypeCompatible("prompt", "int", ["prompt"], ["str"])).toBe(
        false,
      );
    });

    it("should return false when type matches but source does not", () => {
      expect(isTypeCompatible("agent", "str", ["prompt"], ["str"])).toBe(false);
    });

    it("should return false when neither source nor type match", () => {
      expect(isTypeCompatible("agent", "int", ["prompt"], ["str"])).toBe(false);
    });
  });
});
