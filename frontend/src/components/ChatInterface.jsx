import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";

export default function ChatInterface({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [message]);

  return (
    <div className="chat-interface">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe your problem or decision..."
        disabled={isLoading}
        rows={3}
      />
      <button onClick={handleSend} disabled={isLoading || !message.trim()} className="send-button">
        <img 
          src={isLoading ? "/processing-icon.png" : "/send-icon.png"} 
          alt={isLoading ? "Processing" : "Send"} 
          className={isLoading ? "processing-icon" : "send-icon"}
        />
      </button>
    </div>
  );
}
