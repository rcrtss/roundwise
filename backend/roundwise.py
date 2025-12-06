import json
import asyncio
import re
from typing import Dict, List, Any, Tuple
from .llm_client import LLMClient
from .config import NOTARY_MODEL

def _parse_json_from_response(response_text: str) -> Dict[str, Any]:
    """Helper to extract JSON from response text"""
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Try to find JSON object in response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
    return {}

async def stage1_expert_responses(
    normalized_problem: str,
    key_dimensions: List[str],
    agents: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Stage 1: Query all experts in parallel for initial analyses.
    
    agents: [{"role_name": str, "role_mission": str, "llm_model": str, "agent_id": str}, ...]
    
    Returns: {
        "expert_1": {
            "initial_recommendation": str,
            "one_sentence_summary": str,
            "critical_points_to_consider": {1: str, 2: str, ...}
        },
        ...
    }
    """
    client = LLMClient()
    
    system_prompt_template = """You are a specialized expert analyst with a specific role and perspective.

Your role: {role_name}
Your mission: {role_mission}

Provide an initial analysis of the problem that has been presented to you. Structure your response as valid JSON:

{{
  "initial_recommendation": "Markdown of your reasoning to support your position (max 6 sentences)",
  "one_sentence_summary": "A one sentence chat-like message that explains your overall position",
  "critical_points_to_consider": {{
    "1": "First key point",
    "2": "Second key point",
    "3": "Third key point"
  }}
}}

Be thorough but concise. Focus on YOUR unique perspective and expertise."""

    problem_prompt = f"""Analyze this problem from your expert perspective:

Problem: {normalized_problem}

Key dimensions to consider:
{chr(10).join(f"- {dim}" for dim in key_dimensions)}

Provide your initial analysis now."""

    # Build queries for parallel execution
    queries = []
    agent_ids = []
    
    for agent in agents:
        system_prompt = system_prompt_template.format(
            role_name=agent["role_name"],
            role_mission=agent["role_mission"]
        )
        
        queries.append((
            agent["llm_model"],
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": problem_prompt}
            ],
            0.7,
            2000
        ))
        agent_ids.append(agent["agent_id"])
    
    # Execute in parallel
    responses = await client.query_models_parallel(queries)
    
    # Process responses
    result = {}
    for i, (agent_id, response) in enumerate(zip(agent_ids, responses)):
        agent = agents[i]
        if response:
            try:
                parsed = _parse_json_from_response(response["content"])
                result[agent_id] = {
                    "role_name": agent["role_name"],
                    "initial_recommendation": parsed.get("initial_recommendation", ""),
                    "one_sentence_summary": parsed.get("one_sentence_summary", ""),
                    "critical_points_to_consider": parsed.get("critical_points_to_consider", {})
                }
            except Exception as e:
                print(f"Error parsing response for {agent_id}: {e}")
                result[agent_id] = {
                    "role_name": agent["role_name"],
                    "initial_recommendation": response["content"][:500],
                    "one_sentence_summary": "See full analysis",
                    "critical_points_to_consider": {"1": response["content"][:300]}
                }
        else:
            result[agent_id] = {
                "role_name": agent["role_name"],
                "initial_recommendation": "Response not available",
                "one_sentence_summary": "Failed to generate analysis",
                "critical_points_to_consider": {}
            }
    
    return result

async def stage2_expert_rebuttals(
    normalized_problem: str,
    agents: List[Dict[str, str]],
    stage1_responses: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """
    Stage 2: Experts read each other's analyses and provide rebuttals.
    
    Returns: (rebuttal_responses, label_to_model mapping)
    """
    client = LLMClient()
    
    # Create anonymized labels for other responses
    agent_ids = list(stage1_responses.keys())
    label_to_model = {}
    
    system_prompt_template = """You are a specialized expert analyst with a specific role and perspective.

Your role: {role_name}
Your mission: {role_mission}

You have already provided an initial analysis. Now, you are seeing the initial analysis from another expert.

Read their analysis carefully, analyse critically and be autocritical with yourself. Provide a refined analysis considering the following:
1. In what ways do you agree or disagree with their key points?
2. How could your original analysis be improved or adjusted in light of their perspective?
3. What do you think they can improve in their analysis?
4. Do you wish to revise or reinforce your original analysis?

Structure your response as valid JSON:

{{
  "final_stance": "Your refined position after considering the other expert's perspective",
  "one_sentence_summary": "A concise short chat-like message that explains your refined position",
  "critical_points_to_consider": {{
    "1": "Most relevant point",
    "2": "Second most relevant point",
    "3": "Final point"
  }},
  "critical_evaluation": "Your overall evaluation of the problem given both perspectives"
}}

IMPORTANT
- Consider that the other expert does does not need to have the same perspective as you, so focus on how both analyses can be merged or contrasted to improve overall understanding."""

    result = {}
    
    # Process each expert sequentially or in parallel (can be either)
    for i, agent in enumerate(agents):
        # Get the other expert's response
        other_agent_id = agent_ids[1 - i] if len(agent_ids) == 2 else None
        
        if not other_agent_id or other_agent_id not in stage1_responses:
            continue
        
        other_response = stage1_responses[other_agent_id]
        
        # Create anonymized label
        label = f"Response Expert {1 if i == 0 else 2}"
        label_to_model[label] = agent["llm_model"]
        
        system_prompt = system_prompt_template.format(
            role_name=agent["role_name"],
            role_mission=agent["role_mission"]
        )
        
        other_analysis = f"""Their one-sentence summary: {other_response.get('one_sentence_summary', '')}

Their initial recommendation: {other_response.get('initial_recommendation', '')}

Their key reasoning points:
{chr(10).join(f"- {other_response.get('critical_points_to_consider', {}).get(str(k), '')}" for k in range(1, 4)) if other_response.get('critical_points_to_consider') else ""}"""
        
        rebuttal_prompt = f"""The problem was: {normalized_problem}

Your original analysis summary: {stage1_responses[agent["agent_id"]].get("one_sentence_summary", "")}

Here is another expert's initial analysis:

{other_analysis}

Now provide your rebuttal and refined analysis:"""
        
        response = await client.query_model(
            model=agent["llm_model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": rebuttal_prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        if response:
            try:
                parsed = _parse_json_from_response(response["content"])
                result[agent["agent_id"]] = {
                    "role_name": agent["role_name"],
                    "other_expert_role": stage1_responses[other_agent_id].get("role_name", ""),
                    "final_stance": parsed.get("final_stance", ""),
                    "one_sentence_summary": parsed.get("one_sentence_summary", ""),
                    "critical_points_to_consider": parsed.get("critical_points_to_consider", {}),
                    "critical_evaluation": parsed.get("critical_evaluation", "")
                }
            except Exception as e:
                print(f"Error parsing rebuttal for {agent['agent_id']}: {e}")
                result[agent["agent_id"]] = {
                    "role_name": agent["role_name"],
                    "other_expert_role": stage1_responses[other_agent_id].get("role_name", ""),
                    "final_stance": response["content"][:500],
                    "one_sentence_summary": "See full analysis",
                    "critical_points_to_consider": {},
                    "critical_evaluation": ""
                }
        else:
            result[agent["agent_id"]] = {
                "role_name": agent["role_name"],
                "other_expert_role": stage1_responses[other_agent_id].get("role_name", ""),
                "final_stance": "Rebuttal not available",
                "one_sentence_summary": "Failed to generate rebuttal",
                "critical_points_to_consider": {},
                "critical_evaluation": ""
            }
    
    return result, label_to_model

async def stage3_notary_synthesis(
    normalized_problem: str,
    stage1_responses: Dict[str, Any],
    stage2_responses: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Stage 3: Notary synthesizes discussion and extracts unique solutions.
    
    Returns: {
        "summary_markdown": str,
        "proposed_solutions": [
            {"id": "1", "text": "Solution text"},
            {"id": "2", "text": "Solution text"},
            ...
        ]
    }
    """
    client = LLMClient()
    
    # Build context from all stages
    stage1_text = json.dumps(stage1_responses, indent=2)
    stage2_text = json.dumps(stage2_responses, indent=2)
    
    synthesis_prompt = f"""You are a Notary - a synthesizer of expert deliberations.

The problem under discussion:
{normalized_problem}

Expert analyses (Stage 1):
{stage1_text}

Expert rebuttals (Stage 2):
{stage2_text}

Your job:
1. Synthesize the key points and areas of agreement/disagreement among experts
2. Produce a coherent markdown summary that captures the essential debate
3. Extract a deduplicated list of unique solutions or recommendations that appeared in the expert analyses

Return only valid JSON:
{{
  "summary_markdown": "A bulleted markdown summary capturing the key points of the expert discussion, with headers: Problem Overview, Expert Analyses, Key Agreements and Disagreements. Max 3 points per section.",
  "proposed_solutions": [
    {{"id": "1", "text": "Solution 1 or recommendation mentioned by experts"}},
    {{"id": "2", "text": "Solution 2 or recommendation mentioned by experts"}},
    {{"id": "3", "text": "Solution 3 or recommendation mentioned by experts"}}
  ]
}}

IMPORTANT: 
- Each solution MUST have an "id" field (sequential: "1", "2", "3", etc.)
- Each solution MUST have a "text" field with the full solution description
- Solutions should be concise, unique statements that capture distinct approaches
- Deduplicate fundamentally equivalent solutions
- If more than 5 solutions are found, prioritize the most comprehensive or frequently mentioned ones
- If no clear solutions emerged, return an empty list for proposed_solutions"""
    
    response = await client.query_model(
        model=NOTARY_MODEL,
        messages=[
            {"role": "system", "content": "You are a Notary synthesizing expert deliberation. Return ONLY valid JSON, no other text."},
            {"role": "user", "content": synthesis_prompt}
        ],
        temperature=0.7,
        max_tokens=2000
    )
    
    if response:
        try:
            parsed = _parse_json_from_response(response["content"])
            proposed_solutions = parsed.get("proposed_solutions", [])
            
            # Ensure all solutions have id and text fields
            validated_solutions = []
            for i, sol in enumerate(proposed_solutions, 1):
                if isinstance(sol, dict):
                    validated_solutions.append({
                        "id": sol.get("id", str(i)),
                        "text": sol.get("text", str(sol))
                    })
                else:
                    # Fallback for string-only solutions
                    validated_solutions.append({
                        "id": str(i),
                        "text": str(sol)
                    })
            
            return {
                "summary_markdown": parsed.get("summary_markdown", ""),
                "proposed_solutions": validated_solutions
            }
        except Exception as e:
            print(f"Error parsing notary synthesis: {e}")
            return {
                "summary_markdown": response["content"],
                "proposed_solutions": []
            }
    else:
        return {
            "summary_markdown": "Synthesis not available",
            "proposed_solutions": []
        }

async def stage4_expert_scoring(
    proposed_solutions: List[Dict[str, str]],
    stage1_responses: Dict[str, Any],
    agents: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Stage 4: Each expert allocates 10 points across proposed solutions.
    
    proposed_solutions: [{"id": "1", "text": "Solution text"}, ...]
    
    Returns: {
        "expert_1": {
            "scores": [
                {"id": "1", "text": "Solution text", "points": 5},
                {"id": "2", "text": "Solution text", "points": 3},
                ...
            ],
            "reasoning": str
        },
        ...
    }
    """
    client = LLMClient()
    
    if not proposed_solutions:
        proposed_solutions = [{"id": "1", "text": "Default solution"}]
    
    # Build solutions list text
    solutions_text = "\n".join(
        f"{sol['id']}. {sol['text']}" 
        for sol in proposed_solutions
    )
    
    system_prompt_template = """You are a specialized expert analyst evaluating proposed solutions.

Your role: {role_name}
Your mission: {role_mission}

You must allocate exactly 10 points across the proposed solutions based on how convincing you find each one from your expert perspective.

Return ONLY valid JSON:
{{
  "scores": [
    {{"id": "1", "points": 3}},
    {{"id": "2", "points": 5}},
    {{"id": "3", "points": 2}}
  ],
  "reasoning": "Brief explanation of your scoring rationale"
}}

CONSTRAINTS:
- Each score MUST have an "id" field matching the solution ID
- Each score MUST have a "points" field (integer >= 0)
- Points must be integers >= 0
- Total points MUST equal 10
- Score all solutions provided"""
    
    result = {}
    
    for agent in agents:
        system_prompt = system_prompt_template.format(
            role_name=agent["role_name"],
            role_mission=agent["role_mission"]
        )
        
        # Use the correct agent_id to fetch stage1 response
        agent_id = agent["agent_id"]
        agent_stage1 = stage1_responses.get(agent_id, {})
        
        prompt = f"""Based on the discussion so far, please allocate exactly 10 points across these proposed solutions:

{solutions_text}

Your original position summary: {agent_stage1.get("one_sentence_summary", "")}

Allocate your 10 points now. Solutions you consider more convincing get more points. Return the scores as a JSON array with id and points fields."""
        
        response = await client.query_model(
            model=agent["llm_model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1000
        )
        
        if response:
            try:
                parsed = _parse_json_from_response(response["content"])
                scores_list = parsed.get("scores", [])
                
                # Validate and normalize scores
                score_map = {}
                total_points = 0
                
                for score_obj in scores_list:
                    if isinstance(score_obj, dict):
                        sol_id = score_obj.get("id", "")
                        points = int(score_obj.get("points", 0))
                        score_map[sol_id] = points
                        total_points += points
                
                # If total doesn't equal 10, normalize
                if total_points != 10 and total_points > 0:
                    normalized_map = {}
                    for sol_id, points in score_map.items():
                        normalized_map[sol_id] = max(0, int(points * 10 / total_points))
                    score_map = normalized_map
                    # Adjust for rounding errors
                    current_total = sum(score_map.values())
                    if current_total < 10:
                        # Add remaining points to first solution
                        first_id = list(score_map.keys())[0] if score_map else ""
                        if first_id:
                            score_map[first_id] += (10 - current_total)
                
                # Build output with full solution text
                scores_output = []
                for sol in proposed_solutions:
                    sol_id = sol.get("id", "")
                    points = score_map.get(sol_id, 0)
                    scores_output.append({
                        "id": sol_id,
                        "text": sol.get("text", ""),
                        "points": points
                    })
                
                result[agent_id] = {
                    "role_name": agent["role_name"],
                    "scores": scores_output,
                    "reasoning": parsed.get("reasoning", "")
                }
            except Exception as e:
                print(f"Error parsing scoring for {agent_id}: {e}")
                # Fallback: equal distribution
                per_solution = 10 // len(proposed_solutions)
                scores_output = [
                    {
                        "id": sol.get("id", ""),
                        "text": sol.get("text", ""),
                        "points": per_solution
                    }
                    for sol in proposed_solutions
                ]
                result[agent_id] = {
                    "role_name": agent["role_name"],
                    "scores": scores_output,
                    "reasoning": "Fallback equal distribution"
                }
        else:
            # Fallback: equal distribution
            per_solution = 10 // len(proposed_solutions)
            scores_output = [
                {
                    "id": sol.get("id", ""),
                    "text": sol.get("text", ""),
                    "points": per_solution
                }
                for sol in proposed_solutions
            ]
            result[agent_id] = {
                "role_name": agent["role_name"],
                "scores": scores_output,
                "reasoning": "Fallback: response not available"
            }
    
    return result
