"""
AI Provider Abstraction Layer.

Supports: Gemini (default) | OpenAI | Ollama (local LLM)

Features:
  - Response caching with TTL (cachetools)
  - Async rate limiting (aiolimiter)
  - Single AI_PROVIDER config key to switch providers
"""

import hashlib
import time
from abc import ABC, abstractmethod
from typing import Optional

try:
    from cachetools import TTLCache
    _CACHE_AVAILABLE = True
except ImportError:
    _CACHE_AVAILABLE = False

from app.config import settings

# ── In-process response cache (key → response text) ─────────────────────────
_response_cache: dict = TTLCache(maxsize=300, ttl=settings.AI_CACHE_TTL) if _CACHE_AVAILABLE else {}

# ── Simple in-memory rate limiter ────────────────────────────────────────────
_request_log: list[float] = []  # timestamps of recent requests


def _check_rate_limit() -> bool:
    """Returns True if request is allowed, False if rate limit exceeded."""
    now = time.monotonic()
    window = 60.0  # 1 minute
    # Purge old entries
    while _request_log and now - _request_log[0] > window:
        _request_log.pop(0)
    if len(_request_log) >= settings.AI_RATE_LIMIT:
        return False
    _request_log.append(now)
    return True


def _cache_key(prompt: str, context: Optional[dict]) -> str:
    raw = prompt + str(sorted((context or {}).items()))
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


# ─────────────────────────────────────────────────────────────────────────────
# Base class
# ─────────────────────────────────────────────────────────────────────────────

class AIProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate a text completion for the given prompt."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Display name of the model in use."""
        ...


# ─────────────────────────────────────────────────────────────────────────────
# Gemini provider
# ─────────────────────────────────────────────────────────────────────────────

class GeminiProvider(AIProvider):
    def __init__(self, api_key: str, model: str, system_instruction: str = ""):
        try:
            from google import genai
            from google.genai import types as genai_types
            self._client = genai.Client(api_key=api_key)
            self._genai_types = genai_types
            self._sdk = "new"
        except (ImportError, Exception):
            # Fallback to legacy SDK
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=api_key)
            self._legacy_client = genai_legacy.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction or None,
            )
            self._sdk = "legacy"
        self._model = model
        self._system = system_instruction

    @property
    def model_name(self) -> str:
        return self._model

    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        key = _cache_key(prompt, context)
        if key in _response_cache:
            return _response_cache[key]
        if not _check_rate_limit():
            raise RuntimeError("AI rate limit exceeded. Please wait a moment.")
        try:
            if self._sdk == "new":
                contents = prompt
                if self._system:
                    contents = f"{self._system}\n\n{prompt}"
                response = self._client.models.generate_content(
                    model=self._model,
                    contents=contents,
                )
                text = response.text
            else:
                response = self._legacy_client.generate_content(prompt)
                text = response.text
            _response_cache[key] = text
            return text
        except Exception as e:
            raise RuntimeError(f"Gemini API error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# OpenAI provider
# ─────────────────────────────────────────────────────────────────────────────

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str, system_instruction: str = ""):
        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=api_key)
        except ImportError:
            raise RuntimeError("openai package not installed. Run: pip install openai")
        self._model = model
        self._system = system_instruction

    @property
    def model_name(self) -> str:
        return self._model

    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        key = _cache_key(prompt, context)
        if key in _response_cache:
            return _response_cache[key]
        if not _check_rate_limit():
            raise RuntimeError("AI rate limit exceeded.")
        messages = []
        if self._system:
            messages.append({"role": "system", "content": self._system})
        messages.append({"role": "user", "content": prompt})
        response = self._client.chat.completions.create(model=self._model, messages=messages)
        text = response.choices[0].message.content
        _response_cache[key] = text
        return text


# ─────────────────────────────────────────────────────────────────────────────
# Ollama (local LLM) provider
# ─────────────────────────────────────────────────────────────────────────────

