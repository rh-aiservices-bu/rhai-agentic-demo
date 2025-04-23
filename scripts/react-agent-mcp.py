import os
import uuid

import fire
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.react.agent import ReActAgent
from llama_stack_client.lib.agents.react.tool_parser import ReActOutput
from llama_stack_client.lib.agents.event_logger import EventLogger
from termcolor import colored


def main(host: str, port: int):
    client = LlamaStackClient(
        base_url=f"http://{host}:{port}",
        provider_data={"tavily_search_api_key": os.getenv("TAVILY_SEARCH_API_KEY")},
    )

    available_models = [
        model.identifier for model in client.models.list() if model.model_type == "llm"
    ]
    if not available_models:
        print(colored("No available models. Exiting.", "red"))
        return

    selected_model = available_models[0]
    print(colored(f"Using model: {selected_model}", "green"))

    # Initialize ReActAgent with just websearch
    agent = ReActAgent(
        client=client,
        model=selected_model,
        tools=[
            # "builtin::websearch",
            # "mcp::slack",
            "mcp::pdf",
            # "mcp::crm",
            # "mcp::python",
            ],
        response_format={
            "type": "json_schema",
            "json_schema": ReActOutput.model_json_schema(),
        },
        sampling_params={
            "strategy": {"type": "top_p", "temperature": 1.0, "top_p": 0.9},
        },
        instructions="You are a helpful assistant",
        tool_config = {
            "tool_choice": "auto",
            "system_message_behavior": "replace",
        },
        max_infer_iters= 2,
    )

    session_id = agent.create_session(f"react-session-{uuid.uuid4().hex}")

    user_prompts = [
        #"What is the capital of Italy?",
        #"Post a slack message in the agentic-ai-slack channel 'C08P4G402HZ' with the result of the question 'What is the capital of Italy?'",
        "Create a pdf with 'Hello Agentic!' as text",
    ]

    for prompt in user_prompts:
        print(colored(f"User> {prompt}", "blue"))
        response = agent.create_turn(
            messages=[{"role": "user", "content": prompt}],
            session_id=session_id,
            stream=True,
        )

        for log in EventLogger().log(response):
            log.print()


if __name__ == "__main__":
    fire.Fire(main)
