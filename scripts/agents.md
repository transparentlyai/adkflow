# Lynx ADK Agents Registry

This document lists all Google ADK agents (with models) found in `/home/mauro/projects/lynx/`.

---

# CAGX Module

## FinancialResearcher

**File**: `/home/mauro/projects/lynx/workflow/CAGX/agent.py`
**Type**: LlmAgent

| Property | Value |
|----------|-------|
| name | FinancialResearcher |
| model | gemini-2.5-flash (via CAGX_MODEL_NAME env var) |
| temperature | 0.0 (via CAGX_TEMPERATURE env var) |
| output_schema | MetricExtractionResult |
| tools | none |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 3600000ms | CAGX_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | CAGX_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 300.0s | CAGX_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CAGX_RETRY_MULTIPLIER |
| retry_options.attempts | 15 | CAGX_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CAGX_RETRY_HTTP_STATUS_CODES |

### Callbacks
- after_model_callback: after_model_callback_with_tracking

### Prompt File
`/home/mauro/projects/lynx/workflow/CAGX/prompts/extraction.prompt.md`

### Prompt Variables
- `{query_text}` - The metric query
- `{metric_id}` - Metric identifier
- `{header_context}` - Global document header (first 3k chars)
- `{chunk}` - Local text segment to analyze

---

## BatchFinancialResearcher

**File**: `/home/mauro/projects/lynx/workflow/CAGX/agent.py`
**Type**: LlmAgent

| Property | Value |
|----------|-------|
| name | BatchFinancialResearcher |
| model | gemini-2.5-flash (via CAGX_MODEL_NAME env var) |
| temperature | 0.0 (via CAGX_TEMPERATURE env var) |
| output_schema | BatchExtractionResult |
| tools | none |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 3600000ms | CAGX_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | CAGX_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 300.0s | CAGX_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CAGX_RETRY_MULTIPLIER |
| retry_options.attempts | 15 | CAGX_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CAGX_RETRY_HTTP_STATUS_CODES |

### Callbacks
- after_model_callback: after_model_callback_with_tracking

### Prompt File
`/home/mauro/projects/lynx/workflow/CAGX/prompts/batch-extraction.prompt.md`

### Prompt Variables
- `{metrics_block}` - Block of metrics to extract
- `{header_context}` - Global document header (first 3k chars)
- `{chunk}` - Local text segment to analyze

---

## ConsolidationJudge

**File**: `/home/mauro/projects/lynx/workflow/CAGX/aggregator.py`
**Type**: LlmAgent

| Property | Value |
|----------|-------|
| name | ConsolidationJudge |
| model | gemini-2.5-flash (via CAGX_MODEL_NAME env var) |
| temperature | 0.0 (via CAGX_AGGREGATOR_TEMPERATURE env var) |
| output_schema | BestValueSelection |
| tools | none |
| disallow_transfer_to_parent | true |
| disallow_transfer_to_peers | true |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 3600000ms | CAGX_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | CAGX_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 300.0s | CAGX_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CAGX_RETRY_MULTIPLIER |
| retry_options.attempts | 15 | CAGX_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CAGX_RETRY_HTTP_STATUS_CODES |

### Callbacks
- after_model_callback: after_model_callback_with_tracking

### Prompt File
`/home/mauro/projects/lynx/workflow/CAGX/prompts/aggregation.prompt.md`

### Prompt Variables
- `{metric_id}` - The metric identifier
- `{year}` - The year being resolved
- `{candidates_text}` - Formatted list of candidate values
- `{len_candidates}` - Number of candidates

### Additional Prompt (Scale Reconciliation)
`/home/mauro/projects/lynx/workflow/CAGX/prompts/scale-reconciliation.prompt.md`

Used when scale mismatch is detected (~1000x difference between values).

### Prompt Variables (Scale Reconciliation)
- `{metric_id}` - The metric identifier
- `{year}` - The year being resolved
- `{candidates_formatted}` - Formatted list of candidates with scale info

---

## MetadataExtractor

**File**: `/home/mauro/projects/lynx/workflow/CAGX/agent.py`
**Type**: LlmAgent

| Property | Value |
|----------|-------|
| name | MetadataExtractor |
| model | gemini-2.5-flash (via CAGX_MODEL_NAME env var) |
| temperature | 0.0 (via CAGX_METADATA_TEMPERATURE env var) |
| output_schema | DocumentMetadata |
| tools | none |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 3600000ms | CAGX_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | CAGX_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 300.0s | CAGX_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CAGX_RETRY_MULTIPLIER |
| retry_options.attempts | 15 | CAGX_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CAGX_RETRY_HTTP_STATUS_CODES |

### Callbacks
- after_model_callback: after_model_callback_with_tracking

### Prompt File
`/home/mauro/projects/lynx/workflow/CAGX/prompts/metadata-extraction.prompt.md`

### Prompt Variables
- `{metadata_sample_start}` - Number of chars to sample from document start (default: 15000)
- `{metadata_sample_end}` - Number of chars to sample from document end (default: 5000)
- `{document_start}` - First N characters of document
- `{document_end}` - Last M characters of document

---

# SRAG Module

## retrieval_analyst

**File**: `/home/mauro/projects/lynx/workflow/SRAG/retriever/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | retrieval_analyst_{metric_id} |
| model | gemini-2.5-flash (via SRAG_RETRIEVER_MODEL env var) |
| temperature | 0.0 (via SRAG_RETRIEVER_TEMPERATURE env var) |
| max_output_tokens | 65535 |
| output_key | analysis_result |
| tools | [query_vector_store] |

### Tools
- `query_vector_store`: `/home/mauro/projects/lynx/workflow/SRAG/retriever/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | SRAG_RETRIEVER_THINKING_BUDGET |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SRAG_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | SRAG_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SRAG_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SRAG_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SRAG_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | - |

### Prompt File
`/home/mauro/projects/lynx/workflow/SRAG/retriever/prompts/retriever_agent.prompt.md`

### Prompt Variables
- `{query}` - The metric query
- `{metric_id}` - The metric ID to extract

---

## csv_generator

**File**: `/home/mauro/projects/lynx/workflow/SRAG/retriever/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | csv_generator_{metric_id} |
| model | gemini-2.5-flash (via SRAG_RETRIEVER_MODEL env var) |
| temperature | 0.0 (via SRAG_RETRIEVER_TEMPERATURE env var) |
| max_output_tokens | 65535 |
| output_key | csv_result |
| tools | none |

### Planner
| Property | Value |
|----------|-------|
| type | BuiltInPlanner |
| thinking_config.thinking_budget | 0 |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SRAG_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | SRAG_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SRAG_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SRAG_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SRAG_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | - |

### Prompt File
`/home/mauro/projects/lynx/workflow/SRAG/retriever/prompts/csv_generator.prompt.md`

### Prompt Variables
- `{analysis_result}` - Output from retrieval_analyst agent
- `{metric_id}` - The metric ID

---

# DocPrep Module

## metadata_extractor

**File**: `/home/mauro/projects/lynx/workflow/docprep/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | metadata_extractor |
| model | gemini-2.5-flash (via DOCPREP_LLM_MODEL env var) |
| temperature | 0.0 (via DOCPREP_TEMPERATURE env var) |
| max_output_tokens | 65535 (via DOCPREP_MAX_OUTPUT_TOKENS env var) |
| output_key | metadata |
| tools | none |

