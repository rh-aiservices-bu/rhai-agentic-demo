# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the terms described in the LICENSE file in
# the root directory of this source tree.

import uuid

import streamlit as st
from llama_stack_client import Agent

from llama_stack.distribution.ui.modules.api import llama_stack_api


def tool_chat_page():
    st.title("ParasolCloud Account Insights Tool")

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
        model = st.selectbox(label="Available models", options=model_list, on_change=reset_agent)

        # MCP Servers comes first now
        mcp_label_map = {
            "mcp::crm": "Sales & support portal",
            "mcp::pdf": "Document generator",
            "mcp::slack": "Slack integration",
            "mcp::upload": "Report Processor",
        }
        mcp_display_options = [mcp_label_map.get(tool, tool) for tool in mcp_tools_list]
        mcp_label_to_tool = {mcp_label_map.get(k, k): k for k in mcp_tools_list}

        st.subheader("MCP Servers")
        mcp_display_selection = st.pills(
            label="Available MCP Servers",
            options=mcp_display_options,
            selection_mode="multi",
            default=mcp_display_options,
            on_change=reset_agent,
        )
        mcp_selection = [mcp_label_to_tool[label] for label in mcp_display_selection]

        # Builtin Tools comes after
        builtin_label_map = {
            "builtin::websearch": "Web search",
            "builtin::rag": "Retrieval augmented generation",
            "builtin::code_interpreter": "Code generator",
            "builtin::wolfram_alpha": "Wolfram Alpha",
        }
        blt_display_options = [builtin_label_map.get(tool, tool) for tool in builtin_tools_list]
        blt_label_to_tool = {builtin_label_map.get(k, k): k for k in builtin_tools_list}

        st.subheader("Builtin Tools")
        blt_display_selection = st.pills(
            label="Available Builtin Tools",
            options=blt_display_options,
            selection_mode="multi",
            on_change=reset_agent,
        )
        toolgroup_selection = [blt_label_to_tool[label] for label in blt_display_selection]

        if "builtin::rag" in toolgroup_selection:
            vector_dbs = llama_stack_api.client.vector_dbs.list() or []
            if not vector_dbs:
                st.info("No vector databases available for selection.")
            vector_dbs = [vector_db.identifier for vector_db in vector_dbs]
            selected_vector_dbs = st.multiselect(
                label="Select Document Collections to use in RAG queries",
                options=vector_dbs,
                on_change=reset_agent,
            )

        # Final combined selection
        toolgroup_selection.extend(mcp_selection)

        # Build list of active tools
        active_tool_list = []
        for toolgroup_id in toolgroup_selection:
            active_tool_list.extend(
                [
                    f"{''.join(toolgroup_id.split('::')[1:])}:{t.identifier}"
                    for t in client.tools.list(toolgroup_id=toolgroup_id)
                ]
            )

        # Advanced settings
        with st.expander("Advanced Settings", expanded=False):
            st.subheader("Chat Configurations")
            max_tokens = st.slider(
                "Max Tokens",
                min_value=0,
                max_value=9000,
                value=9000,
                step=1,
                help="The maximum number of tokens to generate",
                on_change=reset_agent,
            )
            st.subheader(f"Active Tools: 🛠 {len(active_tool_list)}")
            st.json(active_tool_list)




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
            instructions="You are a helpful AI assistant, responsible for helping me find and communicate information back to my team. You have access to a number of tools. Whenever a tool is called, be sure return the Response in a friendly and helpful tone. When you are asked to find out about opportunities and support cases you must use a tool. If you need to create a pdf you must use a tool, create the content for the pdf as simple markdown formatted as tables where possible and add this markdown to the start of the generated markdown:  '![ParasolCloud Logo](https://i.postimg.cc/MHZB5tmL/Screenshot-2025-04-21-at-5-58-46-PM.png) *Secure Cloud Solutions for a Brighter Business* \n --- \n'  ",
            tools=["mcp::crm", "mcp::pdf", "mcp::slack", "mcp::upload"],
            tool_config={"tool_choice":"auto"},
            sampling_params={"strategy": {"type": "greedy"}, "max_tokens": max_tokens},
        )

    agent = create_agent()

    if "agent_session_id" not in st.session_state:
        st.session_state["agent_session_id"] = agent.create_session(session_name=f"tool_demo_{uuid.uuid4()}")

    session_id = st.session_state["agent_session_id"]

    if "messages" not in st.session_state:
        st.session_state["messages"] = [{"role": "assistant", "content": "Enter the details of the customer analysis you want to perform"}]

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    prompt_raw = st.text_area("Enter the details of the analysis you want to perform", height=150, key="multi_input")
    submit = st.button("Go", use_container_width=True)

    if submit and prompt_raw.strip():
        print(model)
        prompts = prompt_raw.splitlines()  # Converts input into an array of strings

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
                        yield f"Error occurred in the Llama Stack Cluster: {response}"

            with st.chat_message("assistant"):
                response = st.write_stream(response_generator(turn_response))

            st.session_state.messages.append({"role": "assistant", "content": response})



tool_chat_page()