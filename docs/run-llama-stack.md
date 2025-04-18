## Run an instance of Llama Stack with two vllm models

### Setup the environment variables

```
export LLM_URL=https://xxx/v1
export LLM_URL2=https://xxxxx:443/v1
export VLLM_API_TOKEN2=
export INFERENCE_MODEL=llama32-3b
export INFERENCE_MODEL2=granite-3-8b-instruct
export LLAMA_STACK_PORT=5001
```

### Run Llama Stack with Podman

```
podman run \
  -it \
  -v ./local/run-vllm.yaml:/root/my-run.yaml \
  -p $LLAMA_STACK_PORT:$LLAMA_STACK_PORT \
  docker.io/llamastack/distribution-remote-vllm:0.2.1 \
  --port $LLAMA_STACK_PORT \
  --yaml-config /root/my-run.yaml \
  --env INFERENCE_MODEL=$INFERENCE_MODEL \
  --env INFERENCE_MODEL2=$INFERENCE_MODEL2 \
  --env VLLM_URL=$LLM_URL \
  --env VLLM_URL2=$LLM_URL2 \
  --env VLLM_API_TOKEN2=$VLLM_API_TOKEN2
```