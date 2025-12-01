import React, { useState } from "react";
import "./Stage1.css";

export default function Stage1({ stage1Data = {} }) {
  const [expandedAll, setExpandedAll] = useState(false);

  const experts = Object.entries(stage1Data).map(([agentId, data]) => ({
    agentId,
    ...data
  }));

  return (
    <div className="stage1-container">
      <h3>Initial Expert Analyses</h3>
      <div className="experts-grid">
        {experts.map((expert, index) => (
          <div key={expert.agentId} className="expert-bubble">
            <div className="bubble-role">
              {expert.role_name}
            </div>
            <div className="bubble-header">
              <div className="summary-text">{expert.one_sentence_summary}</div>
              <span
                className="expand-icon"
                onClick={() => setExpandedAll(!expandedAll)}
              >
                {expandedAll ? "−" : "+"}
              </span>
            </div>
            {expandedAll && (
              <div className="bubble-content">
                <div className="recommendation-section">
                  <h4>Initial Recommendation:</h4>
                  <p>{expert.initial_recommendation}</p>
                </div>
                <div className="reasoning-section">
                  <h4>Key Reasoning Points:</h4>
                  <ol>
                    {Object.values(expert.key_reasoning_points || {}).map(
                      (point, i) => (
                        <li key={i}>{point}</li>
                      )
                    )}
                  </ol>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
