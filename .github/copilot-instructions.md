# copilot-instructions.md – Technical Notes for RoundWise MVP

This file contains the essential technical specifications, architectural details, and implementation notes for building the **RoundWise MVP**.

RoundWise is a structured, multi-agent reasoning system running a single decision-analysis “Round Table” cycle.

## Project Overview

RoundWise is a **multi-agent decision-support MVP** where different LLM-driven roles collaborate in a structured sequence:

1. **Gatekeeper** normalizes the user’s problem and proposes two expert roles for the user to confirm or modify.
2. **Experts (2)** provide initial independent analyses from their assigned perspectives.
3. **Rebuttal Stage:** experts read each other’s initial analyses and may refine or update their stance.
4. **Notary:** produces:
   - a structured synthesis
   - a **list of unique proposed solutions** that appeared in the conversation.
5. **Final Scoring Stage:** each expert allocates **10 points** across the proposed solutions to signal which solutions they consider most convincing.
6. The backend returns the entire conversation package to the frontend, which displays the full reasoning sequence.

The MVP is intentionally simple, hackable, and clean, focused on role-based deliberation.

## Architecture

### Backend Structure (`backend/`)

Backend consists of a minimal service that orchestrates the 1+4-stage pipeline.

**`config.py`**
- Contains `GATEKEEPER_MODEL` (model that creates expert roles)
- Contains `NOTARY_MODEL` (model that synthesizes final answer)
- Gatekeeper and Notary have their own configuration where their `agent_id` is fixed as "gatekeeper" and "notary" respectively.
- Uses environment variable `OPENROUTER_API_KEY` and optional fallback keys (OPEN_AI, GEMINI, ETC) from `.env`
- Defines backend port (default 8000)

**`llm_client.py`** (openrouter client wrapper)
- `query_model()`: Single async model query
- `query_models_parallel()`: Parallel queries using `asyncio.gather()`
- Returns dict with 'content' and optional 'reasoning_details'
- Graceful degradation: returns None on failure, continues with successful responses

**`gatekeeper.py`** - stage 0: problem normalization and role proposal
- `to_gatekeeper(problem: str)`: sends problem to Gatekeeper model to normalize and propose expert roles. 
  - Outputs strict JSON:

  ```
  {
    "normalized_problem": "...",
    "key_dimensions": [...],
    "proposed_agents": [
      {"role_name": "...", "role_mission": "...", "llm_model": "...", "agent_id": "..."},
      {"role_name": "...", "role_mission": "...", "llm_model": "...", "agent_id": "..."}
    ],
  }
  ```

The proposed expert roles are displayed to the user where they can be modified before proceeding in a simple frontend form. `agent_id` is a unique identifier for each expert agent and is not modifiable by the user, instead it is internally generated for tracking.

**`roundwise.py` – The Core Pipeline Logic**

- `stage1_expert_responses()`: Parallel queries to experts for initial analyses, with normalized problem and key dimensions.
  - Each expert returns structured output with `initial_recommendation`, `one_sentence_summary`, `key_reasoning_points: {1: str, 2: str, ..., N: str}`.
- `stage2_expert_rebuttals()`: Sequential or parallel rebuttal stage where experts see each other’s initial analyses.
  - Anonymize responses from first stage to avoid bias.
  - Create `label_to_model` mapping for de-anonymization.
  - Prompts models to optionally revise or reinforce their analysis in a critical thinking manner.
  - Each expert returns structured output with `final_stance`, `one_sentence_summary`, `key_reasoning_points`.
  - Function returns structured rebuttal outputs with “final stance” sections.
- `stage3_notary_synthesis()`: Notary produces structured markdown synthesis and deduplicated list of inferred proposed solutions.
  - Infers and extracts solutions from expert initial recommendations and rebuttal modifications.
  - Returns structured output with `summary_markdown` and `proposed_solutions` list.
- `stage4_expert_scoring()`: Each expert allocates exactly 10 points across the proposed solutions.
  - Returns structured output with `scores: {solution_text: points, ...}`.
  - Validates sum = 10; if invalid, falls back to normalized proportional distribution.

**`storage.py`**
- JSON-based conversation storage in `data/conversations/`
- Each conversation: `{id, created_at, messages[]}`
- Assistant messages contain: `{role_name, stage1, stage2, stage3, stage4}`
- Note: metadata (label_to_model, scores) is NOT persisted to storage, only returned via API

**`models.py`** - Optional Pydantic models for request/response validation

**`main.py`**
- FastAPI app with CORS enabled for localhost:5173 and localhost:3000
- POST `/api/conversations/{id}/message` returns metadata in addition to stages
- Metadata includes: label_to_model mapping and aggregate_rankings

### Frontend Structure (`frontend/src/`)

**`App.jsx`**
- Main orchestration: manages conversations list and current conversation
- Handles message sending and metadata storage
- Important: metadata is stored in the UI state for display but not persisted to backend JSON

**`components/ChatInterface.jsx`**
- Multiline textarea (3 rows, resizable)
- Enter to send, Shift+Enter for new line
- User messages wrapped in markdown-content class for padding

