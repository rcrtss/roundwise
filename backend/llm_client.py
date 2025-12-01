import aiohttp
import json
import asyncio
from typing import Optional, Dict, Any, List
from .config import OPENROUTER_API_KEY

class LLMClient:
    """Async OpenRouter client for LLM queries"""
    
    def __init__(self, api_key: str = OPENROUTER_API_KEY):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        
    async def query_model(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        timeout: int = 60
    ) -> Optional[Dict[str, Any]]:
        """
        Query a single model via OpenRouter.
        
        Returns dict with 'content' and optional 'reasoning_details' on success.
        Returns None on failure.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data["choices"][0]["message"]["content"]
                        
                        result = {"content": content}
                        
                        # Include reasoning details if available (for o1 models)
                        if "reasoning_details" in data["choices"][0]["message"]:
                            result["reasoning_details"] = data["choices"][0]["message"]["reasoning_details"]
                        
                        return result
                    else:
                        error_text = await response.text()
                        print(f"API Error {response.status}: {error_text}")
                        return None
        except asyncio.TimeoutError:
            print(f"Timeout error for model {model}")
            return None
        except Exception as e:
            print(f"Error querying model {model}: {str(e)}")
            return None
    
    async def query_models_parallel(
        self,
        queries: List[tuple],  # [(model, messages, temperature, max_tokens), ...]
        timeout: int = 60
    ) -> List[Optional[Dict[str, Any]]]:
        """
        Query multiple models in parallel using asyncio.gather().
        
        Returns list of results (None for failed queries).
        """
        tasks = [
            self.query_model(
                model=query[0],
                messages=query[1],
                temperature=query[2] if len(query) > 2 else 0.7,
                max_tokens=query[3] if len(query) > 3 else 2000,
                timeout=timeout
            )
            for query in queries
        ]
        
        return await asyncio.gather(*tasks)
