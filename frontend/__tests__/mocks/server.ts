import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance for Node.js (Vitest) tests.
 * Import this in your tests and call server.listen() in beforeAll.
 *
 * Example usage:
 * ```typescript
 * import { server } from "@/__tests__/mocks/server";
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);
