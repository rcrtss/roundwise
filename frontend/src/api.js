const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getAvailableModels() {
  const response = await fetch(`${API_BASE_URL}/api/config/models`);
  if (!response.ok) throw new Error("Failed to fetch models");
  return response.json();
}

export async function createConversation() {
  const response = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: "POST",
  });
  return response.json();
}

export async function listConversations() {
  const response = await fetch(`${API_BASE_URL}/api/conversations`);
  return response.json();
}

export async function getConversation(conversationId) {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`);
  if (!response.ok) throw new Error("Conversation not found");
  return response.json();
}

export async function sendMessage(conversationId, message, type = "message", proposedAgents = null, stage = null) {
  const payload = {
    content: message,
    type: type,
  };
  
  if (proposedAgents) {
    payload.proposed_agents = proposedAgents;
  }
  
  if (stage) {
    payload.stage = stage;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  return response.json();
}
