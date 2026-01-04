import { describe, it, expect, beforeEach, vi } from "vitest";

// Test the API client configuration
describe("API Client", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  it("should use default URL when env is not set", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { API_BASE_URL } = await import("@/lib/api/client");
    expect(API_BASE_URL).toBe("http://localhost:8000");
  });

  it("should use env URL when set", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://custom-api:9000";
    const { API_BASE_URL } = await import("@/lib/api/client");
    expect(API_BASE_URL).toBe("http://custom-api:9000");
  });

  it("should create axios client with correct configuration", async () => {
    const { apiClient } = await import("@/lib/api/client");
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
    expect(apiClient.defaults.timeout).toBe(30000);
  });

  it("should export apiClient as default", async () => {
    const { default: defaultExport, apiClient } =
      await import("@/lib/api/client");
    expect(defaultExport).toBe(apiClient);
  });
});