### HTTP Options
Not configured (no retry configuration)

### Prompt File
`/home/mauro/projects/lynx/workflow/docprep/prompts/metadata_extractor.prompt.md`

### Prompt Variables
None (static prompt)

---

## document_enricher

**File**: `/home/mauro/projects/lynx/workflow/docprep/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | document_enricher |
| model | gemini-2.5-flash (via DOCPREP_LLM_MODEL env var) |
| temperature | 0.1 |
| max_output_tokens | 65535 (via DOCPREP_MAX_OUTPUT_TOKENS env var) |
| output_key | enriched_document |
| tools | none |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 1024 | DOCPREP_ENRICHER_THINKING_BUDGET |

### HTTP Options
Not configured (no retry configuration)

### Prompt File
`/home/mauro/projects/lynx/workflow/docprep/prompts/document_enricher.prompt.md`

### Prompt Variables
- `{study_name}` - Study identifier
- `{company_name}` - Company name
- `{reporting_period}` - Reporting period
- `{document_type}` - Document type
- `{filename}` - Source filename
- `{currency}` - Currency code
- `{accounting_standard}` - Accounting framework
- `{period_end_date}` - Period end date

---

# LynxTool Module

## workflow_retrieval

**File**: `/home/mauro/projects/lynx/workflow/lynxtool/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | workflow_retrieval |
| model | gemini-2.5-flash (via LYNXTOOL_MODEL env var) |
| temperature | 0.0 (via LYNXTOOL_TEMPERATURE env var) |
| max_output_tokens | 65535 (via LYNXTOOL_MAX_OUTPUT_TOKENS env var) |
| output_key | retrieval_results |
| tools | [query_vector_store] |

### Tools
- `query_vector_store`: `/home/mauro/projects/lynx/workflow/lynxtool/tools.py` (factory wrapper)
- Base tool: `/home/mauro/projects/lynx/workflow/SRAG/retriever/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | LYNXTOOL_THINKING_BUDGET |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | LYNXTOOL_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | LYNXTOOL_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | LYNXTOOL_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | LYNXTOOL_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | LYNXTOOL_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | - |

### Prompt File
`/home/mauro/projects/lynx/workflow/lynxtool/prompts/retrieval.prompt.md`

### Prompt Variables
- `{query}` - User's natural language query
- `{compiler_report}` - Compiler report content
- `{metrics_map}` - Financial metrics reference
- `{factors_map}` - Risk factors reference
- `{clusters_map}` - Risk clusters reference

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/metrics_map.json`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## workflow_synthesis

**File**: `/home/mauro/projects/lynx/workflow/lynxtool/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | workflow_synthesis |
| model | gemini-2.5-flash (via LYNXTOOL_MODEL env var) |
| temperature | 0.7 (via LYNXTOOL_SYNTHESIS_TEMPERATURE env var) |
| max_output_tokens | 65535 (via LYNXTOOL_MAX_OUTPUT_TOKENS env var) |
| output_key | final_answer |
| tools | none |

### Planner
| Property | Value |
|----------|-------|
| type | BuiltInPlanner |
| thinking_config.thinking_budget | 0 |

### HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | LYNXTOOL_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | LYNXTOOL_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | LYNXTOOL_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | LYNXTOOL_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | LYNXTOOL_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | - |

### Prompt File
`/home/mauro/projects/lynx/workflow/lynxtool/prompts/synthesis.prompt.md`

### Prompt Variables
- `{query}` - User's original query
- `{retrieval_results}` - Output from workflow_retrieval

---

# Specialist Agents (23 specialists × 4 agents = 92 agents)


---

## altmanz_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("altmanz")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for altmanz analysis | - |
| model | gemini-2.5-pro | ALTMANZ_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ALTMANZ_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ALTMANZ_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | ALTMANZ_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ALTMANZ_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ALTMANZ_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ALTMANZ_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ALTMANZ_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ALTMANZ_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ALTMANZ_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ALTMANZ_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/prompts/retriever.prompt.md`

---

## altmanz_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("altmanz")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for altmanz | - |
| model | gemini-2.5-pro | ALTMANZ_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ALTMANZ_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ALTMANZ_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | ALTMANZ_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_altman_z_scores] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_altman_z_scores`: `/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ALTMANZ_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ALTMANZ_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ALTMANZ_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ALTMANZ_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ALTMANZ_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ALTMANZ_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ALTMANZ_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/prompts/analyst.prompt.md`

---

## altmanz_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("altmanz")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for altmanz | - |
| model | gemini-2.5-pro | ALTMANZ_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ALTMANZ_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ALTMANZ_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | ALTMANZ_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ALTMANZ_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ALTMANZ_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ALTMANZ_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ALTMANZ_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ALTMANZ_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ALTMANZ_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ALTMANZ_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/altmanz/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## altmanz_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("altmanz")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for altmanz analysis | - |
| model | gemini-2.5-flash | ALTMANZ_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ALTMANZ_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ALTMANZ_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | ALTMANZ_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ALTMANZ_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ALTMANZ_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ALTMANZ_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ALTMANZ_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ALTMANZ_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ALTMANZ_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ALTMANZ_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/altmanz/prompts/reporter.prompt.md`

---

## assets_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/assets/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("assets")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for assets analysis | - |
| model | gemini-2.5-pro | ASSETS_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ASSETS_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ASSETS_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | ASSETS_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ASSETS_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ASSETS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ASSETS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ASSETS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ASSETS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ASSETS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ASSETS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/assets/prompts/retriever.prompt.md`

---

## assets_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/assets/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("assets")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for assets | - |
| model | gemini-2.5-pro | ASSETS_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ASSETS_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ASSETS_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | ASSETS_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_asset_quality_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_asset_quality_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/assets/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ASSETS_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ASSETS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ASSETS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ASSETS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ASSETS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ASSETS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ASSETS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/assets/prompts/analyst.prompt.md`

---

