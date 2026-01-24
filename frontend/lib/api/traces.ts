/**
 * Trace Explorer API functions for debug mode
 *
 * These endpoints are only available when running in dev mode (./adkflow dev).
 * They provide read access to OpenTelemetry trace JSONL files from the project's logs/ directory.
 */

import axios from "axios";
import { apiClient } from "./client";

/**
 * A single span from a trace
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  status: string;
  attributes: Record<string, unknown>;
  children: TraceSpan[];
}

/**
 * Summary information about a trace
 */
export interface TraceInfo {
  traceId: string;
  spanCount: number;
  rootSpanName: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  status: string;
  hasErrors: boolean;
}

/**
 * Response for listing traces
 */
export interface TraceListResponse {
  traces: TraceInfo[];
  totalCount: number;
  hasMore: boolean;
  fileName: string;
}

/**
 * Response for getting a single trace with full span tree
 */
export interface TraceDetailResponse {
  traceId: string;
  spans: TraceSpan[];
  flatSpans: TraceSpan[];
  spanCount: number;
  durationMs: number | null;
  startTime: string | null;
  endTime: string | null;
}

/**
 * Statistics about trace data
 */
export interface TraceStats {
  totalTraces: number;
  totalSpans: number;
  spanNameCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  timeRange: { start: string | null; end: string | null };
  fileSizeBytes: number;
}

/**
 * Options for listing traces
 */
export interface TraceListOptions {
  fileName?: string;
  offset?: number;
  limit?: number;
  startTime?: string;
  endTime?: string;
}

/**
 * Get list of traces from the trace file
 */
export async function getTraces(
  projectPath: string,
  options: TraceListOptions = {},
): Promise<TraceListResponse> {
  try {
    const params: Record<string, string | number> = {
      project_path: projectPath,
    };

    if (options.fileName) params.file_name = options.fileName;
    if (options.offset !== undefined) params.offset = options.offset;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.startTime) params.start_time = options.startTime;
    if (options.endTime) params.end_time = options.endTime;

    const response = await apiClient.get<{
      traces: Array<{
        trace_id: string;
        span_count: number;
        root_span_name: string;
        start_time: string;
        end_time: string | null;
        duration_ms: number | null;
        status: string;
        has_errors: boolean;
      }>;
      total_count: number;
      has_more: boolean;
      file_name: string;
    }>("/api/debug/traces", { params });

    return {
      traces: response.data.traces.map((t) => ({
        traceId: t.trace_id,
        spanCount: t.span_count,
        rootSpanName: t.root_span_name,
        startTime: t.start_time,
        endTime: t.end_time,
        durationMs: t.duration_ms,
        status: t.status,
        hasErrors: t.has_errors,
      })),
      totalCount: response.data.total_count,
      hasMore: response.data.has_more,
      fileName: response.data.file_name,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get traces");
    }
    throw error;
  }
}

/**
 * Convert backend span format to frontend format
 */
function convertSpan(span: {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  name: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  status: string;
  attributes: Record<string, unknown>;
  children: unknown[];
}): TraceSpan {
  return {
    traceId: span.trace_id,
    spanId: span.span_id,
    parentSpanId: span.parent_span_id,
    name: span.name,
    startTime: span.start_time,
    endTime: span.end_time,
    durationMs: span.duration_ms,
    status: span.status,
    attributes: span.attributes,
    children: (span.children as (typeof span)[]).map(convertSpan),
  };
}

/**
 * Get a single trace with full span hierarchy
 */
export async function getTrace(
  projectPath: string,
  traceId: string,
  fileName: string = "traces.jsonl",
): Promise<TraceDetailResponse> {
  try {
    const response = await apiClient.get<{
      trace_id: string;
      spans: Array<{
        trace_id: string;
        span_id: string;
        parent_span_id: string | null;
        name: string;
        start_time: string;
        end_time: string | null;
        duration_ms: number | null;
        status: string;
        attributes: Record<string, unknown>;
        children: unknown[];
      }>;
      flat_spans: Array<{
        trace_id: string;
        span_id: string;
        parent_span_id: string | null;
        name: string;
        start_time: string;
        end_time: string | null;
        duration_ms: number | null;
        status: string;
        attributes: Record<string, unknown>;
        children: unknown[];
      }>;
      span_count: number;
      duration_ms: number | null;
      start_time: string | null;
      end_time: string | null;
    }>(`/api/debug/traces/${traceId}`, {
      params: { project_path: projectPath, file_name: fileName },
    });

    return {
      traceId: response.data.trace_id,
      spans: response.data.spans.map(convertSpan),
      flatSpans: response.data.flat_spans.map(convertSpan),
      spanCount: response.data.span_count,
      durationMs: response.data.duration_ms,
      startTime: response.data.start_time,
      endTime: response.data.end_time,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get trace");
    }
    throw error;
  }
}

/**
 * Get statistics about the trace file
 */
export async function getTraceStats(
  projectPath: string,
  fileName: string = "traces.jsonl",
): Promise<TraceStats> {
  try {
    const response = await apiClient.get<{
      total_traces: number;
      total_spans: number;
      span_name_counts: Record<string, number>;
      status_counts: Record<string, number>;
      time_range: { start: string | null; end: string | null };
      file_size_bytes: number;
    }>("/api/debug/traces/stats", {
      params: { project_path: projectPath, file_name: fileName },
    });

    return {
      totalTraces: response.data.total_traces,
      totalSpans: response.data.total_spans,
      spanNameCounts: response.data.span_name_counts,
      statusCounts: response.data.status_counts,
      timeRange: response.data.time_range,
      fileSizeBytes: response.data.file_size_bytes,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to get trace stats",
      );
    }
    throw error;
  }
}
