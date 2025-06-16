#!/bin/bash

# Deploy Demo Locally - Automation Script
# This script automates the deployment of Llama Stack, MCP servers, and associated services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
LLAMA_STACK_PORT=${LLAMA_STACK_PORT:-5001}
USE_OLLAMA=${USE_OLLAMA:-false}

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v podman &> /dev/null; then
        print_error "podman could not be found. Please install podman first."
        exit 1
    fi
    
    if ! command -v podman-compose &> /dev/null; then
        print_warning "podman-compose not found. Trying docker-compose..."
        if ! command -v docker-compose &> /dev/null; then
            print_error "Neither podman-compose nor docker-compose found. Please install one of them."
            exit 1
        else
            COMPOSE_CMD="docker-compose"
        fi
    else
        COMPOSE_CMD="podman-compose"
    fi
    
    print_success "Dependencies check passed. Using $COMPOSE_CMD"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  up        Start all services"
    echo "  down      Stop all services"
    echo "  logs      Show logs for all services"
    echo "  status    Show status of all services"
    echo "  restart   Restart all services"
    echo "  register  Register MCP toolgroups with Llama Stack"
    echo "  checktools Check registered toolgroups"
    echo "  clean     Remove all containers and volumes"
    echo "  reset     Force cleanup existing containers before deployment"
    echo ""
    echo "Options:"
    echo "  --ollama          Use Ollama instead of remote vLLM"
    echo "  --port PORT       Llama Stack port (default: 5001)"
    echo "  --help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  LLM_URL           Remote vLLM endpoint URL"
    echo "  LLM_URL2          Second remote vLLM endpoint URL"
    echo "  VLLM_API_TOKEN    API token for primary vLLM endpoint"
    echo "  VLLM_API_TOKEN2   API token for second vLLM endpoint"
    echo "  INFERENCE_MODEL   First model name (default: llama32-3b)"
    echo "  INFERENCE_MODEL2  Second model name (default: granite-3-8b-instruct)"
    echo "  SLACK_BOT_TOKEN   Slack bot token (for Slack MCP server)"
    echo "  SLACK_TEAM_ID     Slack team ID (for Slack MCP server)"
}

# Export environment variables
setup_environment() {
    print_status "Setting up environment..."
    
    export LLAMA_STACK_PORT=${LLAMA_STACK_PORT}
    
    if [[ "$USE_OLLAMA" == "true" ]]; then
        print_status "Configuring for Ollama deployment..."
        export LLAMA_CONFIG="run-ollama.yaml"
        export LLAMA_STACK_IMAGE="docker.io/llamastack/distribution-ollama:0.2.9"
        export INFERENCE_MODEL=${OLLAMA_MODEL:-llama3.2:3b-instruct-fp16}
        export OLLAMA_URL=${OLLAMA_URL:-http://host.containers.internal:11434}
        export OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2:3b-instruct-fp16}
        
        print_warning "Make sure Ollama is running with: ollama run ${OLLAMA_MODEL:-llama3.2:3b-instruct-fp16} --keepalive 60m"
    else
        print_status "Configuring for vLLM deployment..."
        export LLAMA_CONFIG="run-vllm.yaml"
        export LLAMA_STACK_IMAGE="docker.io/llamastack/distribution-remote-vllm:0.2.9"
        export INFERENCE_MODEL=${INFERENCE_MODEL:-llama32-3b}
        export INFERENCE_MODEL2=${INFERENCE_MODEL2:-granite-3-8b-instruct}
        
        # Check required environment variables for vLLM
        if [[ -z "${LLM_URL:-}" ]]; then
            print_warning "LLM_URL not set. Please set it to your remote vLLM endpoint."
            print_warning "Example: export LLM_URL=https://your-vllm-endpoint.com/v1"
        fi
        
        if [[ -z "${LLM_URL2:-}" ]]; then
            print_warning "LLM_URL2 not set. Please set it to your second remote vLLM endpoint."
        fi
    fi
    
    print_success "Environment setup complete"
}

# Build profiles based on options
build_profiles() {
    PROFILES=""
    echo $PROFILES
}

# Clean up existing containers if they exist
cleanup_existing_containers() {
    print_status "Cleaning up existing containers..."
    
    # List of container names from our compose
    containers=("postgres" "llama-stack" "mcp-crm" "mcp-pdf" "mcp-slack" "mcp-upload" "demo-ui")
    
    for container in "${containers[@]}"; do
        if podman container exists "$container" 2>/dev/null; then
            print_status "Removing existing container: $container"
            podman rm -f "$container" 2>/dev/null || true
        fi
    done
    
    # Also clean up any existing pods
    if podman pod exists llama-stack-network 2>/dev/null; then
        print_status "Removing existing pod: llama-stack-network"
        podman pod rm -f llama-stack-network 2>/dev/null || true
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    
    
    
    PROFILES=$(build_profiles)
    
    cd "$(dirname "$0")"
    
    # Clean up existing containers first
    cleanup_existing_containers
    
    print_status "Pulling latest images..."
    $COMPOSE_CMD -f podman-compose.yaml $PROFILES pull
    
    print_status "Starting containers..."
    $COMPOSE_CMD -f podman-compose.yaml $PROFILES up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_service_health
    
    print_success "All services started successfully!"
    print_status "Llama Stack is available at: http://localhost:$LLAMA_STACK_PORT"
    print_status "MCP CRM Server: http://localhost:8000"
    print_status "MCP PDF Server: http://localhost:8010"
    print_status "MCP Slack Server: http://localhost:8001"
    print_status "MCP Upload Server: http://localhost:8002"
    print_status "UI is available at: http://localhost:8501"
    
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    
    cd "$(dirname "$0")"
    $COMPOSE_CMD -f podman-compose.yaml down
    
    print_success "All services stopped"
}