## assets_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/assets/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("assets")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for assets | - |
| model | gemini-2.5-pro | ASSETS_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ASSETS_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ASSETS_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | ASSETS_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ASSETS_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ASSETS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ASSETS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ASSETS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ASSETS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ASSETS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ASSETS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/assets/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/assets/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## assets_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/assets/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("assets")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for assets analysis | - |
| model | gemini-2.5-flash | ASSETS_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ASSETS_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ASSETS_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | ASSETS_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ASSETS_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ASSETS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ASSETS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ASSETS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ASSETS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ASSETS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ASSETS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/assets/prompts/reporter.prompt.md`

---

## benford_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/benford/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("benford")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for benford analysis | - |
| model | gemini-2.5-pro | BENFORD_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BENFORD_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BENFORD_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | BENFORD_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BENFORD_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BENFORD_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BENFORD_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BENFORD_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BENFORD_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BENFORD_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BENFORD_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/benford/prompts/retriever.prompt.md`

---

## benford_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/benford/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("benford")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for benford | - |
| model | gemini-2.5-pro | BENFORD_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BENFORD_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BENFORD_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | BENFORD_ANALYST_OUTPUT_KEY |
| tools | [run_benford_analysis_all_periods] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `run_benford_analysis_all_periods`: `/home/mauro/projects/lynx/workflow/analysis/specialists/benford/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BENFORD_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BENFORD_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BENFORD_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BENFORD_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BENFORD_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BENFORD_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BENFORD_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/benford/prompts/analyst.prompt.md`

---

## benford_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/benford/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("benford")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for benford | - |
| model | gemini-2.5-pro | BENFORD_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BENFORD_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BENFORD_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | BENFORD_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BENFORD_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BENFORD_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BENFORD_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BENFORD_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BENFORD_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BENFORD_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BENFORD_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/benford/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/benford/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## benford_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/benford/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("benford")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for benford analysis | - |
| model | gemini-2.5-flash | BENFORD_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BENFORD_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BENFORD_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | BENFORD_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BENFORD_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BENFORD_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BENFORD_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BENFORD_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BENFORD_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BENFORD_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BENFORD_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/benford/prompts/reporter.prompt.md`

---

## business_model_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("business_model")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for business_model analysis | - |
| model | gemini-2.5-pro | BUSINESS_MODEL_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BUSINESS_MODEL_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BUSINESS_MODEL_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | BUSINESS_MODEL_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BUSINESS_MODEL_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BUSINESS_MODEL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BUSINESS_MODEL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BUSINESS_MODEL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BUSINESS_MODEL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BUSINESS_MODEL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BUSINESS_MODEL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/prompts/retriever.prompt.md`

---

## business_model_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("business_model")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for business_model | - |
| model | gemini-2.5-pro | BUSINESS_MODEL_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BUSINESS_MODEL_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BUSINESS_MODEL_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | BUSINESS_MODEL_ANALYST_OUTPUT_KEY |
| tools | [calculate_discretionary_accruals] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_discretionary_accruals`: `/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BUSINESS_MODEL_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BUSINESS_MODEL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BUSINESS_MODEL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BUSINESS_MODEL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BUSINESS_MODEL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BUSINESS_MODEL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BUSINESS_MODEL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/prompts/analyst.prompt.md`

---

## business_model_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("business_model")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for business_model | - |
| model | gemini-2.5-pro | BUSINESS_MODEL_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BUSINESS_MODEL_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BUSINESS_MODEL_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | BUSINESS_MODEL_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BUSINESS_MODEL_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BUSINESS_MODEL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BUSINESS_MODEL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BUSINESS_MODEL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BUSINESS_MODEL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BUSINESS_MODEL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BUSINESS_MODEL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/business_model/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## business_model_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("business_model")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for business_model analysis | - |
| model | gemini-2.5-flash | BUSINESS_MODEL_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | BUSINESS_MODEL_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | BUSINESS_MODEL_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | BUSINESS_MODEL_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | BUSINESS_MODEL_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | BUSINESS_MODEL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | BUSINESS_MODEL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | BUSINESS_MODEL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | BUSINESS_MODEL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | BUSINESS_MODEL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | BUSINESS_MODEL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/business_model/prompts/reporter.prompt.md`

---

## cash_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cash/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("cash")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for cash analysis | - |
| model | gemini-2.5-pro | CASH_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CASH_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CASH_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | CASH_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CASH_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CASH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CASH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CASH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CASH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CASH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CASH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cash/prompts/retriever.prompt.md`

---

## cash_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cash/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("cash")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for cash | - |
| model | gemini-2.5-pro | CASH_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CASH_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CASH_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | CASH_ANALYST_OUTPUT_KEY |
| tools | [calculate_cash_quality_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_cash_quality_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/cash/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CASH_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CASH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CASH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CASH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CASH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CASH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CASH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cash/prompts/analyst.prompt.md`

---

## cash_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cash/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("cash")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for cash | - |
| model | gemini-2.5-pro | CASH_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CASH_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CASH_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | CASH_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CASH_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CASH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CASH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CASH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CASH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CASH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CASH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cash/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/cash/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## cash_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cash/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("cash")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for cash analysis | - |
| model | gemini-2.5-flash | CASH_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CASH_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CASH_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | CASH_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CASH_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CASH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CASH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CASH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CASH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CASH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CASH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cash/prompts/reporter.prompt.md`

---

## cf_dechow_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("cf_dechow")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for cf_dechow analysis | - |
| model | gemini-2.5-pro | CF_DECHOW_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_DECHOW_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_DECHOW_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | CF_DECHOW_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_DECHOW_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_DECHOW_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_DECHOW_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_DECHOW_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_DECHOW_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_DECHOW_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_DECHOW_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/prompts/retriever.prompt.md`

---

## cf_dechow_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("cf_dechow")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for cf_dechow | - |
| model | gemini-2.5-pro | CF_DECHOW_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_DECHOW_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_DECHOW_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | CF_DECHOW_ANALYST_OUTPUT_KEY |
| tools | [calculate_accrual_quality] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_accrual_quality`: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_DECHOW_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_DECHOW_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_DECHOW_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_DECHOW_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_DECHOW_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_DECHOW_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_DECHOW_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/prompts/analyst.prompt.md`

---

## cf_dechow_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("cf_dechow")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for cf_dechow | - |
| model | gemini-2.5-pro | CF_DECHOW_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_DECHOW_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_DECHOW_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | CF_DECHOW_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_DECHOW_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_DECHOW_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_DECHOW_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_DECHOW_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_DECHOW_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_DECHOW_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_DECHOW_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/cf_dechow/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## cf_dechow_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("cf_dechow")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for cf_dechow analysis | - |
| model | gemini-2.5-flash | CF_DECHOW_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_DECHOW_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_DECHOW_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | CF_DECHOW_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_DECHOW_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_DECHOW_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_DECHOW_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_DECHOW_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_DECHOW_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_DECHOW_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_DECHOW_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_dechow/prompts/reporter.prompt.md`

---

## cf_jones_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("cf_jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for cf_jones analysis | - |
| model | gemini-2.5-pro | CF_JONES_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_JONES_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_JONES_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | CF_JONES_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_JONES_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/prompts/retriever.prompt.md`

---

