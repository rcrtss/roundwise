import json
from typing import Dict, List, Any
from .llm_client import LLMClient
from .config import GATEKEEPER_MODEL

async def to_gatekeeper(problem: str) -> Dict[str, Any]:
    """
    Stage 0: Send problem to Gatekeeper to normalize and propose expert roles.
    
    Returns:
    {
        "normalized_problem": str,
        "key_dimensions": [str, ...],
        "proposed_agents": [
            {"role_name": str, "role_mission": str, "llm_model": str, "agent_id": str},
            ...
        ]
    }
    """
    client = LLMClient()
    
    system_prompt = """You are a Gatekeeper AI that normalizes problem statements and proposes expert roles for analysis.

Your job:
1. Normalize the user's problem statement for clarity and remove ambiguity, without removing details.
2. Identify 2-3 key dimensions or stakeholder perspectives relevant to this problem
3. Propose exactly 2 expert roles that would provide diverse perspectives on this problem

Return ONLY valid JSON (no markdown, no extra text) with this structure:
{
  "normalized_problem": "A clear, concise version of the problem",
  "key_dimensions": ["dimension1", "dimension2", "dimension3"],
  "proposed_agents": [
    {
      "role_name": "Expert Role Name",
      "role_mission": "What this expert should focus on (1-3 sentences)",
      "llm_model": "openai/gpt-4-turbo",
      "agent_id": "expert_1"
    },
    {
      "role_name": "Another Expert Role",
      "role_mission": "Different perspective or focus area (1-3 sentences)",
      "llm_model": "openai/gpt-4-turbo",
      "agent_id": "expert_2"
    }
  ]
}"""

    messages = [
        {
            "role": "user",
            "content": f"Please analyze this problem and propose expert roles:\n\n{problem}"
        }
    ]
    
    response = await client.query_model(
        model=GATEKEEPER_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            *messages
        ],
        temperature=0.7,
        max_tokens=1500
    )
    
    if not response:
        # Fallback if Gatekeeper fails
        return {
            "normalized_problem": problem,
            "key_dimensions": ["Technical", "Business", "User Experience"],
            "proposed_agents": [
                {
                    "role_name": "Technical Expert",
                    "role_mission": "Analyze the technical feasibility and implementation aspects",
                    "llm_model": GATEKEEPER_MODEL,
                    "agent_id": "expert_1"
                },
                {
                    "role_name": "Business Strategist",
                    "role_mission": "Consider business impact, market fit, and strategic implications",
                    "llm_model": GATEKEEPER_MODEL,
                    "agent_id": "expert_2"
                }
            ]
        }
    
    try:
        # Extract JSON from response
        content = response["content"]
        # Try to parse as JSON directly
        result = json.loads(content)
        return result
    except json.JSONDecodeError:
        # Try to find JSON in the response
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return result
            except:
                pass
        
        # Return fallback
        return {
            "normalized_problem": problem,
            "key_dimensions": ["Technical", "Business", "User Experience"],
            "proposed_agents": [
                {
                    "role_name": "Technical Expert",
                    "role_mission": "Analyze the technical feasibility and implementation aspects",
                    "llm_model": GATEKEEPER_MODEL,
                    "agent_id": "expert_1"
                },
                {
                    "role_name": "Business Strategist",
                    "role_mission": "Consider business impact, market fit, and strategic implications",
                    "llm_model": GATEKEEPER_MODEL,
                    "agent_id": "expert_2"
                }
            ]
        }
