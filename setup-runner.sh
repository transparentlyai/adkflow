#!/bin/bash

# ADKFlow Flow Runner Setup Script
# Installs the flow-runner CLI tool

set -e

echo "🚀 Setting up ADKFlow Flow Runner..."
echo ""

# Check if we're in the right directory
if [ ! -d "flow-runner" ]; then
    echo "❌ Error: flow-runner directory not found"
    echo "Please run this script from the adkflow project root"
    exit 1
fi

cd flow-runner

# Check for uv
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv package manager..."
    pip install uv
fi

# Install the flow-runner
echo "📥 Installing adkflow CLI..."
uv pip install -e .

echo ""
echo "✅ Flow Runner installed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Copy .env.example to .env"
echo "  2. Add your GOOGLE_API_KEY to .env"
echo "  3. Run: adkflow --help"
echo ""
echo "💡 Quick test:"
echo "  adkflow validate ../examples/simple-workflow.yaml"
echo ""