## cf_jones_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("cf_jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for cf_jones | - |
| model | gemini-2.5-pro | CF_JONES_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_JONES_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_JONES_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | CF_JONES_ANALYST_OUTPUT_KEY |
| tools | [calculate_cf_jones_model] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_cf_jones_model`: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_JONES_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/prompts/analyst.prompt.md`

---

## cf_jones_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("cf_jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for cf_jones | - |
| model | gemini-2.5-pro | CF_JONES_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_JONES_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_JONES_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | CF_JONES_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_JONES_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/cf_jones/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## cf_jones_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("cf_jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for cf_jones analysis | - |
| model | gemini-2.5-flash | CF_JONES_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CF_JONES_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CF_JONES_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | CF_JONES_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CF_JONES_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CF_JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CF_JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CF_JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CF_JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CF_JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CF_JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/cf_jones/prompts/reporter.prompt.md`

---

## credit_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/credit/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("credit")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for credit analysis | - |
| model | gemini-2.5-pro | CREDIT_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CREDIT_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CREDIT_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | CREDIT_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CREDIT_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CREDIT_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CREDIT_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CREDIT_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CREDIT_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CREDIT_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CREDIT_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/credit/prompts/retriever.prompt.md`

---

## credit_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/credit/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("credit")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for credit | - |
| model | gemini-2.5-pro | CREDIT_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CREDIT_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CREDIT_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | CREDIT_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_credit_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_credit_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/credit/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CREDIT_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CREDIT_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CREDIT_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CREDIT_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CREDIT_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CREDIT_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CREDIT_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/credit/prompts/analyst.prompt.md`

---

## credit_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/credit/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("credit")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for credit | - |
| model | gemini-2.5-pro | CREDIT_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CREDIT_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CREDIT_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | CREDIT_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CREDIT_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CREDIT_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CREDIT_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CREDIT_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CREDIT_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CREDIT_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CREDIT_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/credit/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/credit/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## credit_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/credit/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("credit")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for credit analysis | - |
| model | gemini-2.5-flash | CREDIT_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | CREDIT_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | CREDIT_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | CREDIT_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | CREDIT_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | CREDIT_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | CREDIT_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | CREDIT_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | CREDIT_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | CREDIT_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | CREDIT_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/credit/prompts/reporter.prompt.md`

---

## governance_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/governance/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("governance")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for governance analysis | - |
| model | gemini-2.5-pro | GOVERNANCE_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GOVERNANCE_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GOVERNANCE_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | GOVERNANCE_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GOVERNANCE_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GOVERNANCE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GOVERNANCE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GOVERNANCE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GOVERNANCE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GOVERNANCE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GOVERNANCE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/governance/prompts/retriever.prompt.md`

---

## governance_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/governance/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("governance")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for governance | - |
| model | gemini-2.5-pro | GOVERNANCE_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GOVERNANCE_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GOVERNANCE_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | GOVERNANCE_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_governance_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_governance_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/governance/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GOVERNANCE_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GOVERNANCE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GOVERNANCE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GOVERNANCE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GOVERNANCE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GOVERNANCE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GOVERNANCE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/governance/prompts/analyst.prompt.md`

---

## governance_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/governance/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("governance")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for governance | - |
| model | gemini-2.5-pro | GOVERNANCE_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GOVERNANCE_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GOVERNANCE_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | GOVERNANCE_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GOVERNANCE_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GOVERNANCE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GOVERNANCE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GOVERNANCE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GOVERNANCE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GOVERNANCE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GOVERNANCE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/governance/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/governance/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## governance_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/governance/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("governance")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for governance analysis | - |
| model | gemini-2.5-flash | GOVERNANCE_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GOVERNANCE_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GOVERNANCE_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | GOVERNANCE_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GOVERNANCE_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GOVERNANCE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GOVERNANCE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GOVERNANCE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GOVERNANCE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GOVERNANCE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GOVERNANCE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/governance/prompts/reporter.prompt.md`

---

## growth_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/growth/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("growth")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for growth analysis | - |
| model | gemini-2.5-pro | GROWTH_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GROWTH_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GROWTH_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | GROWTH_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GROWTH_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GROWTH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GROWTH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GROWTH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GROWTH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GROWTH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GROWTH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/growth/prompts/retriever.prompt.md`

---

## growth_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/growth/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("growth")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for growth | - |
| model | gemini-2.5-pro | GROWTH_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GROWTH_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GROWTH_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | GROWTH_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_growth_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_growth_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/growth/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GROWTH_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GROWTH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GROWTH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GROWTH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GROWTH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GROWTH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GROWTH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/growth/prompts/analyst.prompt.md`

---

## growth_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/growth/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("growth")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for growth | - |
| model | gemini-2.5-pro | GROWTH_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GROWTH_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GROWTH_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | GROWTH_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GROWTH_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GROWTH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GROWTH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GROWTH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GROWTH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GROWTH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GROWTH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/growth/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/growth/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## growth_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/growth/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("growth")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for growth analysis | - |
| model | gemini-2.5-flash | GROWTH_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GROWTH_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GROWTH_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | GROWTH_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GROWTH_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GROWTH_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GROWTH_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GROWTH_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GROWTH_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GROWTH_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GROWTH_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/growth/prompts/reporter.prompt.md`

---

## gunny_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("gunny")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for gunny analysis | - |
| model | gemini-2.5-pro | GUNNY_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GUNNY_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GUNNY_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | GUNNY_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GUNNY_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GUNNY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GUNNY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GUNNY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GUNNY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GUNNY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GUNNY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/prompts/retriever.prompt.md`

---

## gunny_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("gunny")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for gunny | - |
| model | gemini-2.5-pro | GUNNY_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GUNNY_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GUNNY_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | GUNNY_ANALYST_OUTPUT_KEY |
| tools | [calculate_gunny_residuals] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_gunny_residuals`: `/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GUNNY_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GUNNY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GUNNY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GUNNY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GUNNY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GUNNY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GUNNY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/prompts/analyst.prompt.md`

---

## gunny_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("gunny")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for gunny | - |
| model | gemini-2.5-pro | GUNNY_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GUNNY_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GUNNY_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | GUNNY_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GUNNY_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GUNNY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GUNNY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GUNNY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GUNNY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GUNNY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GUNNY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/gunny/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## gunny_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("gunny")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for gunny analysis | - |
| model | gemini-2.5-flash | GUNNY_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | GUNNY_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | GUNNY_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | GUNNY_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | GUNNY_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | GUNNY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | GUNNY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | GUNNY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | GUNNY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | GUNNY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | GUNNY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/gunny/prompts/reporter.prompt.md`

---

## income_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/income/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("income")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for income analysis | - |
| model | gemini-2.5-pro | INCOME_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INCOME_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INCOME_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | INCOME_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INCOME_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INCOME_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INCOME_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INCOME_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INCOME_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INCOME_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INCOME_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/income/prompts/retriever.prompt.md`

---

