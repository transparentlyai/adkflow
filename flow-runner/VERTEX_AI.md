# Using ADKFlow with Vertex AI

This guide explains how to use ADKFlow with Google Cloud Vertex AI instead of Google AI Studio.

## Why Use Vertex AI?

- **Enterprise-grade**: Better for production deployments
- **Security**: Uses Application Default Credentials (ADC) instead of API keys
- **Integration**: Seamless integration with other GCP services
- **Compliance**: Better for regulated industries
- **Scalability**: Enterprise-level quotas and SLAs

## Prerequisites

1. **Google Cloud Project**: You need an active GCP project
2. **Vertex AI API**: Enabled in your project
3. **gcloud CLI**: Installed and configured
4. **Permissions**: Vertex AI User role or equivalent

## Setup Steps

### 1. Install gcloud CLI

If not already installed:

```bash
# For Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# For macOS (with Homebrew)
brew install google-cloud-sdk
```

Verify installation:
```bash
gcloud --version
```

### 2. Authenticate with Application Default Credentials

```bash
# Login to your Google Cloud account
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login
```

This will open a browser window for authentication. Follow the prompts.

### 3. Set Your Project

```bash
# Set the active project
gcloud config set project YOUR_PROJECT_ID

# Verify
gcloud config get-value project
```

### 4. Enable Vertex AI API

```bash
# Enable the API
gcloud services enable aiplatform.googleapis.com

# Verify
gcloud services list --enabled | grep aiplatform
```

### 5. Configure ADKFlow for Vertex AI

Create or edit `/home/mauro/projects/adkflow/flow-runner/.env`:

```env
# Use Vertex AI
GOOGLE_API_KEY=vertex

# Your GCP project ID
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional: Region (default: us-central1)
GOOGLE_CLOUD_REGION=us-central1
```

Or set environment variables directly:

```bash
export GOOGLE_API_KEY=vertex
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=us-central1  # Optional
```

### 6. Test Your Setup

```bash
# Verify ADC is working
gcloud auth application-default print-access-token

# Test with ADKFlow
adkflow run examples/simple-workflow.yaml --verbose
```

## Usage

Once configured, use ADKFlow normally:

```bash
# Run workflows
adkflow run workflow.yaml --verbose

# With variables
adkflow run workflow.yaml \
  --var question="What is AI?" \
  --verbose

# Validate workflows
adkflow validate workflow.yaml
```

The runner will automatically detect `GOOGLE_API_KEY=vertex` and use Vertex AI with ADC.

## Regions

Vertex AI is available in multiple regions. Choose one close to your users or resources:

- `us-central1` (Iowa) - Default
- `us-east1` (South Carolina)
- `us-west1` (Oregon)
- `europe-west1` (Belgium)
- `europe-west4` (Netherlands)
- `asia-northeast1` (Tokyo)
- `asia-southeast1` (Singapore)

Set the region:
```bash
export GOOGLE_CLOUD_REGION=europe-west1
```

## Permissions

Your account needs these IAM roles:

- **Vertex AI User** (`roles/aiplatform.user`) - Minimum required
- **Service Account User** (`roles/iam.serviceAccountUser`) - If using service accounts

Grant permissions:
```bash
# Grant Vertex AI User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/aiplatform.user"
```

## Using Service Accounts

For production deployments, use service accounts:

### 1. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create adkflow-runner \
  --display-name="ADKFlow Workflow Runner"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:adkflow-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### 2. Download Service Account Key

```bash
gcloud iam service-accounts keys create ~/adkflow-sa-key.json \
  --iam-account=adkflow-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Use Service Account

```bash
# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=~/adkflow-sa-key.json

# Or specify when running
GOOGLE_APPLICATION_CREDENTIALS=~/adkflow-sa-key.json adkflow run workflow.yaml
```

## Troubleshooting

### Error: "GOOGLE_CLOUD_PROJECT environment variable is required"

**Solution**: Set your project ID:
```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
```

### Error: "Permission denied" or "Forbidden"

**Solutions**:
1. Verify you have Vertex AI User role:
   ```bash
   gcloud projects get-iam-policy YOUR_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.role:roles/aiplatform.user"
   ```

2. Re-authenticate:
   ```bash
   gcloud auth application-default login
   ```

3. Check API is enabled:
   ```bash
   gcloud services list --enabled | grep aiplatform
   ```

### Error: "Invalid authentication credentials"

**Solutions**:
1. Refresh ADC:
   ```bash
   gcloud auth application-default login
   ```

2. Verify token:
   ```bash
   gcloud auth application-default print-access-token
   ```

3. Check for expired credentials:
   ```bash
   # Revoke and re-authenticate
   gcloud auth application-default revoke
   gcloud auth application-default login
   ```

### Error: "Quota exceeded"

**Solution**: Check your Vertex AI quotas in the GCP Console:
- Go to IAM & Admin > Quotas
- Filter for "Vertex AI"
- Request quota increase if needed

### Model Not Available in Region

**Solution**: Check model availability by region:
- Some models are only available in specific regions
- Try a different region or model
- See: https://cloud.google.com/vertex-ai/docs/generative-ai/learn/models

## Switching Between AI Studio and Vertex AI

You can easily switch between Google AI Studio and Vertex AI:

### Use AI Studio (API Key)
```bash
export GOOGLE_API_KEY=your_actual_api_key_here
adkflow run workflow.yaml
```

### Use Vertex AI (ADC)
```bash
export GOOGLE_API_KEY=vertex
export GOOGLE_CLOUD_PROJECT=your-project-id
adkflow run workflow.yaml
```

## Cost Considerations

Vertex AI pricing differs from AI Studio:
- **AI Studio**: Free tier available, pay-per-use beyond that
- **Vertex AI**: Enterprise pricing, no free tier, but more predictable

Check current pricing:
- AI Studio: https://ai.google.dev/pricing
- Vertex AI: https://cloud.google.com/vertex-ai/pricing

## Best Practices

1. **Use Service Accounts in Production**: Don't rely on user credentials
2. **Rotate Keys Regularly**: If using service account keys
3. **Use Workload Identity**: For GKE deployments
4. **Set Resource Limits**: Use quotas to control costs
5. **Monitor Usage**: Set up billing alerts
6. **Use Regional Endpoints**: For lower latency
7. **Enable Audit Logs**: For compliance and debugging

## Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Set to `"vertex"` for Vertex AI |
| `GOOGLE_CLOUD_PROJECT` | Yes (for Vertex AI) | - | Your GCP project ID |
| `GOOGLE_CLOUD_REGION` | No | `us-central1` | Vertex AI region |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | - | Path to service account key (optional) |

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Vertex AI Quotas](https://cloud.google.com/vertex-ai/docs/quotas)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)

## Support

For issues specific to:
- **ADKFlow**: Check project documentation
- **Vertex AI**: GCP Support or Stack Overflow
- **Authentication**: Google Cloud Identity documentation
