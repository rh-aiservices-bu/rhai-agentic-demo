# Local Deployment Guide

**Check out the [Demo Arcade](https://interact.redhat.com/share/BgvP9hA8HJrkXtOQbvCj) to see this demo in action!**

This directory contains everything needed to deploy the Llama Stack demo locally using Podman Compose.

## Quick Start Options

Choose one of the following deployment options based on your preference:

### Option A: Using Local Ollama (Recommended for local development)

1. **Install and start Ollama:**
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Pull and run the model
   ollama run llama3.2:3b-instruct-fp16 --keepalive 60m
   ```

2. **Start services with Ollama:**
   ```bash
   ./deploy-local.sh --ollama up
   ```

3. **Register MCP toolgroups:**
   ```bash
   ./deploy-local.sh register
   ```

### Option B: Using Remote vLLM Endpoints

1. **Set up environment variables:**
   ```bash
   export LLM_URL=https://your-vllm-endpoint.com/v1
   export LLM_URL2=https://your-second-vllm-endpoint.com/v1
   export VLLM_API_TOKEN=your-primary-api-token
   export VLLM_API_TOKEN2=your-secondary-api-token
   export INFERENCE_MODEL=llama32-3b
   export INFERENCE_MODEL2=granite-3-8b-instruct
   ```

2. **Start services with vLLM:**
   ```bash
   ./deploy-local.sh up
   ```

3. **Register MCP toolgroups:**
   ```bash
   ./deploy-local.sh register
   ```

### Access the Services

- Llama Stack: http://localhost:5001
- PostgreSQL: localhost:5432
- MCP CRM Server: http://localhost:8000
- MCP PDF Server: http://localhost:8010  
- MCP Slack Server: http://localhost:8001
- MCP Upload Server: http://localhost:8002
- UI: http://localhost:8501

## Files

- `podman-compose.yaml` - Main compose file defining all services
- `deploy-local.sh` - Automation script for deployment
- `run-vllm.yaml` - Llama Stack configuration for vLLM
- `run-ollama.yaml` - Llama Stack configuration for Ollama
- `import.sql` - Database initialization script

## Services Deployed

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| **postgres** | 5432 | PostgreSQL database with sample data |
| **llama-stack** | 5001 | Llama Stack with vLLM inference |
| **ui** | 8501 | Streamlit web interface |

### MCP Servers

| Service | External Port | Internal Port | Description | Dependencies |
|---------|---------------|---------------|-------------|--------------|
| **mcp-crm** | 8000 | 8080 | CRM operations | PostgreSQL |
| **mcp-pdf** | 8010 | 8080 | PDF processing | Chromium |
| **mcp-slack** | 8001 | 8080 | Slack integration | Slack API credentials |
| **mcp-upload** | 8002 | 8080 | File upload handling | None |
> **Note**: External ports are what you access from localhost (e.g., `http://localhost:8000`). Internal ports are used for container-to-container communication within the compose network.


## Environment Variables

### Required
- `LLM_URL` - Primary vLLM endpoint URL
- `LLM_URL2` - Secondary vLLM endpoint URL

### Optional
- `VLLM_API_TOKEN` - API token for primary vLLM endpoint
- `VLLM_API_TOKEN2` - API token for second vLLM endpoint
- `INFERENCE_MODEL` - Primary model name (default: llama32-3b)
- `INFERENCE_MODEL2` - Secondary model name (default: granite-3-8b-instruct)
- `LLAMA_STACK_PORT` - Llama Stack port (default: 5001)
- `SLACK_BOT_TOKEN` - Slack bot token (required for Slack MCP)
- `SLACK_TEAM_ID` - Slack team ID (required for Slack MCP)

## Usage Examples

### Basic deployment with remote vLLM
```bash
# Set up remote endpoints
export LLM_URL=https://your-vllm-endpoint.com/v1
export LLM_URL2=https://your-second-vllm-endpoint.com/v1
export VLLM_API_TOKEN=your-primary-api-token
export VLLM_API_TOKEN2=your-secondary-api-token

# Start core services
./deploy-local.sh up

# Register MCP toolgroups
./deploy-local.sh register

# Verify toolgroup registration
./deploy-local.sh checktools
```

### Local deployment with Ollama
```bash
# Start Ollama with model (in separate terminal)
ollama run llama3.2:3b-instruct-fp16 --keepalive 60m

# Start services with Ollama configuration
./deploy-local.sh --ollama up

# Register toolgroups
./deploy-local.sh register

# Verify toolgroup registration
./deploy-local.sh checktools
```


### Custom port
```bash
# Use different port for Llama Stack
./deploy-local.sh --port 8080 up
```

### Slack integration
```bash
# Set up Slack credentials
export SLACK_BOT_TOKEN=xoxb-your-token-here
export SLACK_TEAM_ID=T-your-team-id

# Deploy with Slack support
./deploy-local.sh up
```

## Commands

| Command | Description |
|---------|-------------|
| `up` | Start all services |
| `down` | Stop all services |
| `restart` | Restart all services |
| `logs` | Show logs for all services |
| `status` | Show status of all services |
| `register` | Register MCP toolgroups with Llama Stack |
| `checktools` | Check registered toolgroups and show their status |
| `clean` | Remove all containers and volumes |
| `reset` | Force cleanup existing containers before deployment |

## Options

| Option | Description |
|--------|-------------|
| `--ollama` | Use Ollama instead of remote vLLM endpoints |
| `--port PORT` | Set Llama Stack port (default: 5001) |
| `--help` | Show help message |

## Troubleshooting

### Check service health
```bash
./deploy-local.sh status
```

### View logs
```bash
./deploy-local.sh logs
```

### Restart specific service
```bash
podman-compose -f podman-compose.yaml restart <service-name>
```

### Check MCP registration
```bash
# Using the deploy script
./deploy-local.sh checktools

# Or manually with curl
curl http://localhost:5001/v1/toolgroups
```

### Common Issues

1. **Container name conflicts**: If you see "container name already in use" errors:
   ```bash
   ./deploy-local.sh reset
   ./deploy-local.sh up
   ```

2. **Platform warnings**: If you see "image platform does not match" warnings on ARM64 (Apple Silicon), these are safe to ignore

3. **Services not starting**: Check if ports are already in use:
   ```bash
   ./deploy-local.sh status
   ./deploy-local.sh logs
   ```

4. **MCP registration fails**: Ensure Llama Stack is healthy before registering:
   ```bash
   curl http://localhost:5001/health
   ./deploy-local.sh register
   ```

5. **Database connection errors**: Verify PostgreSQL is running and accessible

6. **Slack MCP not working**: Check if SLACK_BOT_TOKEN and SLACK_TEAM_ID are set

7. **Complete cleanup needed**: If services are in an inconsistent state:
   ```bash
   ./deploy-local.sh clean
   ./deploy-local.sh up
   ```

### Service Dependencies

The services have the following startup order:
1. PostgreSQL (required by CRM MCP)
2. Llama Stack (required for MCP registration)
3. MCP Servers (can start in parallel)
4. UI (requires Llama Stack)

## Manual Deployment

If you prefer to set up services manually or need more control over the deployment process, you can deploy individual components:

### Database Setup
```bash
podman run -it --name postgres \
  -e POSTGRES_USER=claimdb \
  -e POSTGRES_PASSWORD=claimdb \
  -v ./import.sql:/docker-entrypoint-initdb.d/import.sql:ro \
  -p 5432:5432 \
  -v /var/lib/data \
  -d postgres
```

### Llama Stack Setup

#### Option A: With Ollama (Local)
```bash
# Start Ollama first
ollama run llama3.2:3b-instruct-fp16 --keepalive 60m

# Then start Llama Stack configured for Ollama
podman run -d --name llama-stack \
  -p 5001:5001 \
  -v ./run-vllm.yaml:/root/my-run.yaml:ro \
  -e INFERENCE_MODEL=llama3.2:3b-instruct-fp16 \
  -e OLLAMA_URL=http://host.containers.internal:11434 \
  docker.io/llamastack/distribution-remote-vllm:0.2.1 \
  --port 5001 --yaml-config /root/my-run.yaml
```

#### Option B: With Remote vLLM
```bash
export LLM_URL=https://your-vllm-endpoint.com/v1
export LLM_URL2=https://your-second-vllm-endpoint.com/v1
export VLLM_API_TOKEN2=your-api-token
export INFERENCE_MODEL=llama32-3b
export INFERENCE_MODEL2=granite-3-8b-instruct

podman run -d --name llama-stack \
  -p 5001:5001 \
  -v ./run-vllm.yaml:/root/my-run.yaml:ro \
  -e INFERENCE_MODEL=$INFERENCE_MODEL \
  -e INFERENCE_MODEL2=$INFERENCE_MODEL2 \
  -e VLLM_URL=$LLM_URL \
  -e VLLM_URL2=$LLM_URL2 \
  -e VLLM_API_TOKEN2=$VLLM_API_TOKEN2 \
  docker.io/llamastack/distribution-remote-vllm:0.2.1 \
  --port 5001 --yaml-config /root/my-run.yaml
```

### MCP Servers (Manual Container Deployment)

#### CRM Server
```bash
podman run -d --name mcp-crm \
  -p 8000:8080 \
  -e NPM_CONFIG_CACHE=/tmp/.npm \
  -e DB_USER=claimdb \
  -e DB_PASSWORD=claimdb \
  -e DB_HOST=host.containers.internal \
  -e DB_NAME=claimdb \
  quay.io/rh-aiservices-bu/mcp-servers:crm \
  npx -y supergateway --stdio "node app/index.js" --port 8080
```

#### PDF Server
```bash
podman run -d --name mcp-pdf \
  -p 8010:8080 \
  -e NPM_CONFIG_CACHE=/tmp/.npm \
  -e XDG_CONFIG_HOME=/tmp/.chromium \
  -e XDG_CACHE_HOME=/tmp/.chromium \
  -e M2P_OUTPUT_DIR=/mcp_output \
  -v pdf_chrome_data:/tmp/chrome-user-data \
  -v pdf_crashpad:/tmp/crashpad \
  -v pdf_chromium:/tmp/.chromium \
  -v pdf_output:/mcp_output \
  quay.io/rh-aiservices-bu/mcp-servers:pdf \
  npx -y supergateway --stdio "node build/index.js" --port 8080
```


#### Slack Server
```bash
podman run -d --name mcp-slack \
  -p 8001:8080 \
  -e NPM_CONFIG_CACHE=/tmp/.npm \
  -e SLACK_BOT_TOKEN=xoxb-your-token-here \
  -e SLACK_TEAM_ID=T-your-team-id \
  quay.io/rh-aiservices-bu/mcp-servers:slack \
  npx -y supergateway --stdio "node dist/index.js" --port 8080
```

#### Upload Server
```bash
podman run -d --name mcp-upload \
  -p 8002:8080 \
  -e NPM_CONFIG_CACHE=/tmp/.npm \
  quay.io/rh-aiservices-bu/mcp-servers:upload \
  npx -y supergateway --stdio "node dist/index.js" --port 8080
```

### Create required volumes for PDF server
```bash
podman volume create pdf_chrome_data
podman volume create pdf_crashpad
podman volume create pdf_chromium
podman volume create pdf_output
```

## Manual MCP Registration

If automatic registration fails, you can register MCP toolgroups manually:

```bash
# CRM MCP
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::crm", "mcp_endpoint" :{ "uri" : "http://mcp-crm:8080/sse"}}' \
  http://localhost:5001/v1/toolgroups


# PDF MCP
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::pdf", "mcp_endpoint" :{ "uri" : "http://mcp-pdf:8080/sse"}}' \
  http://localhost:5001/v1/toolgroups

# Slack MCP
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::slack", "mcp_endpoint" :{ "uri" : "http://mcp-slack:8080/sse"}}' \
  http://localhost:5001/v1/toolgroups

# Upload MCP
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::upload", "mcp_endpoint" :{ "uri" : "http://mcp-upload:8080/sse"}}' \
  http://localhost:5001/v1/toolgroups
```

## Cleanup

To completely remove all containers, volumes, and images:

```bash
./deploy-local.sh clean
```

This will remove:
- All running containers
- All volumes (including database data)
- Downloaded container images