## income_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/income/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("income")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for income | - |
| model | gemini-2.5-pro | INCOME_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INCOME_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INCOME_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | INCOME_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_income_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_income_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/income/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INCOME_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INCOME_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INCOME_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INCOME_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INCOME_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INCOME_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INCOME_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/income/prompts/analyst.prompt.md`

---

## income_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/income/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("income")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for income | - |
| model | gemini-2.5-pro | INCOME_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INCOME_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INCOME_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | INCOME_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INCOME_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INCOME_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INCOME_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INCOME_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INCOME_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INCOME_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INCOME_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/income/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/income/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## income_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/income/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("income")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for income analysis | - |
| model | gemini-2.5-flash | INCOME_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INCOME_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INCOME_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | INCOME_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INCOME_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INCOME_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INCOME_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INCOME_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INCOME_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INCOME_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INCOME_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/income/prompts/reporter.prompt.md`

---

## interim_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/interim/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("interim")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for interim analysis | - |
| model | gemini-2.5-pro | INTERIM_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INTERIM_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INTERIM_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | INTERIM_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INTERIM_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INTERIM_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INTERIM_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INTERIM_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INTERIM_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INTERIM_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INTERIM_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/interim/prompts/retriever.prompt.md`

---

## interim_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/interim/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("interim")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for interim | - |
| model | gemini-2.5-pro | INTERIM_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INTERIM_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INTERIM_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | INTERIM_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_interim_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_interim_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/interim/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INTERIM_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INTERIM_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INTERIM_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INTERIM_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INTERIM_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INTERIM_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INTERIM_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/interim/prompts/analyst.prompt.md`

---

## interim_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/interim/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("interim")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for interim | - |
| model | gemini-2.5-pro | INTERIM_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INTERIM_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INTERIM_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | INTERIM_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INTERIM_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INTERIM_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INTERIM_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INTERIM_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INTERIM_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INTERIM_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INTERIM_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/interim/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/interim/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## interim_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/interim/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("interim")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for interim analysis | - |
| model | gemini-2.5-flash | INTERIM_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INTERIM_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INTERIM_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | INTERIM_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INTERIM_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INTERIM_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INTERIM_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INTERIM_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INTERIM_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INTERIM_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INTERIM_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/interim/prompts/reporter.prompt.md`

---

## investing_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/investing/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("investing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for investing analysis | - |
| model | gemini-2.5-pro | INVESTING_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INVESTING_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INVESTING_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | INVESTING_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INVESTING_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INVESTING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INVESTING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INVESTING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INVESTING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INVESTING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INVESTING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/investing/prompts/retriever.prompt.md`

---

## investing_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/investing/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("investing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for investing | - |
| model | gemini-2.5-pro | INVESTING_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INVESTING_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INVESTING_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | INVESTING_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_investing_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_investing_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/investing/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INVESTING_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INVESTING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INVESTING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INVESTING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INVESTING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INVESTING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INVESTING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/investing/prompts/analyst.prompt.md`

---

## investing_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/investing/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("investing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for investing | - |
| model | gemini-2.5-pro | INVESTING_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INVESTING_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INVESTING_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | INVESTING_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INVESTING_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INVESTING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INVESTING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INVESTING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INVESTING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INVESTING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INVESTING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/investing/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/investing/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## investing_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/investing/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("investing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for investing analysis | - |
| model | gemini-2.5-flash | INVESTING_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | INVESTING_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | INVESTING_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | INVESTING_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | INVESTING_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | INVESTING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | INVESTING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | INVESTING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | INVESTING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | INVESTING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | INVESTING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/investing/prompts/reporter.prompt.md`

---

## jones_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/jones/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for jones analysis | - |
| model | gemini-2.5-pro | JONES_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | JONES_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | JONES_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | JONES_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | JONES_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/jones/prompts/retriever.prompt.md`

---

## jones_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/jones/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for jones | - |
| model | gemini-2.5-pro | JONES_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | JONES_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | JONES_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | JONES_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_jones_model] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_jones_model`: `/home/mauro/projects/lynx/workflow/analysis/specialists/jones/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | JONES_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/jones/prompts/analyst.prompt.md`

---

## jones_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/jones/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for jones | - |
| model | gemini-2.5-pro | JONES_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | JONES_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | JONES_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | JONES_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | JONES_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/jones/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/jones/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## jones_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/jones/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("jones")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for jones analysis | - |
| model | gemini-2.5-flash | JONES_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | JONES_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | JONES_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | JONES_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | JONES_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | JONES_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | JONES_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | JONES_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | JONES_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | JONES_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | JONES_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/jones/prompts/reporter.prompt.md`

---

## margins_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/margins/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("margins")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for margins analysis | - |
| model | gemini-2.5-pro | MARGINS_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MARGINS_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MARGINS_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | MARGINS_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MARGINS_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MARGINS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MARGINS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MARGINS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MARGINS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MARGINS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MARGINS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/margins/prompts/retriever.prompt.md`

---

## margins_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/margins/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("margins")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for margins | - |
| model | gemini-2.5-pro | MARGINS_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MARGINS_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MARGINS_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | MARGINS_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_margin_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_margin_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/margins/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MARGINS_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MARGINS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MARGINS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MARGINS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MARGINS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MARGINS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MARGINS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/margins/prompts/analyst.prompt.md`

---

## margins_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/margins/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("margins")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for margins | - |
| model | gemini-2.5-pro | MARGINS_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MARGINS_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MARGINS_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | MARGINS_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MARGINS_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MARGINS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MARGINS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MARGINS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MARGINS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MARGINS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MARGINS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/margins/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/margins/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## margins_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/margins/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("margins")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for margins analysis | - |
| model | gemini-2.5-flash | MARGINS_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MARGINS_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MARGINS_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | MARGINS_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MARGINS_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MARGINS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MARGINS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MARGINS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MARGINS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MARGINS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MARGINS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/margins/prompts/reporter.prompt.md`

---

## miscellaneous_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("miscellaneous")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for miscellaneous analysis | - |
| model | gemini-2.5-pro | MISCELLANEOUS_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MISCELLANEOUS_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MISCELLANEOUS_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | MISCELLANEOUS_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MISCELLANEOUS_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MISCELLANEOUS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MISCELLANEOUS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MISCELLANEOUS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MISCELLANEOUS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MISCELLANEOUS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MISCELLANEOUS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/prompts/retriever.prompt.md`

---

## miscellaneous_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("miscellaneous")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for miscellaneous | - |
| model | gemini-2.5-pro | MISCELLANEOUS_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MISCELLANEOUS_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MISCELLANEOUS_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | MISCELLANEOUS_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_miscellaneous_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_miscellaneous_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MISCELLANEOUS_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MISCELLANEOUS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MISCELLANEOUS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MISCELLANEOUS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MISCELLANEOUS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MISCELLANEOUS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MISCELLANEOUS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/prompts/analyst.prompt.md`

