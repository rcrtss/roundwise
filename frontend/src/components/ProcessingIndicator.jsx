import React from "react";
import "./ProcessingIndicator.css";

const STAGE_LABELS = {
  "stage1": "Processing initial expert responses...",
  "stage2": "Processing expert rebuttals...",
  "stage3": "Processing notary synthesis...",
  "stage4": "Processing final scoring...",
};

export default function ProcessingIndicator({ stage }) {
  const label = STAGE_LABELS[stage] || "Processing...";
  
  return (
    <div className="processing-indicator">
      <div className="processing-spinner"></div>
      <span className="processing-text">{label}</span>
    </div>
  );
}
