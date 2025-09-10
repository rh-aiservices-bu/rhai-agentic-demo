# Models as a Service (MaaS) Configuration

This guide explains how to configure the demo to use external Models as a Service (MaaS) endpoints instead of deploying models locally.

## Prerequisites

- Access to MaaS endpoints for:
  - Llama 3.2-3B compatible model
  - Granite 3.3-8B compatible model
- API tokens for authentication

## Configuration Steps

### 1. Access Your MaaS Instance

Get the following information from your MaaS provider:
- **Endpoint URLs** (must be OpenAI-compatible `/v1` format)
- **Model identifiers** (exact names as registered in MaaS)
- **API tokens** for authentication

### 2. Update Configuration File

Edit the file: `kubernetes/deploy-demo/overlays/maas/llama-stack-maas-patch.yaml`

Update these environment variables:

```yaml
# Model identifiers (use exact names from your MaaS)
- name: LLAMA3B_MODEL
  value: "your-llama-model-name"
- name: GRANITE_MODEL
  value: "your-granite-model-name"

# MaaS endpoint URLs (must end with /v1)
- name: LLAMA3B_URL
  value: "https://your-llama-endpoint.com/v1"
- name: GRANITE_URL
  value: "https://your-granite-endpoint.com/v1"

# API tokens
- name: LLAMA_VLLM_API_TOKEN
  value: "your-llama-api-token"
- name: GRANITE_VLLM_API_TOKEN
  value: "your-granite-api-token"
```

### 3. Deploy

```bash
# Set namespace variable
export NAMESPACE=rhai-agentic-demo

# Create namespace first
oc create namespace $NAMESPACE

# Deploy to namespace
oc apply -k kubernetes/deploy-demo/overlays/maas
```

## Example Configuration

```yaml
# Example with Red Hat AI Services MaaS
- name: LLAMA3B_MODEL
  value: "llama-3-2-3b"
- name: GRANITE_MODEL
  value: "granite-3-3-8b-instruct"
- name: LLAMA3B_URL
  value: "https://llama-endpoint.apps.rhoai.example.com/v1"
- name: GRANITE_URL
  value: "https://granite-endpoint.apps.rhoai.example.com/v1"
- name: LLAMA_VLLM_API_TOKEN
  value: "abc123def456"
- name: GRANITE_VLLM_API_TOKEN
  value: "xyz789uvw012"
```

## Verification

After deployment, check that the Llama Stack service can connect to your MaaS endpoints:

```bash
# Check Llama Stack logs
oc logs deployment/llamastack-deployment -n $NAMESPACE

# Test model availability
oc exec deployment/llamastack-deployment -n $NAMESPACE -- curl -s http://localhost:8321/v1/models

# Get demo UI URL to access the application
oc get route -n $NAMESPACE ui --template='https://{{.spec.host}}{{"\n"}}'
```