**`components/Stage0.jsx`**
- Gatekeeper output display
- Shows normalized problem and key dimensions
- Editable proposed expert roles with simple form inputs

**`components/Stage1.jsx`**
- Displays only summaries from each expert’s initial analysis in a chat bubble style, order of answers randomized
- Expandable by clicking to show full analysis with key reasoning points

**`components/Stage2.jsx`**
- Displays only summaries from each expert’s rebuttal analysis in a chat bubble style, with a visual indicator that shows which expert is responding to whom
- Expandable by clicking to show full rebuttal with key reasoning points

**`components/Stage3.jsx`**
- Notary synthesis display
- Renders markdown summary and bulleted list of proposed solutions
- Green-tinted background (#f0fff0) to highlight conclusion

**`components/Stage4.jsx`**
- Final scoring display
- Renders each expert’s score allocation in a horizontal bar chart style with value labels and solution text
- Green-tinted background (#f0fff0) to highlight conclusion

**Styling (`*.css`)**
- Light mode theme (not dark mode)
- Primary color: #2776cfff (blue)
- Secondary color: #f0a037ff (orange accents for highlights)
- Global markdown styling in `index.css` with `.markdown-content` class
- 12px padding on all markdown content to prevent cluttered appearance

## Key Design Decisions

### User Experience
- Users can see between steps instead of waiting for a final response with all the information, that is:
  - After Stage 0: see proposed expert roles and modify
  - After Stage 1: see initial analyses summaries
  - After Stage 2: see rebuttal summaries
  - After Stage 3: see notary synthesis and proposed solutions
  - After Stage 4: see final scoring

### Gatekeeper Role
- Normalizes user problem to reduce ambiguity.
- Proposes expert roles to ensure diverse perspectives.

### De-anonymization Strategy
- Anonimization is only for the rebuttal stage to prevent bias.
- Models receive: "Response A", "Response B", etc.
- Backend creates mapping: e.g. `{"Response A": agent_id, ...}`
- Frontend displays role names in **bold** for readability
- Users see explanation that original evaluation used anonymous labels

### Rebuttal Stage
The rebuttal stage is very specific to ensure parsable outputs:
```
1. Read the initial analyses from the other expert.
2. Critically evaluate their points.
3. Optionally revise or reinforce your original analysis.
4. Provide a final stance with reasoning points, avoiding repetition of previous content.
```

### Notary Role
- Synthesizes a coherent summary of the discussion.
- Extracts a deduplicated list of proposed solutions mentioned by experts.

### Error Handling
- Continue with successful responses if some models fail (graceful degradation)
- Never fail the entire request due to single model failure
- Log errors but don't expose to user unless all models fail

### UI/UX Transparency
- All raw outputs are inspectable via tabs
- Parsed rankings shown below raw text for validation
- Users can verify system's interpretation of model outputs
- This builds trust and allows debugging of edge cases

### Simple, Modular Code
- Each stage is isolated so it can later evolve.

## Important Implementation Details

### Relative Imports
All backend modules use relative imports (e.g., `from .config import ...`) not absolute imports. This is critical for Python's module system to work correctly when running as `python -m backend.main`.

### Port Configuration
- Backend: 8000
- Frontend: 5173 (Vite default)
- Update both `backend/main.py` and `frontend/src/api.js` if changing

### Markdown Rendering
All ReactMarkdown components must be wrapped in `<div className="markdown-content">` for proper spacing. This class is defined globally in `index.css`.


## Common Gotchas
1. **Module Import Errors**: Always run backend as `python -m backend.main` from project root, not from backend directory
2. **CORS Issues**: Frontend must match allowed origins in `main.py` CORS middleware
3. **Ranking Parse Failures**: If models don't follow format, fallback regex extracts any "Response X" patterns in order
4. **Missing Metadata**: Metadata is ephemeral (not persisted), only available in API responses

## Testing Notes

Use `test_openrouter.py` to verify API connectivity and test different model identifiers before adding to council. The script tests both streaming and non-streaming modes.

### Parallelism
Only initial expert calls run in parallel.
Rebuttal calls run sequentially or in parallel—it’s up to the coding agent.

### Graceful Failures
- If Gatekeeper output fails → fallback roles
- If Notary fails → fallback generic summary
- If scoring is invalid → normalize to sum = 10

### Build and Run
1. Create and activate virtual environment
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run backend: `python -m backend.main`
4. Run frontend: `cd frontend && npm install && npm run dev`

## Data Flow Summary

```
User Problem
    ↓
Gatekeeper (normalize + propose roles)
    ↓
User modifies/approves roles
    ↓
Initial Expert Analyses (parallel)
    ↓
Rebuttal Stage (experts revise)
    ↓
Notary Synthesis
    ↓
Notary extracts unique Proposed Solutions
    ↓
Final Scoring (experts allocate 10 points)
    ↓
Return: full multi-stage response
    ↓
Frontend renders linear timeline
```

This is the full RoundWise MVP pipeline with the two major enhancements.
