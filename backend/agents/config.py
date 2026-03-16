import os
from .core import LiteLlm, Agent
from .prompts import jury_prompt, jury_report_critic_prompt, jury_final_response_prompt
from .tools import naiverag_retrieve_tool

# API Keys (loaded from .env by load_dotenv() in app.py)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Gemini 2.0 Flash — all three agents
gemini_model = LiteLlm(
    model="gemini/gemini-flash-latest",
    api_key=GEMINI_API_KEY
)

# Gemini 1.5 Flash — used for all engines as fallback for invalid/limited keys
deepseek_model = gemini_model

# Aliases — maintained for compatibility with feature engines
# Now all pointing to API-based Gemini models
jury_model = gemini_model
critic_model = gemini_model
llama_model = gemini_model       # Legacy alias
mistral_model = gemini_model     # Legacy alias
standard_model = deepseek_model  # API-based DeepSeek

# Agent factories
def create_jury_agent(name, model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_prompt.PROMPT,
        model=model,
        tools=[naiverag_retrieve_tool]
    )

def create_critic_agent(name, model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_report_critic_prompt.PROMPT,
        model=model
    )

def create_judge_agent(name="Judge", model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_final_response_prompt.PROMPT,
        model=model
    )
