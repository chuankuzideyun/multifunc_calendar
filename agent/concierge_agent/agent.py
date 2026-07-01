from google.adk.agents import LlmAgent
from .prompts import AGENT_INSTRUCTION
from .tools import ALL_TOOLS

root_agent = LlmAgent(
    name="concierge_agent",
    model="gemini-2.0-flash",
    instruction=AGENT_INSTRUCTION,
    tools=ALL_TOOLS,
)
