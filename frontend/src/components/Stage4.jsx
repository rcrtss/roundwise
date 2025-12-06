import React from "react";
import "./Stage4.css";

export default function Stage4({ stage4Data = {} }) {
  // Calculate aggregate scores - handle both old (string keys) and new (array) formats
  const aggregateScores = {};
  Object.values(stage4Data).forEach((expert) => {
    const scores = expert.scores || {};
    
    // Handle array format (new)
    if (Array.isArray(scores)) {
      scores.forEach((scoreObj) => {
        const key = `${scoreObj.id}_${scoreObj.text}`;
        if (!aggregateScores[key]) {
          aggregateScores[key] = { id: scoreObj.id, text: scoreObj.text, total: 0 };
        }
        aggregateScores[key].total += scoreObj.points || 0;
      });
    } else {
      // Handle object format (old)
      Object.entries(scores).forEach(([solution, points]) => {
        if (!aggregateScores[solution]) {
          aggregateScores[solution] = { text: solution, total: 0 };
        }
        aggregateScores[solution].total += points;
      });
    }
  });

  // Sort by score descending
  const sortedSolutions = Object.values(aggregateScores)
    .sort((a, b) => b.total - a.total);

  const maxScore = Math.max(...sortedSolutions.map((s) => s.total), 1);

  return (
    <div className="stage4-container">
      <div className="stage4-content">
        <h3>Final Expert Scoring</h3>
        
        <div className="scoring-section">
          <h4>Aggregate Scores</h4>
          <div className="aggregate-scores-wrapper">
            <div className="bars-column">
              {sortedSolutions.map((solution, index) => (
                <div key={solution.text} className="score-bar-row">
                  <div className="rank-badge">#{index + 1}</div>
                  <div className="score-bar-container">
                    <div
                      className="score-bar"
                      style={{
                        width: `${(solution.total / maxScore) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="labels-column">
              {sortedSolutions.map((solution) => (
                <div key={solution.text} className="score-label-row">
                  <span className="score-value">{solution.total} points</span>
                  <span className="score-text">
                    — {solution.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="expert-scores-section">
          <h4>Individual Expert Scores</h4>
          <div className="expert-scores">
            {Object.entries(stage4Data).map(([agentId, data], index) => (
              <div key={agentId} className="expert-score-card">
                <h5>Expert {index + 1} {data.role_name && `— ${data.role_name}`}</h5>
                <div className="individual-scores">
                  {Array.isArray(data.scores) ? (
                    data.scores.map((scoreObj) => (
                      <div key={scoreObj.id || scoreObj.text} className="score-item-individual">
                        <span className="points">{scoreObj.points}</span>
                        <span className="solution-text">
                          {scoreObj.id && <span className="solution-id">[{scoreObj.id}]</span>}
                          {scoreObj.text}
                        </span>
                      </div>
                    ))
                  ) : (
                    Object.entries(data.scores || {}).map(([solution, points]) => (
                      <div key={solution} className="score-item-individual">
                        <span className="points">{points}</span>
                        <span className="solution-text">{solution}</span>
                      </div>
                    ))
                  )}
                </div>
                {data.reasoning && (
                  <div className="reasoning">
                    <em>{data.reasoning}</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
