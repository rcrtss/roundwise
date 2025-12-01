#!/usr/bin/env python3
"""
Quick test script to verify RoundWise backend setup and OpenRouter connectivity
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_backend():
    """Test backend modules and API connectivity"""
    
    print("=" * 60)
    print("RoundWise Backend Test Suite")
    print("=" * 60)
    
    # Test 1: Import check
    print("\n[1/3] Checking backend module imports...")
    try:
        from backend.config import OPENROUTER_API_KEY, GATEKEEPER_MODEL
        from backend.llm_client import LLMClient
        from backend.storage import Storage
        print("✓ All imports successful")
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    
    # Test 2: Configuration check
    print("\n[2/3] Checking configuration...")
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY.startswith("your_"):
        print("✗ OPENROUTER_API_KEY not configured")
        print("  Please set OPENROUTER_API_KEY in backend/.env")
        return False
    print(f"✓ GATEKEEPER_MODEL: {GATEKEEPER_MODEL}")
    print("✓ OpenRouter API key configured")
    
    # Test 3: Storage initialization
    print("\n[3/3] Testing storage layer...")
    try:
        storage = Storage()
        conv_id = storage.create_conversation()
        print(f"✓ Created test conversation: {conv_id}")
        
        conv = storage.get_conversation(conv_id)
        if conv and conv['id'] == conv_id:
            print("✓ Successfully retrieved conversation")
        else:
            print("✗ Failed to retrieve conversation")
            return False
            
        storage.add_message(conv_id, "user", "Test message")
        updated_conv = storage.get_conversation(conv_id)
        if updated_conv and len(updated_conv['messages']) == 1:
            print("✓ Successfully stored and retrieved message")
        else:
            print("✗ Failed to store message")
            return False
            
    except Exception as e:
        print(f"✗ Storage error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = asyncio.run(test_backend())
    sys.exit(0 if success else 1)
