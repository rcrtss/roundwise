import React, { useState, useEffect } from "react";
import { createConversation, sendMessage } from "./api";
import { mockData } from "./mockData";
import ChatInterface from "./components/ChatInterface";
import Stage0 from "./components/Stage0";
import Stage1 from "./components/Stage1";
import Stage2 from "./components/Stage2";
import Stage3 from "./components/Stage3";
import Stage4 from "./components/Stage4";
import ContinueButton from "./components/ContinueButton";
import "./App.css";

// Toggle this to test without API calls
const MOCK_MODE = false;

export default function App() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [stage0Data, setStage0Data] = useState(null);
  const [visibleStages, setVisibleStages] = useState(["stage0"]); // Track which stages to show
  const [lastAssistantMsg, setLastAssistantMsg] = useState(null); // Cache last assistant message

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      const response = await createConversation();
      setConversationId(response.id);
    };
    initConversation();
  }, []);

  const handleSendMessage = async (message) => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      // Add user message to UI
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
      ]);

      let response;

      if (MOCK_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        response = {
          content: "Mock analysis complete",
          stage0: mockData.stage0,
          metadata: {
            label_to_model: {},
            aggregate_rankings: []
          }
        };
      } else {
        // Send message to backend
        response = await sendMessage(conversationId, message);
      }

      // Store response and update stage
      const assistantMsg = {
        role: "assistant",
        content: response.content,
        stage0: response.stage0,
        stage1: response.stage1,
        stage2: response.stage2,
        stage3: response.stage3,
        stage4: response.stage4,
        metadata: response.metadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLastAssistantMsg(assistantMsg);

      // Update stage
      if (response.stage0) {
        setStage0Data(response.stage0);
        setCurrentStage("stage0");
        setVisibleStages(["stage0"]);
      } else if (response.stage1) {
        setCurrentStage("stage1");
        setVisibleStages((prev) => [...prev, "stage1"]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueStage = async (nextStageNum) => {
    if (!conversationId || !lastAssistantMsg) return;

    setIsLoading(true);
    try {
      let response;

      if (MOCK_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        if (nextStageNum === "2") {
          response = {
            content: "Mock stage 2 rebuttal",
            stage2: mockData.stage2,
            metadata: lastAssistantMsg.metadata,
          };
        } else if (nextStageNum === "3") {
          response = {
            content: "Mock stage 3 synthesis",
            stage3: mockData.stage3,
            metadata: lastAssistantMsg.metadata,
          };
        } else if (nextStageNum === "4") {
          response = {
            content: "Mock stage 4 scoring",
            stage4: mockData.stage4,
            metadata: {
              ...lastAssistantMsg.metadata,
              aggregate_rankings: [
                ["Request extended due diligence period - meet startup team, understand product roadmap, and verify market fit", 18],
                ["Accept startup offer with condition of negotiating equity terms and ensuring 12+ months financial runway", 15],
                ["Stay in current role for 12-18 months while building emergency savings, then reassess market opportunities", 4],
                ["Negotiate remote work or flexible arrangement with current company to maintain stability while seeking growth", 3],
                ["Counter-offer to current company highlighting startup offer to negotiate higher title/compensation/growth opportunities", 3]
              ]
            },
          };
        }
      } else {
        // Request next stage from backend
        response = await sendMessage(
          conversationId,
          `Requesting stage ${nextStageNum}`,
          "stage_request",
          null,
          nextStageNum
        );
      }

      // Update the last assistant message with new stage data
      const updatedAssistantMsg = {
        ...lastAssistantMsg,
        stage1: response.stage1 || lastAssistantMsg.stage1,
        stage2: response.stage2 || lastAssistantMsg.stage2,
        stage3: response.stage3 || lastAssistantMsg.stage3,
        stage4: response.stage4 || lastAssistantMsg.stage4,
        metadata: response.metadata || lastAssistantMsg.metadata,
        content: response.content,
      };

      // Update messages with the updated assistant message
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = updatedAssistantMsg;
        return newMessages;
      });

      setLastAssistantMsg(updatedAssistantMsg);

      // Update visible stages
      const stageMap = { "2": "stage2", "3": "stage3", "4": "stage4" };
      setVisibleStages((prev) => [...prev, stageMap[nextStageNum]]);
      setCurrentStage(stageMap[nextStageNum]);
    } catch (error) {
      console.error("Error continuing to next stage:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRolesConfirmed = async (confirmedAgents) => {
    if (!conversationId || !stage0Data) return;

    setIsLoading(true);
    try {
      // Update agents in stage0Data
      const updatedStage0 = {
        ...stage0Data,
        proposed_agents: confirmedAgents,
      };

      let response;

      if (MOCK_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        response = {
          content: "Mock full analysis",
          stage1: mockData.stage1,
          metadata: {
            label_to_model: {},
            aggregate_rankings: []
          }
        };
      } else {
        // Send role update to backend - only triggers Stage 1
        response = await sendMessage(
          conversationId,
          "Confirmed roles, proceeding to analysis",
          "role_update",
          confirmedAgents
        );
      }

      // Store response and update stages
      const assistantMsg = {
        role: "assistant",
        content: response.content,
        stage0: updatedStage0,
        stage1: response.stage1,
        stage2: response.stage2,
        stage3: response.stage3,
        stage4: response.stage4,
        metadata: response.metadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLastAssistantMsg(assistantMsg);
      setCurrentStage("stage1");
      setStage0Data(null);
      setVisibleStages(["stage0", "stage1"]);
    } catch (error) {
      console.error("Error confirming roles:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="/logo.png" alt="RoundWise Logo" className="header-logo" />
          <div className="header-text">
            <h1>RoundWise</h1>
            <p>Multi-Agent Decision Analysis</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="conversation-container">
          {messages.map((msg, i) => (
            <div key={i} className={`message message-${msg.role}`}>
              {msg.role === "user" ? (
                <div className="user-message">
                  <div className="markdown-content">{msg.content}</div>
                </div>
              ) : (
                <div className="assistant-message">
                  {msg.error ? (
                    <div className="error-message">{msg.content}</div>
                  ) : (
                    <>
                      {msg.stage0 && visibleStages.includes("stage0") && i === 1 && (
                        <Stage0
                          stage0Data={msg.stage0}
                          onRolesConfirmed={handleRolesConfirmed}
                          isLoading={isLoading}
                        />
                      )}
                      {msg.stage1 && visibleStages.includes("stage1") && (
                        <>
                          <Stage1 stage1Data={msg.stage1} />
                          {visibleStages.length === 2 && !visibleStages.includes("stage2") && (
                            <ContinueButton
                              onClick={() => handleContinueStage("2")}
                              isLoading={isLoading}
                              stageNumber={2}
                            />
                          )}
                        </>
                      )}
                      {msg.stage2 && visibleStages.includes("stage2") && (
                        <>
                          <Stage2
                            stage2Data={msg.stage2}
                            labelToModel={msg.metadata?.label_to_model || {}}
                          />
                          {visibleStages.length === 3 && !visibleStages.includes("stage3") && (
                            <ContinueButton
                              onClick={() => handleContinueStage("3")}
                              isLoading={isLoading}
                              stageNumber={3}
                            />
                          )}
                        </>
                      )}
                      {msg.stage3 && visibleStages.includes("stage3") && (
                        <>
                          <Stage3 stage3Data={msg.stage3} />
                          {visibleStages.length === 4 && !visibleStages.includes("stage4") && (
                            <ContinueButton
                              onClick={() => handleContinueStage("4")}
                              isLoading={isLoading}
                              stageNumber={4}
                            />
                          )}
                        </>
                      )}
                      {msg.stage4 && visibleStages.includes("stage4") && (
                        <Stage4 stage4Data={msg.stage4} />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <ChatInterface onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
