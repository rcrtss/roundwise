import React, { useState, useEffect } from "react";
import { getAvailableModels } from "../api";
import "./Stage0.css";

export default function Stage0({ stage0Data, onRolesConfirmed, isLoading }) {
  const [agents, setAgents] = useState(stage0Data?.proposed_agents || []);
  const [availableModels, setAvailableModels] = useState([]);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await getAvailableModels();
        setAvailableModels(data.available || []);
      } catch (error) {
        console.error("Failed to fetch models:", error);
        // Fallback models if API fails
        setAvailableModels([
          { value: "openai/gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
          { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
          { value: "google/gemini-2.0-flash-001", label: "Google Gemini 2.0 Flash" },
          { value: "anthropic/claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
        ]);
      }
    };
    fetchModels();
  }, []);

  const handleAgentChange = (index, field, value) => {
    const newAgents = [...agents];
    newAgents[index] = { ...newAgents[index], [field]: value };
    setAgents(newAgents);
  };

  const handleConfirm = () => {
    onRolesConfirmed(agents);
  };

  return (
    <div className="stage0-container">
      <div className="stage0-content">
        <h3>Gatekeeper Analysis</h3>
        
        <div className="normalized-problem">
          <h4>Normalized Problem:</h4>
          <p>{stage0Data?.normalized_problem}</p>
        </div>

        <div className="key-dimensions">
          <h4>Key Dimensions:</h4>
          <ul>
            {stage0Data?.key_dimensions?.map((dim, i) => (
              <li key={i}>{dim}</li>
            ))}
          </ul>
        </div>

        <div className="proposed-agents">
          <h4>Proposed Expert Roles:</h4>
          <div className="agents-form">
            {agents.map((agent, index) => (
              <div key={index} className="agent-card">
                <div className="form-group">
                  <label>Role Name:</label>
                  <input
                    type="text"
                    value={agent.role_name}
                    onChange={(e) => handleAgentChange(index, "role_name", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Role Mission:</label>
                  <textarea
                    value={agent.role_mission}
                    onChange={(e) => handleAgentChange(index, "role_mission", e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>LLM Model:</label>
                  <select
                    value={agent.llm_model}
                    onChange={(e) => handleAgentChange(index, "llm_model", e.target.value)}
                    disabled={isLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Analyzing..." : "Confirm & Proceed"}
        </button>
      </div>
    </div>
  );
}