class OllamaProvider(AIProvider):
    def __init__(self, base_url: str, model: str, system_instruction: str = ""):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._system = system_instruction

    @property
    def model_name(self) -> str:
        return f"ollama/{self._model}"

    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        import json
        import urllib.request
        key = _cache_key(prompt, context)
        if key in _response_cache:
            return _response_cache[key]
        payload = json.dumps({
            "model": self._model,
            "prompt": (self._system + "\n\n" if self._system else "") + prompt,
            "stream": False,
        }).encode()
        req = urllib.request.Request(
            f"{self._base_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
        text = data.get("response", "")
        _response_cache[key] = text
        return text


# ─────────────────────────────────────────────────────────────────────────────
# Groq Provider
# ─────────────────────────────────────────────────────────────────────────────

class GroqProvider(AIProvider):
    def __init__(self, api_key: str, model: str, system_instruction: str = ""):
        self._api_key = api_key
        self._model = model or "llama-3.3-70b-versatile"
        self._system = system_instruction

    @property
    def model_name(self) -> str:
        return f"groq/{self._model}"

    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        key = _cache_key(prompt, context)
        if key in _response_cache:
            return _response_cache[key]
        if not _check_rate_limit():
            raise RuntimeError("AI rate limit exceeded. Please wait a moment.")
        
        # Try utilizing the openai client with custom base_url first
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self._api_key, base_url="https://api.groq.com/openai/v1")
            messages = []
            if self._system:
                messages.append({"role": "system", "content": self._system})
            messages.append({"role": "user", "content": prompt})
            response = client.chat.completions.create(model=self._model, messages=messages)
            text = response.choices[0].message.content
            _response_cache[key] = text
            return text
        except Exception as e:
            # Fallback to direct HTTP request with urllib
            import json
            import urllib.request
            try:
                payload = json.dumps({
                    "model": self._model,
                    "messages": [
                        *([{"role": "system", "content": self._system}] if self._system else []),
                        {"role": "user", "content": prompt}
                    ]
                }).encode()
                req = urllib.request.Request(
                    "https://api.groq.com/openai/v1/chat/completions",
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self._api_key}"
                    }
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read())
                text = data["choices"][0]["message"]["content"]
                _response_cache[key] = text
                return text
            except Exception as inner_e:
                raise RuntimeError(f"Groq API error (Direct: {inner_e}) (SDK: {e})")


# ─────────────────────────────────────────────────────────────────────────────
# Grok (xAI) Provider
# ─────────────────────────────────────────────────────────────────────────────

class GrokProvider(AIProvider):
    def __init__(self, api_key: str, model: str, system_instruction: str = ""):
        self._api_key = api_key
        self._model = model or "grok-2-1212"
        self._system = system_instruction

    @property
    def model_name(self) -> str:
        return f"grok/{self._model}"

    async def complete(self, prompt: str, context: Optional[dict] = None) -> str:
        key = _cache_key(prompt, context)
        if key in _response_cache:
            return _response_cache[key]
        if not _check_rate_limit():
            raise RuntimeError("AI rate limit exceeded. Please wait a moment.")
        
        # Try utilizing the openai client with custom base_url first
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self._api_key, base_url="https://api.xai.com/v1")
            messages = []
            if self._system:
                messages.append({"role": "system", "content": self._system})
            messages.append({"role": "user", "content": prompt})
            response = client.chat.completions.create(model=self._model, messages=messages)
            text = response.choices[0].message.content
            _response_cache[key] = text
            return text
        except Exception as e:
            # Fallback to direct HTTP request with urllib
            import json
            import urllib.request
            try:
                payload = json.dumps({
                    "model": self._model,
                    "messages": [
                        *([{"role": "system", "content": self._system}] if self._system else []),
                        {"role": "user", "content": prompt}
                    ]
                }).encode()
                req = urllib.request.Request(
                    "https://api.xai.com/v1/chat/completions",
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self._api_key}"
                    }
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read())
                text = data["choices"][0]["message"]["content"]
                _response_cache[key] = text
                return text
            except Exception as inner_e:
                raise RuntimeError(f"Grok API error (Direct: {inner_e}) (SDK: {e})")


# ─────────────────────────────────────────────────────────────────────────────
# Factory
# ─────────────────────────────────────────────────────────────────────────────

_provider_instance: Optional[AIProvider] = None


def get_ai_provider(system_instruction: str = "") -> Optional[AIProvider]:
    """Return the configured AI provider singleton (or None if not configured)."""
    global _provider_instance

    provider_key = settings.AI_PROVIDER.lower()

    if provider_key == "gemini":
        if not settings.GEMINI_API_KEY:
            return None
        if _provider_instance and isinstance(_provider_instance, GeminiProvider):
            return _provider_instance
        _provider_instance = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            system_instruction=system_instruction,
        )
        return _provider_instance

    elif provider_key == "openai":
        if not settings.OPENAI_API_KEY:
            return None
        _provider_instance = OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            system_instruction=system_instruction,
        )
        return _provider_instance

    elif provider_key == "ollama":
        _provider_instance = OllamaProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            system_instruction=system_instruction,
        )
        return _provider_instance

    elif provider_key == "groq":
        if not settings.GROQ_API_KEY:
            return None
        _provider_instance = GroqProvider(
            api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
            system_instruction=system_instruction,
        )
        return _provider_instance

    elif provider_key == "grok":
        if not settings.GROK_API_KEY:
            return None
        _provider_instance = GrokProvider(
            api_key=settings.GROK_API_KEY,
            model=settings.GROK_MODEL,
            system_instruction=system_instruction,
        )
        return _provider_instance

    return None


def clear_response_cache():
    """Clear the AI response cache (e.g., on settings change)."""
    _response_cache.clear()