---

## miscellaneous_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("miscellaneous")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for miscellaneous | - |
| model | gemini-2.5-pro | MISCELLANEOUS_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MISCELLANEOUS_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MISCELLANEOUS_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | MISCELLANEOUS_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MISCELLANEOUS_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MISCELLANEOUS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MISCELLANEOUS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MISCELLANEOUS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MISCELLANEOUS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MISCELLANEOUS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MISCELLANEOUS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/miscellaneous/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## miscellaneous_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("miscellaneous")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for miscellaneous analysis | - |
| model | gemini-2.5-flash | MISCELLANEOUS_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MISCELLANEOUS_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MISCELLANEOUS_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | MISCELLANEOUS_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MISCELLANEOUS_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MISCELLANEOUS_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MISCELLANEOUS_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MISCELLANEOUS_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MISCELLANEOUS_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MISCELLANEOUS_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MISCELLANEOUS_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/miscellaneous/prompts/reporter.prompt.md`

---

## mscore_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("mscore")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for mscore analysis | - |
| model | gemini-2.5-pro | MSCORE_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MSCORE_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MSCORE_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | MSCORE_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MSCORE_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MSCORE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MSCORE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MSCORE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MSCORE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MSCORE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MSCORE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/prompts/retriever.prompt.md`

---

## mscore_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("mscore")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for mscore | - |
| model | gemini-2.5-pro | MSCORE_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MSCORE_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MSCORE_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | MSCORE_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_m_scores] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_m_scores`: `/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MSCORE_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MSCORE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MSCORE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MSCORE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MSCORE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MSCORE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MSCORE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/prompts/analyst.prompt.md`

---

## mscore_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("mscore")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for mscore | - |
| model | gemini-2.5-pro | MSCORE_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MSCORE_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MSCORE_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | MSCORE_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MSCORE_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MSCORE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MSCORE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MSCORE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MSCORE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MSCORE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MSCORE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/mscore/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## mscore_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("mscore")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for mscore analysis | - |
| model | gemini-2.5-flash | MSCORE_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | MSCORE_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | MSCORE_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | MSCORE_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | MSCORE_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | MSCORE_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | MSCORE_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | MSCORE_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | MSCORE_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | MSCORE_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | MSCORE_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/mscore/prompts/reporter.prompt.md`

---

## piotroski_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("piotroski")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for piotroski analysis | - |
| model | gemini-2.5-pro | PIOTROSKI_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | PIOTROSKI_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | PIOTROSKI_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | PIOTROSKI_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | PIOTROSKI_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | PIOTROSKI_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | PIOTROSKI_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | PIOTROSKI_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | PIOTROSKI_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | PIOTROSKI_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | PIOTROSKI_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/prompts/retriever.prompt.md`

---

## piotroski_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("piotroski")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for piotroski | - |
| model | gemini-2.5-pro | PIOTROSKI_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | PIOTROSKI_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | PIOTROSKI_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | PIOTROSKI_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_piotroski_f_scores] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_piotroski_f_scores`: `/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | PIOTROSKI_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | PIOTROSKI_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | PIOTROSKI_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | PIOTROSKI_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | PIOTROSKI_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | PIOTROSKI_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | PIOTROSKI_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/prompts/analyst.prompt.md`

---

## piotroski_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("piotroski")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for piotroski | - |
| model | gemini-2.5-pro | PIOTROSKI_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | PIOTROSKI_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | PIOTROSKI_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | PIOTROSKI_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | PIOTROSKI_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | PIOTROSKI_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | PIOTROSKI_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | PIOTROSKI_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | PIOTROSKI_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | PIOTROSKI_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | PIOTROSKI_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/piotroski/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## piotroski_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("piotroski")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for piotroski analysis | - |
| model | gemini-2.5-flash | PIOTROSKI_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | PIOTROSKI_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | PIOTROSKI_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | PIOTROSKI_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | PIOTROSKI_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | PIOTROSKI_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | PIOTROSKI_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | PIOTROSKI_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | PIOTROSKI_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | PIOTROSKI_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | PIOTROSKI_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/piotroski/prompts/reporter.prompt.md`

---

## roychowdhury_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("roychowdhury")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for roychowdhury analysis | - |
| model | gemini-2.5-pro | ROYCHOWDHURY_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ROYCHOWDHURY_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ROYCHOWDHURY_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | ROYCHOWDHURY_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ROYCHOWDHURY_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ROYCHOWDHURY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ROYCHOWDHURY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ROYCHOWDHURY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ROYCHOWDHURY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ROYCHOWDHURY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ROYCHOWDHURY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/prompts/retriever.prompt.md`

---

## roychowdhury_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("roychowdhury")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for roychowdhury | - |
| model | gemini-2.5-pro | ROYCHOWDHURY_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ROYCHOWDHURY_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ROYCHOWDHURY_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | ROYCHOWDHURY_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_roychowdhury_models] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_roychowdhury_models`: `/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ROYCHOWDHURY_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ROYCHOWDHURY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ROYCHOWDHURY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ROYCHOWDHURY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ROYCHOWDHURY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ROYCHOWDHURY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ROYCHOWDHURY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/prompts/analyst.prompt.md`

---

## roychowdhury_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("roychowdhury")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for roychowdhury | - |
| model | gemini-2.5-pro | ROYCHOWDHURY_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ROYCHOWDHURY_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ROYCHOWDHURY_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | ROYCHOWDHURY_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ROYCHOWDHURY_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ROYCHOWDHURY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ROYCHOWDHURY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ROYCHOWDHURY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ROYCHOWDHURY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ROYCHOWDHURY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ROYCHOWDHURY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/roychowdhury/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## roychowdhury_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("roychowdhury")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for roychowdhury analysis | - |
| model | gemini-2.5-flash | ROYCHOWDHURY_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | ROYCHOWDHURY_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | ROYCHOWDHURY_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | ROYCHOWDHURY_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | ROYCHOWDHURY_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | ROYCHOWDHURY_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | ROYCHOWDHURY_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | ROYCHOWDHURY_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | ROYCHOWDHURY_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | ROYCHOWDHURY_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | ROYCHOWDHURY_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/roychowdhury/prompts/reporter.prompt.md`

---

## smoothing_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("smoothing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for smoothing analysis | - |
| model | gemini-2.5-pro | SMOOTHING_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | SMOOTHING_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | SMOOTHING_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | SMOOTHING_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | SMOOTHING_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SMOOTHING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | SMOOTHING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SMOOTHING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SMOOTHING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SMOOTHING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | SMOOTHING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/prompts/retriever.prompt.md`

---

## smoothing_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("smoothing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for smoothing | - |
| model | gemini-2.5-pro | SMOOTHING_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | SMOOTHING_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | SMOOTHING_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | SMOOTHING_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_smoothing_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_smoothing_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | SMOOTHING_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SMOOTHING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | SMOOTHING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SMOOTHING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SMOOTHING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SMOOTHING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | SMOOTHING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/prompts/analyst.prompt.md`

