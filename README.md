# Red Hat Summit Agentic Demo

Agentic AI Demo Repository for the Red Hat Summit 2025 Booth


Start postgres:

```
podman run -it --name postgres \
  -e POSTGRES_USER=claimdb \
  -e POSTGRES_PASSWORD=claimdb \
  -v ./local/import.sql:/docker-entrypoint-initdb.d/import.sql:ro \
  -p 5432:5432 \
  -v /var/lib/data \
  -d postgres
  ```

  Start the MCP CRM service

```sh
cd mcp-servers/crm
npm install
```

Set the required database environment variables:

```sh
export DB_USER=claimdb
export DB_HOST=localhost
export DB_NAME=claimdb
export DB_PASSWORD=claimdb
```

Run the MCP server using `npx`:

```sh
npx -y supergateway --stdio "node app/index.js"
```

## Register the MCP toolgroup

`export LLAMA_STACK_PORT=5001`


```
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::crm", "mcp_endpoint" :{ "uri" : "http://host.containers.internal:8000/sse"}}' \
  http://localhost:$LLAMA_STACK_PORT/v1/toolgroups
```

## python sandbox

install deno with `brew install deno`

Run the python sandbox mcp server

```
deno run \
  -N -R=node_modules -W=node_modules --node-modules-dir=auto \
  jsr:@pydantic/mcp-run-python sse

```

Register the MCP server

```
curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::python", "mcp_endpoint" :{ "uri" : "http://host.containers.internal:3001/sse"}}' \
  http://localhost:$LLAMA_STACK_PORT/v1/toolgroups

```

## UI

To run the ui, build it first with podman;

`cd ui`

`podman build -t ui .`

Run the ui connecting to a local instance of Llama Stack on port 5001

`podman run -p 8501:8501 -e LLAMA_STACK_ENDPOINT=http://host.containers.internal:5001 ui`

## Register PDF MCP


curl -X POST -H "Content-Type: application/json" \
  --data '{ "provider_id" : "model-context-protocol", "toolgroup_id" : "mcp::pdf", "mcp_endpoint" :{ "uri" : "http://host.containers.internal:8010/sse"}}' \
  http://localhost:$LLAMA_STACK_PORT/v1/toolgroups
