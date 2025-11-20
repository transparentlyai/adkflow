# Vertex AI Support - Implementation Summary

## Overview

Added support for Google Cloud Vertex AI with Application Default Credentials (ADC) as an alternative to Google AI Studio API keys.

## What Changed

### 1. Flow Runner Executor (`flow-runner/src/adkflow/executor.py`)

**Change**: Enhanced `WorkflowExecutor.__init__()` to detect when `GOOGLE_API_KEY=vertex` and use Vertex AI client initialization.

**Key Logic**:
```python
if self.api_key.lower() == "vertex":
    # Use Vertex AI with ADC
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
    
    self.client = genai.Client(
        vertexai=True,
        project=project,
        location=location
    )
else:
    # Use standard API key
    self.client = genai.Client(api_key=self.api_key)
```

### 2. Environment Configuration (`.env.example`)

**Before**:
```env
GOOGLE_API_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT=your-project-id  # Optional
```

**After**:
```env
# Option 1: Google AI Studio
GOOGLE_API_KEY=your_api_key_here

# Option 2: Vertex AI with ADC
# GOOGLE_API_KEY=vertex
# GOOGLE_CLOUD_PROJECT=your-project-id  # Required for Vertex AI
# GOOGLE_CLOUD_REGION=us-central1  # Optional, default: us-central1
```

### 3. Documentation Updates

**New Files**:
- `flow-runner/VERTEX_AI.md` - Comprehensive Vertex AI setup guide

**Updated Files**:
- `flow-runner/QUICKSTART.md` - Added Vertex AI configuration section
- `GETTING_STARTED.md` - Added Vertex AI setup instructions
- `README.md` - Updated prerequisites to mention Vertex AI option

## Usage

### Google AI Studio (API Key) - Default
```bash
export GOOGLE_API_KEY="your-api-key-here"
adkflow run workflow.yaml
```

### Vertex AI (Application Default Credentials) - NEW
```bash
# 1. Authenticate
gcloud auth application-default login

# 2. Configure
export GOOGLE_API_KEY=vertex
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=us-central1  # Optional

# 3. Run
adkflow run workflow.yaml --verbose
```

## Benefits

1. **Enterprise-Ready**: Better for production deployments
2. **Security**: No API keys to manage, uses ADC
3. **GCP Integration**: Seamless integration with other Google Cloud services
4. **Compliance**: Better for regulated industries
5. **Easy Switching**: Toggle between AI Studio and Vertex AI with one env var

## Files Modified

```
flow-runner/
├── src/adkflow/executor.py     [MODIFIED] - Added Vertex AI client init
├── .env.example                [MODIFIED] - Added Vertex AI config
├── QUICKSTART.md               [MODIFIED] - Added Vertex AI section
├── VERTEX_AI.md                [NEW]      - Complete Vertex AI guide

Root:
├── README.md                   [MODIFIED] - Updated prerequisites
├── GETTING_STARTED.md          [MODIFIED] - Added Vertex AI setup
└── VERTEX_AI_CHANGES.md        [NEW]      - This file
```

## Testing

To test Vertex AI support:

```bash
# Setup
cd /home/mauro/projects/adkflow/flow-runner
gcloud auth application-default login
export GOOGLE_API_KEY=vertex
export GOOGLE_CLOUD_PROJECT=your-project-id

# Test
adkflow run ../examples/simple-workflow.yaml \
  --var question="Test Vertex AI" \
  --verbose
```

Expected output should show:
```
[blue]Using Vertex AI with Application Default Credentials[/blue]
[blue]Project: your-project-id, Location: us-central1[/blue]
[green]✓ Google ADK client initialized[/green]
```

## Backward Compatibility

✅ **100% Backward Compatible**

Existing usage with API keys continues to work exactly as before:
```bash
export GOOGLE_API_KEY=AIza...
adkflow run workflow.yaml
```

## No Breaking Changes

- All existing workflows run unchanged
- All existing documentation remains valid
- CLI interface unchanged
- API unchanged
- Only additive changes

## Requirements

For Vertex AI support, users need:
- gcloud CLI installed
- Vertex AI API enabled in GCP project
- Appropriate IAM permissions (Vertex AI User role)
- Active GCP project

For AI Studio (no changes):
- API key from https://aistudio.google.com/app/apikey

## Summary

This update adds **enterprise-grade Vertex AI support** while maintaining **full backward compatibility** with existing Google AI Studio workflows. Users can choose the authentication method that best fits their needs by simply changing one environment variable.
