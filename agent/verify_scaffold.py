import sys
import os

# Add parent directory to path so concierge_agent can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")
try:
    from google.adk.agents import LlmAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    print("[OK] ADK and GenAI SDK imported successfully.")
except ImportError as e:
    print(f"[FAIL] Failed to import ADK or GenAI modules: {e}")
    sys.exit(1)

try:
    from concierge_agent import root_agent
    print("[OK] concierge_agent package and root_agent imported successfully.")
    print(f"  Agent Name: {root_agent.name}")
    print(f"  Agent Model: {root_agent.model}")
    print(f"  Registered Tools: {[tool.__name__ for tool in root_agent.tools]}")
except Exception as e:
    print(f"[FAIL] Failed to import/initialize concierge_agent: {e}")
    sys.exit(1)

print("\n[OK] Scaffolding imports and configuration check PASSED!")
