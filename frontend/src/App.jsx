import React, { useState, useEffect, useRef } from "react";
import { createConversation, sendMessage, getProgress } from "./api";
import { mockData } from "./mockData";
import ChatInterface from "./components/ChatInterface";
import Stage0 from "./components/Stage0";
import Stage1 from "./components/Stage1";
import Stage2 from "./components/Stage2";
import Stage3 from "./components/Stage3";
import Stage4 from "./components/Stage4";
import ProcessingIndicator from "./components/ProcessingIndicator";
import "./App.css";

// Toggle this to test without API calls
const MOCK_MODE = false;

export default function App() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [stage0Data, setStage0Data] = useState(null);
  const [visibleStages, setVisibleStages] = useState(["stage0"]);
  const [lastAssistantMsg, setLastAssistantMsg] = useState(null);
  const [processingStage, setProcessingStage] = useState(null); // Track which stage is processing
  const conversationEndRef = useRef(null);

  // Auto-scroll to latest content
  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [visibleStages, processingStage]);

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
    setProcessingStage("stage0");
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
        setProcessingStage(null);
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
      setProcessingStage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRolesConfirmed = async (confirmedAgents) => {
    if (!conversationId || !stage0Data) return;

    setIsLoading(true);
    setProcessingStage("stage1");
    try {
      // Update agents in stage0Data
      const updatedStage0 = {
        ...stage0Data,
        proposed_agents: confirmedAgents,
      };

      let response;

      if (MOCK_MODE) {
        // Simulate API delay with stage progression
        setProcessingStage("stage1");
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setProcessingStage("stage2");
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setProcessingStage("stage3");
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setProcessingStage("stage4");
        await new Promise(resolve => setTimeout(resolve, 400));
        
        response = {
          content: "Mock full analysis",
          stage1: mockData.stage1,
          stage2: mockData.stage2,
          stage3: mockData.stage3,
          stage4: mockData.stage4,
          metadata: {
            label_to_model: {},
            aggregate_rankings: []
          }
        };
      } else {
        // Send role update to backend - triggers all stages 1-4
        const sendPromise = sendMessage(
          conversationId,
          "Confirmed roles, proceeding to analysis",
          "role_update",
          confirmedAgents
        );

        // Start polling for progress
        const progressPollInterval = setInterval(async () => {
          try {
            const progress = await getProgress(conversationId);
            if (progress.current_stage) {
              setProcessingStage(progress.current_stage);
            }
          } catch (error) {
            // Silently fail on progress polling
          }
        }, 500);

        // Wait for backend response
        response = await sendPromise;

        // Clear polling
        clearInterval(progressPollInterval);
      }

      // Create initial message with stage0
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
      
      // Show all stages immediately
      const newVisibleStages = ["stage0"];
      if (response.stage1) newVisibleStages.push("stage1");
      if (response.stage2) newVisibleStages.push("stage2");
      if (response.stage3) newVisibleStages.push("stage3");
      if (response.stage4) newVisibleStages.push("stage4");
      
      setVisibleStages(newVisibleStages);
      setCurrentStage("stage4");
      setStage0Data(null);
      setProcessingStage(null);
    } catch (error) {
      console.error("Error confirming roles:", error);
      alert(`Error: ${error.message}`);
      setProcessingStage(null);
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
                        <Stage1 stage1Data={msg.stage1} />
                      )}
                      {msg.stage2 && visibleStages.includes("stage2") && (
                        <Stage2
                          stage2Data={msg.stage2}
                          labelToModel={msg.metadata?.label_to_model || {}}
                        />
                      )}
                      {msg.stage3 && visibleStages.includes("stage3") && (
                        <Stage3 stage3Data={msg.stage3} />
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
          {processingStage && (
            <div className="message message-assistant">
              <div className="assistant-message">
                <ProcessingIndicator stage={processingStage} />
              </div>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>
      </main>

      <ChatInterface onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
