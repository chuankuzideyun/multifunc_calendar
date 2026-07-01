# Antigravity AI Agent Backend

This is the Python AI Agent backend built with FastAPI and Google ADK 2.0. It exposes REST API endpoints for user chat, streaming responses, and health checks.

## Setup and Verification

1. **Initialize and Activate Virtual Environment**:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Windows CMD:
   .venv\Scripts\activate.bat
   # macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Dry-run Verification**:
   ```bash
   python verify_scaffold.py
   ```

## Running the Server

Start the FastAPI agent backend using uvicorn on port `8001`:
```bash
uvicorn server:app --reload --port 8001
```

The server will run on port `8001`. The main express backend runs on port `5000` to handle Google OAuth login and data synchronization, and the agent service handles chat interactions.
