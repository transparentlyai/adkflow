import { http, HttpResponse } from "msw";

/**
 * Default handlers for API mocking.
 * These can be extended or overridden in individual tests.
 */
export const handlers = [
  // Execution routes
  http.post("http://localhost:6000/api/execution/run", () => {
    return HttpResponse.json({
      run_id: "test-run-123",
      status: "started",
    });
  }),

  http.get("http://localhost:6000/api/execution/run/:runId/status", ({ params }) => {
    return HttpResponse.json({
      run_id: params.runId,
      status: "running",
    });
  }),

  http.post("http://localhost:6000/api/execution/run/:runId/cancel", ({ params }) => {
    return HttpResponse.json({
      run_id: params.runId,
      status: "cancelled",
    });
  }),

  http.post("http://localhost:6000/api/execution/validate", () => {
    return HttpResponse.json({
      valid: true,
      errors: [],
    });
  }),

  http.post("http://localhost:6000/api/execution/topology", () => {
    return HttpResponse.json({
      mermaid: "graph LR\n  A --> B",
    });
  }),

  // Project routes
  http.get("http://localhost:6000/api/project", () => {
    return HttpResponse.json({
      name: "test-project",
      path: "/test/project",
    });
  }),

  http.post("http://localhost:6000/api/project/load", () => {
    return HttpResponse.json({
      name: "test-project",
      version: "3.0",
      tabs: [{ id: "tab1", name: "Main", isDefault: true }],
      nodes: [],
      edges: [],
      settings: {},
    });
  }),

  http.post("http://localhost:6000/api/project/save", () => {
    return HttpResponse.json({
      success: true,
    });
  }),

  // Tab routes
  http.get("http://localhost:6000/api/tabs", () => {
    return HttpResponse.json({
      tabs: [
        { id: "tab1", name: "Main", isDefault: true },
        { id: "tab2", name: "Secondary", isDefault: false },
      ],
    });
  }),

  http.post("http://localhost:6000/api/tabs", () => {
    return HttpResponse.json({
      id: "new-tab",
      name: "New Tab",
      isDefault: false,
    });
  }),

  // Settings routes
  http.get("http://localhost:6000/api/settings", () => {
    return HttpResponse.json({
      model: "gemini-2.0-flash",
      temperature: 0.7,
    });
  }),

  http.post("http://localhost:6000/api/settings", () => {
    return HttpResponse.json({
      success: true,
    });
  }),

  // Health check
  http.get("http://localhost:6000/health", () => {
    return HttpResponse.json({
      status: "healthy",
    });
  }),
];

/**
 * Create handlers for SSE (Server-Sent Events) streaming.
 * Usage in tests:
 *   server.use(createSSEHandler("/api/execution/run/test-123/events", mockEvents));
 */
export function createSSEHandler(url: string, events: Array<{ type: string; data: unknown }>) {
  return http.get(url, () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events) {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
}

/**
 * Create a handler that returns an error response.
 */
export function createErrorHandler(
  method: "get" | "post" | "put" | "delete",
  url: string,
  status: number,
  message: string
) {
  const httpMethod = http[method];
  return httpMethod(url, () => {
    return HttpResponse.json({ error: message }, { status });
  });
}
