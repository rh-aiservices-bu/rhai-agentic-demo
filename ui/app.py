import streamlit as st
import os

def main():
    # Display the logo at the top of the sidebar


    tool_page = st.Page("page/playground/tools.py", title="Account Insights", icon="🛠", default=False)

    resources_page = st.Page("page/distribution/resources.py", title="Resources", icon="🔍", default=False)
    provider_page = st.Page("page/distribution/providers.py", title="API Providers", icon="🔍", default=False)

    pg = st.navigation(
        {
            "Playground": [tool_page],
        },
        expanded=False,
    )
    with st.sidebar:
        if os.path.exists("logo_sm.png"):
            st.image("logo_sm.png", use_container_width=False, width=200)
        else:
            st.warning("⚠️ 'logo_sm.png' not found. Make sure it's in the same directory.")

    pg.run()

if __name__ == "__main__":
    main()
