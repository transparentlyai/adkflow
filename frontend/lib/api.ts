/**
 * API client for ADKFlow backend
 *
 * Re-exports from the organized api/ directory for backwards compatibility.
 * New code should import directly from "@/lib/api/..." for better tree-shaking.
 */

export * from "./api/index";
export { default } from "./api/client";
