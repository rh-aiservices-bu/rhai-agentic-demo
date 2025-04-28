# Setup Instructions for Markdown to PDF MCP

## Run locally with npx

Follow the steps below to set up and run the Markdown to PDF MCP project.

```bash
# Clone the repository
git clone https://github.com/2b3pro/markdown2pdf-mcp.git

# Navigate to the project directory
cd markdown2pdf-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start the server on port 8010
npx -y supergateway --stdio "node build/index.js" --port 8010
```

## Build Containerfile

```sh
podman build -t mcp_server:pdf --platform="linux/amd64" .
```

```sh
podman run --rm mcp_server:pdf
```

```sh
podman run --rm quay.io/rh-aiservices-bu/mcp-servers:pdf
```