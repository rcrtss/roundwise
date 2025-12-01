import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

class Storage:
    """JSON-based conversation storage"""
    
    def __init__(self, data_dir: str = "backend/data/conversations"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_conversation_path(self, conversation_id: str) -> Path:
        """Get the file path for a conversation"""
        return self.data_dir / f"{conversation_id}.json"
    
    def create_conversation(self) -> str:
        """Create a new conversation and return its ID"""
        conversation_id = str(uuid.uuid4())
        conversation = {
            "id": conversation_id,
            "created_at": datetime.now().isoformat(),
            "messages": []
        }
        
        self._save_conversation(conversation_id, conversation)
        return conversation_id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID"""
        path = self._get_conversation_path(conversation_id)
        
        if not path.exists():
            return None
        
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def list_conversations(self) -> List[Dict[str, Any]]:
        """List all conversations (metadata only)"""
        conversations = []
        
        for file in self.data_dir.glob("*.json"):
            try:
                with open(file, 'r') as f:
                    conv = json.load(f)
                    conversations.append({
                        "id": conv["id"],
                        "created_at": conv["created_at"],
                        "message_count": len(conv.get("messages", []))
                    })
            except (json.JSONDecodeError, IOError, KeyError):
                pass
        
        # Sort by created_at descending
        conversations.sort(key=lambda x: x["created_at"], reverse=True)
        return conversations
    
    def add_message(
        self,
        conversation_id: str,
        role: str,  # "user" or "assistant"
        content: str,
        stage_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Add a message to a conversation"""
        conversation = self.get_conversation(conversation_id)
        
        if not conversation:
            return False
        
        message = {
            "timestamp": datetime.now().isoformat(),
            "role": role,
            "content": content
        }
        
        # Add stage data for assistant messages
        if role == "assistant" and stage_data:
            message.update(stage_data)
        
        conversation["messages"].append(message)
        self._save_conversation(conversation_id, conversation)
        
        return True
    
    def _save_conversation(self, conversation_id: str, conversation: Dict[str, Any]) -> None:
        """Save conversation to disk"""
        path = self._get_conversation_path(conversation_id)
        
        with open(path, 'w') as f:
            json.dump(conversation, f, indent=2)
