import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Load YAML configuration
config_path = Path(__file__).parent / "config.yaml"
with open(config_path, "r") as f:
    config = yaml.safe_load(f)

# API Configuration (from .env)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPEN_AI_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# Model Configuration (from config.yaml)
GATEKEEPER_MODEL = config["models"]["gatekeeper"]
NOTARY_MODEL = config["models"]["notary"]
DEFAULT_EXPERT_MODEL = config["models"]["expert_default"]

# Server Configuration (from config.yaml, override with .env if present)
BACKEND_PORT = int(os.getenv("BACKEND_PORT", config["server"]["port"]))
BACKEND_HOST = os.getenv("BACKEND_HOST", config["server"]["host"])
FRONTEND_URL = os.getenv("FRONTEND_URL", config["frontend"]["url"])

# LLM Parameters (from config.yaml)
LLM_CONFIG = config["llm"]

# Storage Configuration (from config.yaml)
STORAGE_CONFIG = config["storage"]

# Feature Flags (from config.yaml)
FEATURES = config["features"]

# CORS Configuration (from config.yaml)
CORS_ALLOWED_ORIGINS = config["api"]["cors_allowed_origins"]
