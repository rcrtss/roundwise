from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import asyncio
import json

from .config import BACKEND_PORT, BACKEND_HOST, CORS_ALLOWED_ORIGINS, config
from .storage import Storage
from .gatekeeper import to_gatekeeper
from .roundwise import (
    stage1_expert_responses,
    stage2_expert_rebuttals,
    stage3_notary_synthesis,
    stage4_expert_scoring
)

app = FastAPI(title="RoundWise MVP Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = Storage()

# Global state for tracking processing stages
processing_state = {}

# Request/Response models
class ProblemRequest(BaseModel):
    problem: str

class RoleUpdate(BaseModel):
    proposed_agents: List[Dict[str, str]]

class MessageRequest(BaseModel):
    content: str
    type: str = "message"  # "message" or "role_update"
    proposed_agents: Optional[List[Dict[str, str]]] = None

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    stage0: Optional[Dict[str, Any]] = None
    stage1: Optional[Dict[str, Any]] = None
    stage2: Optional[Dict[str, Any]] = None
    stage3: Optional[Dict[str, Any]] = None
    stage4: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

# Routes

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

@app.get("/api/conversations/{conversation_id}/progress")
async def get_progress(conversation_id: str):
    """Get current processing stage for a conversation"""
    stage = processing_state.get(conversation_id, None)
    return {"current_stage": stage}

@app.get("/api/config/models")
async def get_available_models():
    """Get available LLM models for expert selection"""
    return {
        "available": config["models"]["available"]
    }

@app.post("/api/conversations")
async def create_conversation():
    """Create a new conversation"""
    conversation_id = storage.create_conversation()
    return {"id": conversation_id}

@app.get("/api/conversations")
async def list_conversations():
    """List all conversations"""
    conversations = storage.list_conversations()
    return {"conversations": conversations}

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation"""
    conversation = storage.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

@app.post("/api/conversations/{conversation_id}/message")
async def post_message(conversation_id: str, request: MessageRequest):
    """
    Post a message to a conversation.
    
    If type="message" and content starts with a problem:
      - Stage 0 (Gatekeeper): normalize problem and propose roles
      
    If type="role_update":
      - Proceed to stages 1-4 with confirmed roles
    """
    conversation = storage.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    response_data = {
        "role": "assistant",
        "content": "",
        "metadata": {}
    }
    
    # Handle different message types
    if request.type == "message":
        # This is a user problem - start with Gatekeeper (Stage 0)
        
        # Store user message
        storage.add_message(conversation_id, "user", request.content)
        
        # Run Gatekeeper
        try:
            stage0 = await to_gatekeeper(request.content)
            response_data["stage0"] = stage0
            response_data["content"] = f"Gatekeeper Analysis: {stage0.get('normalized_problem', '')}"
            
            # Store metadata
            response_data["metadata"]["label_to_model"] = {}
            response_data["metadata"]["aggregate_rankings"] = []
            
            # Store assistant response with stage0
            storage.add_message(
                conversation_id,
                "assistant",
                response_data["content"],
                stage_data={"stage0": stage0}
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gatekeeper error: {str(e)}")
    
    elif request.type == "role_update":
        # User has confirmed/updated roles - proceed to Stages 1-4 automatically
        
        # Extract the last assistant message with stage0
        last_stage0 = None
        for msg in reversed(conversation["messages"]):
            if msg.get("role") == "assistant" and "stage0" in msg:
                last_stage0 = msg.get("stage0")
                break
        
        if not last_stage0:
            raise HTTPException(status_code=400, detail="No Stage 0 context found")
        
        # Use provided agents or the proposed ones
        agents = request.proposed_agents or last_stage0.get("proposed_agents", [])
        
        normalized_problem = last_stage0.get("normalized_problem", "")
        key_dimensions = last_stage0.get("key_dimensions", [])
        
        try:
            # Stage 1: Expert responses (parallel)
            processing_state[conversation_id] = "stage1"
            stage1 = await stage1_expert_responses(normalized_problem, key_dimensions, agents)
            response_data["stage1"] = stage1
            
            # Store assistant response with stage1
            storage.add_message(
                conversation_id,
                "assistant",
                "Stage 1: Initial Expert Analyses complete",
                stage_data={"stage1": stage1}
            )
            
            # Stage 2: Expert rebuttals
            processing_state[conversation_id] = "stage2"
            stage2, label_to_model = await stage2_expert_rebuttals(normalized_problem, agents, stage1)
            response_data["stage2"] = stage2
            response_data["metadata"]["label_to_model"] = label_to_model
            
            # Store assistant response with stage2
            storage.add_message(
                conversation_id,
                "assistant",
                "Stage 2: Expert Rebuttals complete",
                stage_data={"stage2": stage2}
            )
            
            # Stage 3: Notary synthesis
            processing_state[conversation_id] = "stage3"
            stage3 = await stage3_notary_synthesis(normalized_problem, stage1, stage2)
            response_data["stage3"] = stage3
            
            # Store assistant response with stage3
            storage.add_message(
                conversation_id,
                "assistant",
                "Stage 3: Notary Synthesis complete",
                stage_data={"stage3": stage3}
            )
            
            # Stage 4: Expert scoring
            processing_state[conversation_id] = "stage4"
            stage4 = await stage4_expert_scoring(
                stage3.get("proposed_solutions", []),
                stage1,
                agents
            )
            response_data["stage4"] = stage4
            
            # Build aggregate rankings from stage4
            if stage4:
                aggregate = {}
                for agent_id, scoring in stage4.items():
                    scores_list = scoring.get("scores", [])
                    for score_obj in scores_list:
                        if isinstance(score_obj, dict):
                            sol_id = score_obj.get("id", "")
                            sol_text = score_obj.get("text", "")
                            points = score_obj.get("points", 0)
                            key = f"{sol_id}_{sol_text}"
                            if key not in aggregate:
                                aggregate[key] = {"id": sol_id, "text": sol_text, "total": 0}
                            aggregate[key]["total"] += points
                
                response_data["metadata"]["aggregate_rankings"] = sorted(
                    aggregate.values(),
                    key=lambda x: x["total"],
                    reverse=True
                )
            
            # Store assistant response with stage4
            storage.add_message(
                conversation_id,
                "assistant",
                "Stage 4: Final Scoring complete",
                stage_data={"stage4": stage4}
            )
            
            response_data["content"] = "All analysis stages complete"
            
            # Clear processing state
            if conversation_id in processing_state:
                del processing_state[conversation_id]
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            # Clear processing state on error
            if conversation_id in processing_state:
                del processing_state[conversation_id]
            raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown message type: {request.type}")
    
    return response_data

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "RoundWise MVP Backend", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
