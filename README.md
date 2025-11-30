# RoundWise

<img src="docs/present-rw.png" width="500" alt="RoundWise">

A structured, multi-agent decision support system that gives you 2 llm "experts" with configurable roles and missions; each provide their take on your problem, read the other llm's response, refine theirs, and vote on the best of all proposed solutions.

> IMPORTANT: This is a Proof of Concept that was built using a rapid prototyping methodology and supported heavily by AI. The goal is to validate the end-to-end orchestration flow of RoundWise to showcase the potential of multi-agent collaboration for decision analysis.

![RoundWise High-Level Flow](docs/high-level-flow.png)

## Quick Start

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
pip install -r requirements.txt
cd ..
python -m backend.main
```

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Pipeline Overview

1. **Stage 0 (Gatekeeper)**: Normalizes user problem and proposes 2 expert roles
2. **User Confirmation**: User can edit/approve the proposed expert roles
3. **Stage 1**: Experts provide initial independent analyses (parallel)
4. **Stage 2**: Experts read each other's analyses and provide rebuttals
5. **Stage 3**: Notary synthesizes discussion and extracts unique solutions
6. **Stage 4**: Each expert allocates 10 points across proposed solutions

## Key Features

- **Modular Architecture**: Each stage is isolated and can evolve independently
- **Graceful Degradation**: Continues even if individual LLM calls fail
- **Transparent Process**: All reasoning is displayed to users for validation
- **JSON Storage**: Simple file-based conversation persistence
- **Async Processing**: Parallel expert queries for improved performance

## Technology Stack

- **Backend**: Python, FastAPI, OpenRouter API
- **Frontend**: React, Vite, ReactMarkdown
- **Storage**: JSON files

## Configuration

See `.env.example` files in both `backend/` and `frontend/` directories for configuration options.