# Show logs
show_logs() {
    cd "$(dirname "$0")"
    $COMPOSE_CMD -f podman-compose.yaml logs -f
}

# Show status
show_status() {
    cd "$(dirname "$0")"
    $COMPOSE_CMD -f podman-compose.yaml ps
}

# Restart services
restart_services() {
    print_status "Restarting services..."
    stop_services
    start_services
}

# Check service health
check_service_health() {
    print_status "Checking service health..."
    
    # Check PostgreSQL
    if podman exec postgres pg_isready -U claimdb > /dev/null 2>&1; then
        print_success "PostgreSQL is healthy"
    else
        print_warning "PostgreSQL is not ready yet"
    fi
    
    # Check Llama Stack
    if curl -f http://localhost:$LLAMA_STACK_PORT/health > /dev/null 2>&1; then
        print_success "Llama Stack is healthy"
    else
        print_warning "Llama Stack is not ready yet"
    fi
}

# Register MCP toolgroups
register_mcp_toolgroups() {
    print_status "Registering MCP toolgroups with Llama Stack..."
    
    # Wait for Llama Stack to be ready
    print_status "Waiting for Llama Stack to be ready..."
    timeout=60
    while ! curl -f http://localhost:$LLAMA_STACK_PORT/v1/models > /dev/null 2>&1; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            print_error "Timeout waiting for Llama Stack to be ready"
            exit 1
        fi
    done
    
    # Register CRM MCP
    print_status "Registering CRM MCP toolgroup..."
    curl -X POST -H "Content-Type: application/json" \
        --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::crm", "mcp_endpoint" :{ "uri" : "http://mcp-crm:8080/sse"}}' \
        http://localhost:$LLAMA_STACK_PORT/v1/toolgroups || print_warning "Failed to register CRM MCP"
    
    # Register PDF MCP
    print_status "Registering PDF MCP toolgroup..."
    curl -X POST -H "Content-Type: application/json" \
        --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::pdf", "mcp_endpoint" :{ "uri" : "http://mcp-pdf:8080/sse"}}' \
        http://localhost:$LLAMA_STACK_PORT/v1/toolgroups || print_warning "Failed to register PDF MCP"
    
    # Register Slack MCP
    print_status "Registering Slack MCP toolgroup..."
    curl -X POST -H "Content-Type: application/json" \
        --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::slack", "mcp_endpoint" :{ "uri" : "http://mcp-slack:8080/sse"}}' \
        http://localhost:$LLAMA_STACK_PORT/v1/toolgroups || print_warning "Failed to register Slack MCP"
    
    # Register Upload MCP
    print_status "Registering Upload MCP toolgroup..."
    curl -X POST -H "Content-Type: application/json" \
        --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::upload", "mcp_endpoint" :{ "uri" : "http://mcp-upload:8080/sse"}}' \
        http://localhost:$LLAMA_STACK_PORT/v1/toolgroups || print_warning "Failed to register Upload MCP"
    
    print_success "MCP toolgroups registration completed"
}

# Check registered toolgroups
check_registered_tools() {
    print_status "Checking registered toolgroups..."
    
    # Get and display registered toolgroups
    print_status "Fetching registered toolgroups from http://localhost:$LLAMA_STACK_PORT/v1/toolgroups"
    curl -s http://localhost:$LLAMA_STACK_PORT/v1/toolgroups | jq '.' 2>/dev/null || {
        print_warning "jq not available, showing raw output:"
        curl -s http://localhost:$LLAMA_STACK_PORT/v1/toolgroups
    }
}

# Clean up everything
clean_all() {
    print_status "Cleaning up all containers and volumes..."
    
    cd "$(dirname "$0")"
    
    # First try compose down
    $COMPOSE_CMD -f podman-compose.yaml down -v --remove-orphans 2>/dev/null || true
    
    # Force cleanup containers
    cleanup_existing_containers
    
    # Remove volumes
    print_status "Removing volumes..."
    volumes=("postgres_data" "pdf_chrome_data" "pdf_crashpad" "pdf_chromium" "pdf_output")
    for volume in "${volumes[@]}"; do
        if podman volume exists "$volume" 2>/dev/null; then
            print_status "Removing volume: $volume"
            podman volume rm -f "$volume" 2>/dev/null || true
        fi
    done
    
    # Remove images if they exist
    print_status "Removing images..."
    images=(
        "quay.io/rh-aiservices-bu/mcp-servers:crm"
        "quay.io/rh-aiservices-bu/mcp-servers:pdf"
        "quay.io/rh-aiservices-bu/mcp-servers:slack"
        "quay.io/rh-aiservices-bu/mcp-servers:upload"
        "docker.io/llamastack/distribution-remote-vllm:0.2.9"
        "docker.io/llamastack/distribution-ollama:0.2.9"
        "localhost/ui:latest"
        "localhost/local_ui:latest"
    )
    
    for image in "${images[@]}"; do
        if podman image exists "$image" 2>/dev/null; then
            print_status "Removing image: $image"
            podman rmi -f "$image" 2>/dev/null || true
        fi
    done
    
    print_success "Cleanup completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ollama)
            USE_OLLAMA=true
            shift
            ;;
        --port)
            LLAMA_STACK_PORT="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        up|down|logs|status|restart|register|clean|reset|checktools)
            COMMAND="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check if command is provided
if [[ -z "${COMMAND:-}" ]]; then
    print_error "No command provided"
    usage
    exit 1
fi

# Main execution
check_dependencies
setup_environment

case $COMMAND in
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    restart)
        restart_services
        ;;
    register)
        register_mcp_toolgroups
        ;;
    checktools)
        check_registered_tools
        ;;
    clean)
        clean_all
        ;;
    reset)
        cleanup_existing_containers
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac