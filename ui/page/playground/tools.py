import uuid

import streamlit as st
from llama_stack_client import Agent

from llama_stack.distribution.ui.modules.api import llama_stack_api

def account_analysis_page():
    # Inject CSS styles for theme and layout
    st.markdown("""
        <style>
            .main {
                background-color: #d0d7dd;
            }
            .block-container {
                padding-top: 2rem;
            }
            header {visibility: hidden;}
            footer {visibility: hidden;}
            .reportview-container .markdown-text-container {
                font-family: 'Segoe UI', sans-serif;
                color: #1e2a38;
            }
        </style>
    """, unsafe_allow_html=True)



    st.title("ParasolCloud: Account Insights Tool")

    client = llama_stack_api.client
    models = client.models.list()
    model_list = [model.identifier for model in models if model.api_model_type == "llm"]

    tool_groups = client.toolgroups.list()
    tool_groups_list = [tool_group.identifier for tool_group in tool_groups]
    mcp_tools_list = [tool for tool in tool_groups_list if tool.startswith("mcp::")]
    builtin_tools_list = [tool for tool in tool_groups_list if not tool.startswith("mcp::")]

    def reset_agent():
        st.session_state.clear()
        st.cache_resource.clear()

    with st.sidebar:
        st.subheader("Model Selection")
        model = st.selectbox(label="LLM Models", options=model_list, on_change=reset_agent)

        st.subheader("Select ToolGroups")
        toolgroup_selection = st.pills(
            label="Internal Tools", options=builtin_tools_list, selection_mode="multi", on_change=reset_agent
        )

        if "builtin::rag" in toolgroup_selection:
            vector_dbs = llama_stack_api.client.vector_dbs.list() or []
            if not vector_dbs:
                st.info("No vector databases found.")
            vector_dbs = [vector_db.identifier for vector_db in vector_dbs]
            selected_vector_dbs = st.multiselect(
                label="Select Knowledge Sources for RAG",
                options=vector_dbs,
                on_change=reset_agent,
            )

        st.subheader("MCP Integrations")
        mcp_selection = st.pills(
            label="CRM/Support Tools", options=mcp_tools_list, selection_mode="multi", on_change=reset_agent
        )

        toolgroup_selection.extend(mcp_selection)

        active_tool_list = []
        for toolgroup_id in toolgroup_selection:
            active_tool_list.extend(
                [
                    f"{''.join(toolgroup_id.split('::')[1:])}:{t.identifier}"
                    for t in client.tools.list(toolgroup_id=toolgroup_id)
                ]
            )

        st.subheader(f"🛠 Active Tools: {len(active_tool_list)}")
        st.json(active_tool_list)

        st.subheader("Chat Configuration")
        max_tokens = st.slider(
            "Max Tokens",
            min_value=0,
            max_value=8126,
            value=3000,
            step=1,
            help="Max token length for responses",
            on_change=reset_agent,
        )

    for i, tool_name in enumerate(toolgroup_selection):
        if tool_name == "builtin::rag":
            tool_dict = dict(
                name="builtin::rag",
                args={
                    "vector_db_ids": list(selected_vector_dbs),
                },
            )
            toolgroup_selection[i] = tool_dict

    @st.cache_resource
    def create_agent():
        return Agent(
            client,
            model=model,
            instructions=(
                "You are a helpful account insights analyst working for ParasolCloud. "
                "You help teams analyze customer accounts to identify risk, surface opportunity, "
                "and summarize recent support history. Use the available tools as needed to "
                "query CRM, support data, or relevant documents."
            ),
            tools=["mcp::crm", "mcp::pdf"],
            tool_config={"tool_choice": "auto"},
            sampling_params={"strategy": {"type": "greedy"}, "max_tokens": max_tokens},
        )

    agent = create_agent()

    if "agent_session_id" not in st.session_state:
        st.session_state["agent_session_id"] = agent.create_session(session_name=f"account_insight_{uuid.uuid4()}")

    session_id = st.session_state["agent_session_id"]

    if "messages" not in st.session_state:
        st.session_state["messages"] = [{"role": "assistant", "content": "Enter the details of the customer analysis you want to perform"}]

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    prompt_raw = st.text_area("Ask about an account, risk, or opportunity:", height=150, key="multi_input")
    submit = st.button("Analyze", use_container_width=True)

    if submit and prompt_raw.strip():
        prompts = prompt_raw.splitlines()

        for single_prompt in prompts:
            turn_response = agent.create_turn(
                session_id=session_id,
                messages=[{"role": "user", "content": single_prompt}],
                stream=True,
            )

            def response_generator(turn_response):
                for response in turn_response:
                    if hasattr(response.event, "payload"):
                        if response.event.payload.event_type == "step_progress":
                            if hasattr(response.event.payload.delta, "text"):
                                yield response.event.payload.delta.text
                        if response.event.payload.event_type == "step_complete":
                            if response.event.payload.step_details.step_type == "tool_execution":
                                yield " 🛠 "
                    else:
                        yield f"Error from Llama Stack: {response}"

            with st.chat_message("assistant"):
                response = st.write_stream(response_generator(turn_response))

            st.session_state.messages.append({"role": "assistant", "content": response})

account_analysis_page()
