import React, { useState } from "react";
import "./Stage2.css";

export default function Stage2({ stage2Data = {}, labelToModel = {} }) {
  const [expandedExpert, setExpandedExpert] = useState(null);

  const experts = Object.entries(stage2Data).map(([agentId, data]) => ({
    agentId,
    ...data
  }));

  return (
    <div className="stage2-container">
      <h3>Expert Rebuttals & Refinements</h3>
      <div className="rebuttals-list">
        {experts.map((expert, index) => (
          <div key={expert.agentId} className="rebuttal-card">
            <div
              className="card-header"
              onClick={() =>
                setExpandedExpert(
                  expandedExpert === expert.agentId ? null : expert.agentId
                )
              }
            >
              <div className="header-content">
                <div className="expert-indicator">
                  <span className="indicator-number">{expert.role_name}</span>
                  <span className="responds-to">responds to {expert.other_expert_role}</span>
                </div>
                <div className="summary-text">{expert.one_sentence_summary}</div>
              </div>
              <span className="expand-icon">
                {expandedExpert === expert.agentId ? "−" : "+"}
              </span>
            </div>
            {expandedExpert === expert.agentId && (
              <div className="card-content">
                <div className="stance-section">
                  <h4>Final Stance:</h4>
                  <p>{expert.final_stance}</p>
                </div>
                <div className="evaluation-section">
                  <h4>Critical Evaluation:</h4>
                  <p>{expert.critical_evaluation}</p>
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
