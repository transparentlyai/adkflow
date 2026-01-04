import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to reset the module state between tests
let registerLogLanguage: typeof import("@/lib/monaco/registerLogLanguage").registerLogLanguage;
let LOG_LANGUAGE_ID: string;
let LOG_THEME_ID: string;

describe("registerLogLanguage", () => {
  const mockMonaco = {
    languages: {
      register: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
    },
    editor: {
      defineTheme: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module to clear isRegistered state
    vi.resetModules();
    const logModule = await import("@/lib/monaco/registerLogLanguage");
    registerLogLanguage = logModule.registerLogLanguage;
    LOG_LANGUAGE_ID = logModule.LOG_LANGUAGE_ID;
    LOG_THEME_ID = logModule.LOG_THEME_ID;
  });

  it("should export LOG_LANGUAGE_ID constant", () => {
    expect(LOG_LANGUAGE_ID).toBe("log");
  });

  it("should export LOG_THEME_ID constant", () => {
    expect(LOG_THEME_ID).toBe("log-light");
  });

  it("should register language with monaco", () => {
    registerLogLanguage(mockMonaco as any);

    expect(mockMonaco.languages.register).toHaveBeenCalledWith({
      id: "log",
    });
  });

  it("should set language configuration", () => {
    registerLogLanguage(mockMonaco as any);

    expect(mockMonaco.languages.setLanguageConfiguration).toHaveBeenCalledWith(
      "log",
      expect.any(Object),
    );
  });

  it("should set monarch tokens provider", () => {
    registerLogLanguage(mockMonaco as any);

    expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith(
      "log",
      expect.any(Object),
    );
  });

  it("should define theme", () => {
    registerLogLanguage(mockMonaco as any);

    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
      "log-light",
      expect.any(Object),
    );
  });

  it("should only register once", () => {
    registerLogLanguage(mockMonaco as any);
    registerLogLanguage(mockMonaco as any);
    registerLogLanguage(mockMonaco as any);

    expect(mockMonaco.languages.register).toHaveBeenCalledTimes(1);
    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(1);
  });
});
