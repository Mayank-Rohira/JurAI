import os
from .core import LiteLlm, Agent
from .prompts import jury_prompt, jury_report_critic_prompt, jury_final_response_prompt
from .tools import naiverag_retrieve_tool

# --- Models ---
# Using Groq (Llama 3.3 70B & 3.1 8B) for high-speed, high-quality legal reasoning
llama_model = LiteLlm(
    model="groq/llama-3.3-70b-versatile",
)

# Critic: Groq Llama 3.3 70B
mistral_model = LiteLlm(
    model="groq/llama-3.3-70b-versatile",
)

# Standard model for features (Llama 3.1 8B Instant is still supported)
standard_model = LiteLlm(
    model="groq/llama-3.1-8b-instant",
)


# --- Agents ---

def create_jury_agent(name, model=llama_model):
    return Agent(
        name=name,
        instruction=jury_prompt.PROMPT,
        model=model,
        tools=[naiverag_retrieve_tool] 
    )

def create_critic_agent(name, model=mistral_model):
    return Agent(
        name=name,
        instruction=jury_report_critic_prompt.PROMPT,
        model=model
    )

def create_judge_agent(name="Judge", model=mistral_model):
    return Agent(
        name=name,
        instruction=jury_final_response_prompt.PROMPT,
        model=model
    )
