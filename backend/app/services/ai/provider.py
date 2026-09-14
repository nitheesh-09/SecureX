"""AI provider factory and dependency injection helper."""

from app.core.config import settings
from app.services.ai.base import AIAnalysisProvider
from app.services.ai.mock_provider import MockAIAnalysisProvider


def get_ai_provider() -> AIAnalysisProvider:
    """Factory function returning the configured AI analysis provider.

    Default: MockAIAnalysisProvider (works offline without API keys).
    Can be configured via AI_PROVIDER environment variable to 'anthropic' or 'openai'.
    """
    provider_name = (settings.AI_PROVIDER or "mock").lower()

    if provider_name == "mock":
        return MockAIAnalysisProvider()
    elif provider_name in ("anthropic", "openai"):
        # Placeholders for future provider implementations
        # If API key is not configured, gracefully fall back to mock provider
        if provider_name == "anthropic" and not settings.ANTHROPIC_API_KEY:
            return MockAIAnalysisProvider()
        if provider_name == "openai" and not settings.OPENAI_API_KEY:
            return MockAIAnalysisProvider()
        return MockAIAnalysisProvider()
    else:
        return MockAIAnalysisProvider()
