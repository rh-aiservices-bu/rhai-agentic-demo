import os

import fire
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger
from llama_stack_client.types.agent_create_params import AgentConfig
from termcolor import colored


def main(host: str, port: int):

    client = LlamaStackClient(
        base_url=f"http://{host}:{port}",
        provider_data={"tavily_search_api_key": os.getenv("TAVILY_SEARCH_API_KEY")},
    )

    available_shields = [shield.identifier for shield in client.shields.list()]
    if not available_shields:
        print(colored("No available shields. Disabling safety.", "yellow"))
    else:
        print(f"Available shields found: {available_shields}")

    available_models = [
        model.identifier for model in client.models.list() if model.model_type == "llm"
    ]
    if not available_models:
        print(colored("No available models. Exiting.", "red"))
        return
    else:
        selected_model = available_models[0]
        print(f"Using model: {selected_model}")

    agent_config = AgentConfig(
        model=selected_model,
        instructions="You are a helpful assistant",
        sampling_params={
            "strategy": {"type": "top_p", "temperature": 1.0, "top_p": 0.9},
        },
        toolgroups=(
            [
                "mcp::slack",
                #"builtin::websearch",
                #"mcp::pdf",
                "mcp::crm",
                # "mcp::python",
            ]
        ),
        tool_choice="auto",
        input_shields=available_shields if available_shields else [],
        output_shields=available_shields if available_shields else [],
        enable_session_persistence=False,
    )
    agent = Agent(client, agent_config)

    user_prompts = [
        "Review the current opportunities for ACME",
        "Post a slack message in the agentic-ai-slack channel with the opportunities",
        "Get a list of support cases for the account",
        "Post a slack message in the agentic-ai-slack channel with the list of support cases",
        "Determine the status of the account, e.g. unhappy, happy etc. based on the cases",
        "Post a slack message in the agentic-ai-slack channel with the status of the account",
    ]

    session_id = agent.create_session("test-session")

    for prompt in user_prompts:
        response = agent.create_turn(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            session_id=session_id,
        )

        for log in EventLogger().log(response):
            log.print()


if __name__ == "__main__":
    fire.Fire(main)