---

## smoothing_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("smoothing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for smoothing | - |
| model | gemini-2.5-pro | SMOOTHING_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | SMOOTHING_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | SMOOTHING_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | SMOOTHING_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | SMOOTHING_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SMOOTHING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | SMOOTHING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SMOOTHING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SMOOTHING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SMOOTHING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | SMOOTHING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/smoothing/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## smoothing_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("smoothing")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for smoothing analysis | - |
| model | gemini-2.5-flash | SMOOTHING_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | SMOOTHING_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | SMOOTHING_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | SMOOTHING_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | SMOOTHING_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | SMOOTHING_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | SMOOTHING_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | SMOOTHING_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | SMOOTHING_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | SMOOTHING_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | SMOOTHING_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/smoothing/prompts/reporter.prompt.md`

---

## valuation_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("valuation")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for valuation analysis | - |
| model | gemini-2.5-pro | VALUATION_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | VALUATION_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | VALUATION_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | VALUATION_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | VALUATION_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | VALUATION_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | VALUATION_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | VALUATION_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | VALUATION_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | VALUATION_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | VALUATION_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/prompts/retriever.prompt.md`

---

## valuation_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("valuation")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for valuation | - |
| model | gemini-2.5-pro | VALUATION_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | VALUATION_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | VALUATION_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | VALUATION_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_valuation_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_valuation_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | VALUATION_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | VALUATION_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | VALUATION_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | VALUATION_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | VALUATION_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | VALUATION_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | VALUATION_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/prompts/analyst.prompt.md`

---

## valuation_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("valuation")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for valuation | - |
| model | gemini-2.5-pro | VALUATION_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | VALUATION_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | VALUATION_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | VALUATION_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | VALUATION_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | VALUATION_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | VALUATION_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | VALUATION_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | VALUATION_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | VALUATION_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | VALUATION_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/valuation/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## valuation_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("valuation")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for valuation analysis | - |
| model | gemini-2.5-flash | VALUATION_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | VALUATION_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | VALUATION_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | VALUATION_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | VALUATION_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | VALUATION_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | VALUATION_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | VALUATION_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | VALUATION_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | VALUATION_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | VALUATION_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/valuation/prompts/reporter.prompt.md`

---

## working_capital_retriever

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/agent.py`
**Type**: Agent
**Factory**: `create_retriever_agent("working_capital")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | retriever | - |
| description | Retrieves financial data for working_capital analysis | - |
| model | gemini-2.5-pro | WORKING_CAPITAL_RETRIEVER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | WORKING_CAPITAL_RETRIEVER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | WORKING_CAPITAL_RETRIEVER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | input_metrics | WORKING_CAPITAL_RETRIEVER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | WORKING_CAPITAL_RETRIEVER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | WORKING_CAPITAL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | WORKING_CAPITAL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | WORKING_CAPITAL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | WORKING_CAPITAL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | WORKING_CAPITAL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | WORKING_CAPITAL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/prompts/retriever.prompt.md`

---

## working_capital_analyst

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/agent.py`
**Type**: Agent
**Factory**: `create_analyst_agent("working_capital")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | analyst | - |
| description | Analyzes financial data for working_capital | - |
| model | gemini-2.5-pro | WORKING_CAPITAL_ANALYST_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | WORKING_CAPITAL_ANALYST_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | WORKING_CAPITAL_ANALYST_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | analysed_factors | WORKING_CAPITAL_ANALYST_OUTPUT_KEY |
| tools | [calculate_all_working_capital_metrics] | - |
| include_contents | "none" | - |

| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `calculate_all_working_capital_metrics`: `/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/tools.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | WORKING_CAPITAL_ANALYST_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | WORKING_CAPITAL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | WORKING_CAPITAL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | WORKING_CAPITAL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | WORKING_CAPITAL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | WORKING_CAPITAL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | WORKING_CAPITAL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/prompts/analyst.prompt.md`

---

## working_capital_benchmarker

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/agent.py`
**Type**: Agent
**Factory**: `create_benchmarker_agent("working_capital")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | benchmarker | - |
| description | Benchmarks financial analysis for working_capital | - |
| model | gemini-2.5-pro | WORKING_CAPITAL_BENCHMARKER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | WORKING_CAPITAL_BENCHMARKER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | WORKING_CAPITAL_BENCHMARKER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | benchmarking_results | WORKING_CAPITAL_BENCHMARKER_OUTPUT_KEY |
| tools | [get_all_benchmark_and_score_all_year] | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Tools
- `get_all_benchmark_and_score_all_year`: `/home/mauro/projects/lynx/workflow/tools/get_percentile.py`

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | WORKING_CAPITAL_BENCHMARKER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | WORKING_CAPITAL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | WORKING_CAPITAL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | WORKING_CAPITAL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | WORKING_CAPITAL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | WORKING_CAPITAL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | WORKING_CAPITAL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/prompts/benchmarker.prompt.md`

### Static Context
- `/home/mauro/projects/lynx/training/concerns/working_capital/description.md`
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`

---

## working_capital_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/agent.py`
**Type**: Agent
**Factory**: `create_reporter_agent("working_capital")`

| Property | Value | Env Var |
|----------|-------|---------|
| name | reporter | - |
| description | Generates final report for working_capital analysis | - |
| model | gemini-2.5-flash | WORKING_CAPITAL_REPORTER_MODEL or SPECIALISTS_COMMON_MODEL |
| temperature | 0.0 | WORKING_CAPITAL_REPORTER_TEMPERATURE or SPECIALISTS_COMMON_TEMPERATURE |
| max_output_tokens | 65535 | WORKING_CAPITAL_REPORTER_MAX_OUTPUT_TOKENS or SPECIALISTS_COMMON_MAX_OUTPUT_TOKENS |
| output_key | final_report | WORKING_CAPITAL_REPORTER_OUTPUT_KEY |
| tools | none | - |
| include_contents | "none" | - |
| disallow_transfer_to_parent | true | - |
| disallow_transfer_to_peers | true | - |

### Planner
| Property | Value | Env Var |
|----------|-------|---------|
| type | BuiltInPlanner | - |
| thinking_config.thinking_budget | 8192 | WORKING_CAPITAL_REPORTER_THINKING_BUDGET or SPECIALISTS_COMMON_THINKING_BUDGET |

