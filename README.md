# Red Hat AI Agentic Demo

Red Hat Agentic AI Demo Repository for ParaCloud

![Demo](./docs/images/demo.gif)

## 🎮 Try the Demo Live!

**Check out the [Demo Arcade](https://interact.redhat.com/share/BgvP9hA8HJrkXtOQbvCj) to see this demo in action!**

Experience the full agentic AI workflow with real-time interactions across multiple systems including CRM, PDF generation, and Slack integrations.

---

*This is a work-in-progress (WIP) repository, and modifications will be made.*

## 1. Architecture

The demo architecture consists of the following components:

![Demo Topology Diagram](./docs/images/demo2.png)

- **UI / Frontend**: Receives user requests and displays responses.
- **Llama-Stack Server**: Orchestrates interactions with the LLMs and MCP servers.
- **MCP Servers**: Integrate with external systems such as CRM, PDF generation, Process Reports, and Slack.
- **LLMs**: Models (Granite 3.2-8B and Llama 3.2-3B) deployed on OpenShift AI.

### 1.1 Flow Overview

1. The **UI Frontend** receives the user request.
2. The **Llama-Stack Server** processes the request, communicates with the LLMs, and selects the appropriate tools.
3. The **MCP Servers** handle interactions with CRM, PDF generation, Process Reports and Slack.
4. The **LLMs** (Granite 3.2-8B and Llama 3.2-3B) reason over the data and generate a contextualized response.
5. The **UI Frontend** displays the final response back to the user.

## 2. Setup

### 2.1 Prerequisites

* OpenShift Cluster 4.17+
* OpenShift AI 2.16+
* 2 GPUs with a minimum of 24GiB VRAM each
    * Supports both NVIDIA and Intel Habana Gaudi GPUs :)

### 2.2 Deploy the demo in OpenShift / OpenShift AI

```sh
export NAMESPACE=rhai-agentic-demo

oc create namespace $NAMESPACE
```


Before deploying, configure the integrations:

1. **Set up Slack Bot Token and Team ID**:
   ```sh
   export SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"
   export SLACK_TEAM_ID="your-slack-team-id"
   ```

#### How to get Slack credentials:

- **SLACK_BOT_TOKEN**: Create a Slack app at https://api.slack.com/apps, go to "OAuth & Permissions", and copy the "Bot User OAuth Token" (starts with `xoxb-`)
- **SLACK_TEAM_ID**: Found in your Slack workspace URL (e.g., `https://your-team-id.slack.com`) or in your app's "Basic Information" page

2. **Update the Slack secret configuration**:
   ```sh
   envsubst < kubernetes/mcp-servers/slack/slack-secret.yaml | oc apply -f -
   ```

3. **Configure PDF Route URL** (update the route URL in the PDF deployment):
   ```sh
   CONSOLE_URL=$(oc whoami --show-console)
   CLUSTER_DOMAIN=$(echo $CONSOLE_URL | cut -d'/' -f3 | sed 's/console-openshift-console\.apps\.//')
   NAMESPACE=$(oc project -q)
   PDF_ROUTE_URL="https://pdf-files-${NAMESPACE}.apps.${CLUSTER_DOMAIN}"
   
   sed -i '' "s|https://pdf-files-NAMESPACE.apps.CLUSTER-DOMAIN.com|${PDF_ROUTE_URL}|g" kubernetes/mcp-servers/pdf/pdf-deployment.yaml
   ```

4. **Deploy the demo**:

   **Default deployment (with local GPU inference):**
   ```sh
   # Deploy to namespace
   oc apply -k kubernetes/deploy-demo/overlays/default
   ```

   **Don't have GPUs in your cluster? Want to use MaaS (Models as a Service)?**

   See [MaaS configuration guide](./docs/maas.md) for setup instructions.

   ```sh
   # Deploy to namespace
   oc apply -k kubernetes/deploy-demo/overlays/maas
   ```

The demo topology diagram in OpenShift is the following:

![Demo Topology Diagram](./docs/images/demo1.png)

and the LLMs used in this demo deployed in OpenShift AI are the following:

![Models Deployed](./docs/images/demo3.png)

### 2.2 Deploy the demo locally

If you prefer to run the demo locally for development or testing purposes, follow the instructions in the [local deployment guide](./docs/deploy-demo-local.md)

### 2.3 Access the Demo

After deployment, get the UI route to access the demo:

```sh
# Get the demo UI URL
oc get route -n $NAMESPACE ui --template='https://{{.spec.host}}{{"\n"}}'

# Or get route with grep
oc get route -n $NAMESPACE | grep ui
```

Access the demo using the URL from the route output.

## 3. Sample Requests

Here are some example prompts to interact with the system:

```
Review the current opportunities for ACME corp
Get a list of support cases for the account
Determine the status of the account, e.g. unhappy, happy etc. based on the cases
Generate a PDF document with a summary of the support cases and the account status.
Send a summary of the account plus a link to download the pdf via slack to the general channel
```