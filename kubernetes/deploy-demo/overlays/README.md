# Deployment Overlays

This directory contains Kustomize overlays for different deployment scenarios of the Red Hat AI Agentic Demo.

## Available Overlays

### 1. Default Overlay (`default/`)

**Use case**: Deploy models locally on the OpenShift cluster using KServe inference services.

**Includes**:
- Local LLM inference services (`llama-serve/`)
- All supporting services (MCP servers, UI, database, etc.)

**Deploy command**:
```bash
# Set namespace variable
export NAMESPACE=rhai-agentic-demo

# Create namespace first
oc create namespace $NAMESPACE

# Deploy to namespace
oc apply -k kubernetes/deploy-demo/overlays/default
```

**Requirements**:
- OpenShift AI 2.16+
- GPU nodes (2 GPUs with minimum 24GiB VRAM each)
- Supports NVIDIA and Intel Habana Gaudi GPUs

### 2. MaaS Overlay (`maas/`)

**Use case**: Connect to external Models as a Service (MaaS) endpoints instead of deploying models locally.

**Includes**:
- All supporting services (MCP servers, UI, database, etc.)
- **Excludes**: Local LLM inference services (`llama-serve/`)

**Deploy command**:
```bash
# 1. Update MaaS endpoints in the patch file
# Edit kubernetes/deploy-demo/overlays/maas/llama-stack-maas-patch.yaml
# Update LLAMA3B_URL, GRANITE_URL and API tokens

# 2. Set namespace variable
export NAMESPACE=rhai-agentic-demo

# 3. Create namespace first
oc create namespace $NAMESPACE

# 4. Deploy to namespace
oc apply -k kubernetes/deploy-demo/overlays/maas
```

**Configuration required**:
Before deploying the MaaS overlay, update `llama-stack-maas-patch.yaml` with:
- `LLAMA3B_URL`: Your external Llama 3.2-3B endpoint  
- `GRANITE_URL`: Your external Granite 3.3-8B endpoint
- `LLAMA_VLLM_API_TOKEN`: API token for Llama endpoint
- `GRANITE_VLLM_API_TOKEN`: API token for Granite endpoint

**Benefits**:
- No GPU requirements on the OpenShift cluster
- Reduced resource usage
- Scalable model serving through external services
- Faster deployment (no model downloads)

## Comparison

| Feature | Default Overlay | MaaS Overlay |
|---------|----------------|--------------|
| GPU Requirements | Yes (2 GPUs, 24GiB each) | None |
| Model Deployment | Local on cluster | External endpoints |
| Resource Usage | High | Low |
| Setup Complexity | Medium | Low |
| External Dependencies | None | MaaS endpoints |
| Offline Capability | Yes | No |

## Switching Between Overlays

To switch from one overlay to another:

```bash
# Remove current deployment
oc delete -k kubernetes/deploy-demo/overlays/[current-overlay]

# Deploy new overlay
oc apply -k kubernetes/deploy-demo/overlays/[new-overlay]
```

## Customization

You can create additional overlays by:
1. Creating a new directory under `overlays/`
2. Adding a `kustomization.yaml` file
3. Adding any necessary patch files
4. Referencing the base or other overlays as needed