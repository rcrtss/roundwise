import React from "react";
import ReactMarkdown from "react-markdown";
import "./Stage3.css";

export default function Stage3({ stage3Data = {} }) {
  const { summary_markdown = "", proposed_solutions = [] } = stage3Data;

  return (
    <div className="stage3-container">
      <div className="stage3-content">
        <h3>Notary Synthesis & Solutions</h3>
        
        <div className="synthesis-section">
          <h4>Summary</h4>
          <div className="markdown-content">
            <ReactMarkdown>{summary_markdown}</ReactMarkdown>
          </div>
        </div>

        <div className="solutions-section">
          <h4>Proposed Solutions</h4>
          <ul className="solutions-list">
            {proposed_solutions.map((solution) => {
              // Handle both old format (string) and new format (object with id and text)
              const displayText = typeof solution === 'object' ? solution.text : solution;
              const solutionId = typeof solution === 'object' ? solution.id : '';
              return (
                <li key={solutionId || displayText}>
                  {solutionId && <span className="solution-id">[{solutionId}]</span>}
                  {displayText}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
