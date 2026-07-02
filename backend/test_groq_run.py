import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv()

from app.services.ai_provider import get_ai_provider

async def main():
    print("Testing Groq Provider...")
    print("AI_PROVIDER in settings:", os.getenv("AI_PROVIDER"))
    print("GROQ_API_KEY in settings:", os.getenv("GROQ_API_KEY")[:10] + "...")
    
    provider = get_ai_provider(system_instruction="You are a helpful assistant.")
    if not provider:
        print("Error: Could not initialize AI provider")
        return
        
    print(f"Initialized provider: {provider.__class__.__name__} ({provider.model_name})")
    
    try:
        response = await provider.complete("What is customer churn in one short sentence?")
        print("\n--- Response ---")
        print(response)
        print("----------------")
    except Exception as e:
        print("Failed to get response:", e)

if __name__ == "__main__":
    asyncio.run(main())
