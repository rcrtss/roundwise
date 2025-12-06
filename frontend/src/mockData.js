/**
 * Mock data for RoundWise testing
 * Use this to test UI/UX without calling LLMs
 */

export const mockData = {
  stage0: {
    normalized_problem: "Should I accept a job offer from a startup vs staying at my current company?",
    key_dimensions: ["Career Growth", "Financial Security", "Work-Life Balance"],
    proposed_agents: [
      {
        role_name: "Career Growth Strategist",
        role_mission: "Focus on long-term career development, skill acquisition, and opportunity assessment",
        llm_model: "openai/gpt-4-turbo",
        agent_id: "expert_1"
      },
      {
        role_name: "Risk Management Analyst",
        role_mission: "Evaluate financial stability, risk factors, and mitigation strategies",
        llm_model: "openai/gpt-4-turbo",
        agent_id: "expert_2"
      }
    ]
  },

  stage1: {
    expert_1: {
      role_name: "Career Growth Strategist",
      initial_recommendation: "The startup opportunity offers significant growth potential with equity upside and direct exposure to decision-making. You'll develop broader skills faster and build stronger industry connections.",
      one_sentence_summary: "Take the startup role for accelerated career growth and valuable equity upside if the company succeeds.",
      critical_points_to_consider: {
        "1": "Startups provide faster skill development and broader responsibilities compared to larger corporations",
        "2": "Early equity could be worth significant multiples if company succeeds, offering long-term wealth potential",
        "3": "Direct access to founders and strategic decisions builds valuable executive network and mentorship"
      }
    },
    expert_2: {
      role_name: "Risk Management Analyst",
      initial_recommendation: "Current company offers proven stability and comprehensive benefits, but startup risk is manageable if you have adequate financial reserves. The key is having sufficient emergency savings.",
      one_sentence_summary: "The startup is viable only if you have 12+ months of emergency savings and can absorb potential income loss.",
      critical_points_to_consider: {
        "1": "Startups have high failure rate (roughly 90% don't reach profitability in first 5 years)",
        "2": "Current company provides valuable security net including health insurance, 401k match, and predictable income",
        "3": "Equity vesting typically occurs over 4 years, so you won't realize gains immediately"
      }
    }
  },

  stage2: {
    expert_1: {
      role_name: "Career Growth Strategist",
      final_stance: "While the risk analyst's concerns are valid, the startup's potential for growth outweighs the risk if proper financial cushioning exists. I'd recommend the startup for someone early-to-mid career.",
      one_sentence_summary: "The risks are manageable for a financially prepared individual, making the growth opportunity worth taking.",
      critical_points_to_consider: {
        "1": "At this career stage, taking calculated risks has higher ROI than safety - the learning and network benefits compound",
        "2": "Equity upside potential (even with 90% failure rate) justifies the move if financial runway exists",
        "3": "Staying in a safe role now may limit options later - early career is optimal time for risk"
      },
      critical_evaluation: "The analyst raised important points about financial readiness that shouldn't be ignored, but these are guardrails for the decision, not blockers."
    },
    expert_2: {
      role_name: "Risk Management Analyst",
      final_stance: "I acknowledge the growth potential, but emphasize this decision hinges entirely on financial readiness. If emergency savings exist, proceed cautiously. If not, this is premature.",
      one_sentence_summary: "Financial preparedness is the deciding factor - with adequate savings, this move is acceptable; without it, stay put.",
      critical_points_to_consider: {
        "1": "The strategist overlooks that most startup equity becomes worthless - focus on the majority case, not the unicorn scenario",
        "2": "Career growth at a stable company is still substantial; the gap isn't as large as growth experts suggest",
        "3": "Mental peace from financial security shouldn't be underestimated - burnout risk at startups is real"
      },
      critical_evaluation: "The growth argument is compelling, but it assumes perfect execution and happiness, which isn't guaranteed."
    }
  },

  stage3: {
    summary_markdown: `## Executive Summary: Career Decision Analysis

### Problem
Whether to accept a startup position or remain in current stable employment, weighing growth potential against financial risk.

### Key Tensions
- **Growth vs. Security**: Startup offers accelerated learning and equity potential; current role provides stability and benefits
- **Long-term Value**: Early career risk-taking compounds; but financial cushion is essential first
- **Execution Risk**: Startup success depends on market fit, team, and execution; current role has known outcomes

### Expert Consensus
Both experts agree that **financial readiness is the prerequisite**. If you have 12+ months emergency savings:
- The startup opportunity is strategically sound
- Growth benefits are real and valuable at this career stage
- Risk is manageable with proper safety net

### Recommendation Framework
**Proceed with startup IF:**
1. Emergency fund covers 12+ months expenses
2. You can tolerate income volatility
3. Company has product-market fit indicators
4. Equity package is structured reasonably (4-year vest)

**Stay in current role IF:**
1. Emergency savings are less than 6 months
2. You have dependents or major upcoming expenses
3. Startup shows weak market signals or high turnover
4. Current role offers significant growth path`,

    proposed_solutions: [
      "Accept startup offer with condition of negotiating equity terms and ensuring 12+ months financial runway",
      "Negotiate remote work or flexible arrangement with current company to maintain stability while seeking growth",
      "Request extended due diligence period - meet startup team, understand product roadmap, and verify market fit",
      "Stay in current role for 12-18 months while building emergency savings, then reassess market opportunities",
      "Counter-offer to current company highlighting startup offer to negotiate higher title/compensation/growth opportunities"
    ]
  },

  stage4: {
    expert_1: {
      scores: {
        "Accept startup offer with condition of negotiating equity terms and ensuring 12+ months financial runway": 5,
        "Negotiate remote work or flexible arrangement with current company to maintain stability while seeking growth": 2,
        "Request extended due diligence period - meet startup team, understand product roadmap, and verify market fit": 2,
        "Stay in current role for 12-18 months while building emergency savings, then reassess market opportunities": 1,
        "Counter-offer to current company highlighting startup offer to negotiate higher title/compensation/growth opportunities": 0
      },
      reasoning: "The startup directly addresses career growth needs. Due diligence is critical before committing. The other options don't meaningfully advance your trajectory."
    },
    expert_2: {
      scores: {
        "Accept startup offer with condition of negotiating equity terms and ensuring 12+ months financial runway": 6,
        "Negotiate remote work or flexible arrangement with current company to maintain stability while seeking growth": 2,
        "Request extended due diligence period - meet startup team, understand product roadmap, and verify market fit": 1,
        "Stay in current role for 12-18 months while building emergency savings, then reassess market opportunities": 1,
        "Counter-offer to current company highlighting startup offer to negotiate higher title/compensation/growth opportunities": 0
      },
      reasoning: "Due diligence is essential before any move. Direct acceptance is too hasty. If due diligence is negative, staying/negotiating are better paths than jumping blind."
    }
  }
};
