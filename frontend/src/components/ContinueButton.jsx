import React from "react";
import "./ContinueButton.css";

export default function ContinueButton({ onClick, isLoading, stageNumber }) {
  return (
    <div className="continue-button-container">
      <button
        className="continue-button"
        onClick={onClick}
        disabled={isLoading}
        aria-label={`Continue to stage ${stageNumber}`}
      >
        {isLoading ? "Loading..." : `Continue to Stage ${stageNumber}: ${stageNumber === 2 ? "Expert Rebuttals" : stageNumber === 3 ? "Notary Synthesis" : stageNumber === 4 ? "Final Scoring" : "Next Stage"}`}
      </button>
    </div>
  );
}