### HTTP Options
| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 300000ms | WORKING_CAPITAL_RETRY_TIMEOUT or SPECIALISTS_COMMON_RETRY_TIMEOUT |
| retry_options.initial_delay | 1.0s | WORKING_CAPITAL_RETRY_INITIAL_DELAY or SPECIALISTS_COMMON_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | WORKING_CAPITAL_RETRY_MAX_DELAY or SPECIALISTS_COMMON_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | WORKING_CAPITAL_RETRY_MULTIPLIER or SPECIALISTS_COMMON_RETRY_MULTIPLIER |
| retry_options.attempts | 5 | WORKING_CAPITAL_RETRY_MAX_ATTEMPTS or SPECIALISTS_COMMON_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | WORKING_CAPITAL_RETRY_HTTP_STATUS_CODES or SPECIALISTS_COMMON_RETRY_HTTP_STATUS_CODES |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/working_capital/prompts/reporter.prompt.md`


---

# Compiler Module (23 scorers + 2 agents = 25 agents)

## Compiler HTTP Options

| Property | Value | Env Var |
|----------|-------|---------|
| timeout | 3600000ms | COMPILER_RETRY_TIMEOUT × 1000 |
| retry_options.initial_delay | 1.0s | COMPILER_RETRY_INITIAL_DELAY |
| retry_options.max_delay | 60.0s | COMPILER_RETRY_MAX_DELAY |
| retry_options.exp_base | 2.0 | COMPILER_RETRY_MULTIPLIER |
| retry_options.attempts | 50 | COMPILER_RETRY_MAX_ATTEMPTS |
| retry_options.http_status_codes | [429, 500, 502, 503, 504] | COMPILER_RETRY_HTTP_STATUS_CODES |


---

## scorer_altmanz

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_altmanz |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_altmanz_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "altmanz"
- `{specialist_report}` - Content of the altmanz specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_assets

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_assets |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_assets_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "assets"
- `{specialist_report}` - Content of the assets specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_benford

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_benford |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_benford_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "benford"
- `{specialist_report}` - Content of the benford specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_business_model

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_business_model |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_business_model_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "business_model"
- `{specialist_report}` - Content of the business_model specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_cash

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_cash |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_cash_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "cash"
- `{specialist_report}` - Content of the cash specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_cf_dechow

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_cf_dechow |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_cf_dechow_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "cf_dechow"
- `{specialist_report}` - Content of the cf_dechow specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_cf_jones

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_cf_jones |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_cf_jones_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "cf_jones"
- `{specialist_report}` - Content of the cf_jones specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_credit

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_credit |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_credit_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "credit"
- `{specialist_report}` - Content of the credit specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_governance

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_governance |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_governance_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "governance"
- `{specialist_report}` - Content of the governance specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_growth

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_growth |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_growth_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "growth"
- `{specialist_report}` - Content of the growth specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_gunny

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_gunny |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_gunny_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "gunny"
- `{specialist_report}` - Content of the gunny specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_income

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_income |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_income_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "income"
- `{specialist_report}` - Content of the income specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_interim

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_interim |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_interim_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "interim"
- `{specialist_report}` - Content of the interim specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_investing

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_investing |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_investing_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "investing"
- `{specialist_report}` - Content of the investing specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_jones

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_jones |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_jones_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "jones"
- `{specialist_report}` - Content of the jones specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_margins

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_margins |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_margins_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "margins"
- `{specialist_report}` - Content of the margins specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_miscellaneous

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_miscellaneous |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_miscellaneous_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "miscellaneous"
- `{specialist_report}` - Content of the miscellaneous specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_mscore

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_mscore |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_mscore_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "mscore"
- `{specialist_report}` - Content of the mscore specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_piotroski

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_piotroski |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_piotroski_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "piotroski"
- `{specialist_report}` - Content of the piotroski specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_roychowdhury

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_roychowdhury |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_roychowdhury_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "roychowdhury"
- `{specialist_report}` - Content of the roychowdhury specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_smoothing

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_smoothing |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_smoothing_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "smoothing"
- `{specialist_report}` - Content of the smoothing specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_valuation

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_valuation |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_valuation_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "valuation"
- `{specialist_report}` - Content of the valuation specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## scorer_working_capital

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | scorer_working_capital |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | scorer_working_capital_results |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/specialist_scorer.prompt.md`

### Prompt Variables
- `{specialist_name}` = "working_capital"
- `{specialist_report}` - Content of the working_capital specialist's report
- `{factors_map}`, `{clusters_map}`, `{weights_table}`

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## compiler_consolidator

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | consolidator |
| model | gemini-2.5-pro |
| temperature | 0.0 |
| output_key | synthesis |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/consolidator.prompt.md`

### Prompt Variables
- `{specialist_results}` - Outputs from all scorer agents
- `{factors_map}` - Risk factors reference
- `{clusters_map}` - Risk clusters reference
- `{weights_table}` - Lynx weights table

### Static Context Files
- `/home/mauro/projects/lynx/workflow/static/factors_map.json`
- `/home/mauro/projects/lynx/workflow/static/clusters_map.json`

---

## compiler_reporter

**File**: `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/agent.py`
**Type**: Agent

| Property | Value |
|----------|-------|
| name | reporter |
| model | gemini-2.5-flash |
| temperature | 0.0 |
| output_key | final_report |
| tools | none |

### Prompt File
`/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/reporter.prompt.md`

### Prompt Variables
- `{template}` - Report template markdown
- `{synthesis}` - Output from consolidator

### Static Context Files
- `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/prompts/report-template.md`

---

# Summary

## Agent Count

| Module | Agents |
|--------|--------|
| CAGX | 4 |
| SRAG | 2 |
| DocPrep | 2 |
| LynxTool | 2 |
| Specialists (23 × 4) | 92 |
| Compiler (23 scorers + 2) | 25 |
| **Total** | **127** |

## Configuration Files Reference

| Module | Config File |
|--------|-------------|
| CAGX | `/home/mauro/projects/lynx/workflow/CAGX/config.py` |
| SRAG | `/home/mauro/projects/lynx/workflow/SRAG/retriever/config.py` |
| DocPrep | `/home/mauro/projects/lynx/workflow/docprep/config.py` |
| LynxTool | `/home/mauro/projects/lynx/workflow/lynxtool/config.py` |
| Specialists | `/home/mauro/projects/lynx/workflow/analysis/generic/config.py` |
| Compiler | `/home/mauro/projects/lynx/workflow/analysis/specialists/compiler/config.py` |

## Factory Functions Reference

| Agent Type | Factory Function | File |
|------------|------------------|------|
| Retriever | `create_retriever_agent(specialist_name)` | `/home/mauro/projects/lynx/workflow/analysis/generic/retriever_agent.py` |
| Analyst | `create_analyst_agent(specialist_name, tool)` | `/home/mauro/projects/lynx/workflow/analysis/generic/analyst_agent.py` |
| Benchmarker | `create_benchmarker_agent(specialist_name)` | `/home/mauro/projects/lynx/workflow/analysis/generic/benchmarker_agent.py` |
| Reporter | `create_reporter_agent(specialist_name)` | `/home/mauro/projects/lynx/workflow/analysis/generic/reporter_agent.py` |
