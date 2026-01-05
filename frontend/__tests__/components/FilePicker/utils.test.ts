import { describe, it, expect } from "vitest";
import { getFileIcon } from "@/components/FilePicker/utils";

describe("getFileIcon", () => {
  it("should return markdown icon for .md files", () => {
    expect(getFileIcon("readme.md")).toBe("📝");
  });

  it("should return python icon for .py files", () => {
    expect(getFileIcon("script.py")).toBe("🐍");
  });

  it("should return script icon for JavaScript files", () => {
    expect(getFileIcon("app.js")).toBe("📜");
  });

  it("should return script icon for TypeScript files", () => {
    expect(getFileIcon("app.ts")).toBe("📜");
  });

  it("should return script icon for TSX files", () => {
    expect(getFileIcon("component.tsx")).toBe("📜");
  });

  it("should return script icon for JSX files", () => {
    expect(getFileIcon("component.jsx")).toBe("📜");
  });

  it("should return config icon for JSON files", () => {
    expect(getFileIcon("config.json")).toBe("⚙️");
  });

  it("should return config icon for YAML files", () => {
    expect(getFileIcon("config.yaml")).toBe("⚙️");
  });

  it("should return config icon for YML files", () => {
    expect(getFileIcon("config.yml")).toBe("⚙️");
  });

  it("should return default file icon for unknown extensions", () => {
    expect(getFileIcon("file.txt")).toBe("📄");
    expect(getFileIcon("file.doc")).toBe("📄");
    expect(getFileIcon("file.pdf")).toBe("📄");
  });

  it("should return default icon for files without extension", () => {
    expect(getFileIcon("README")).toBe("📄");
    expect(getFileIcon("Makefile")).toBe("📄");
  });

  it("should be case insensitive", () => {
    expect(getFileIcon("script.PY")).toBe("🐍");
    expect(getFileIcon("readme.MD")).toBe("📝");
    expect(getFileIcon("app.JS")).toBe("📜");
  });
});
