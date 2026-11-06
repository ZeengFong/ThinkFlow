"""
Free LLM providers behind one interface.

All of them expose the OpenAI chat-completions API, so one SDK covers them:

  provider  key env var       notes
  groq      GROQ_API_KEY      free, no card; fastest (primary)
  gemini    GEMINI_API_KEY    free tier via Google AI Studio (fallback)
  openai    OPENAI_API_KEY    paid, optional
  ollama    OLLAMA_BASE_URL   runs on your own machine, unlimited

Providers are tried in AI_PROVIDERS order (default groq,gemini,openai,ollama).
Within a provider, two models are tried (they have separate rate limits).
Models are picked from the provider's live /models list, so renamed or
retired models don't break the app; override with GROQ_MODEL etc.
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

import openai

import config

log = logging.getLogger("thinkflow.ai")

NOT_CONFIGURED = (
    "AI isn't set up yet. Add a free GROQ_API_KEY (https://console.groq.com/keys) "
    "to backend/.env."
)
MODEL_CACHE_SECONDS = 3600


@dataclass(frozen=True)
class ProviderSpec:
    name: str
    label: str
    key_env: Optional[str]
    base_url: Optional[str]
    model_env: str
    preferred_models: tuple[str, ...]
    pattern: Optional[str]  # regex for picking from /models when no preferred model exists


SPECS: dict[str, ProviderSpec] = {
    "groq": ProviderSpec(
        name="groq",
        label="Groq",
        key_env="GROQ_API_KEY",
        base_url="https://api.groq.com/openai/v1",
        model_env="GROQ_MODEL",
        preferred_models=("openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "qwen/qwen3-32b"),
        pattern=r"(gpt-oss|llama-3|qwen)",
    ),
    "gemini": ProviderSpec(
        name="gemini",
        label="Gemini",
        key_env="GEMINI_API_KEY",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        model_env="GEMINI_MODEL",
        preferred_models=(),
        pattern=r"^(models/)?gemini-[\d.]+-flash(-lite)?$",
    ),
    "openai": ProviderSpec(
        name="openai",
        label="OpenAI",
        key_env="OPENAI_API_KEY",
        base_url=None,
        model_env="OPENAI_MODEL",
        preferred_models=("gpt-5-mini", "gpt-4o-mini"),
        pattern=None,
    ),
    "ollama": ProviderSpec(
        name="ollama",
        label="Ollama",
        key_env=None,
        base_url=None,
        model_env="OLLAMA_MODEL",
        preferred_models=("llama3.2", "qwen2.5", "llama3.1"),
        pattern=r".",
    ),
}
DEFAULT_ORDER = "groq,gemini,openai,ollama"
_SKIP_MODEL_WORDS = ("whisper", "guard", "tts", "audio", "image", "vision", "embed", "compound", "live", "preview", "exp")


class AIUnavailable(Exception):
    def __init__(self, message: str, *, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class Completion:
    text: str
    provider: str
    model: str


# ─── Configuration ───

def configured_providers() -> list[ProviderSpec]:
    order = [p.strip().lower() for p in config.env("AI_PROVIDERS", DEFAULT_ORDER).split(",")]
    providers = []
    for name in order:
        spec = SPECS.get(name)
        if spec is None or spec in providers:
            continue
        if spec.name == "ollama":
            if config.env("OLLAMA_BASE_URL"):
                providers.append(spec)
        elif spec.key_env and config.env(spec.key_env):
            providers.append(spec)
    return providers


def make_client(spec: ProviderSpec) -> Any:
    if spec.name == "ollama":
        base_url = config.env("OLLAMA_BASE_URL").rstrip("/")
        if not base_url.endswith("/v1"):
            base_url += "/v1"
        return openai.OpenAI(api_key="ollama", base_url=base_url, timeout=120, max_retries=0)
    return openai.OpenAI(
        api_key=config.env(spec.key_env or ""), base_url=spec.base_url, timeout=60, max_retries=1
    )


# Tests replace this to avoid network calls.
client_factory: Callable[[ProviderSpec], Any] = make_client


# ─── Model selection ───

_model_cache: dict[str, tuple[float, list[str]]] = {}


def _gemini_sort_key(model_id: str) -> tuple:
    match = re.search(r"gemini-([\d.]+)-", model_id)
    version = tuple(int(p) for p in match.group(1).split(".") if p.isdigit()) if match else (0,)
    return (version, "lite" not in model_id)


def pick_models(spec: ProviderSpec, available: list[str]) -> list[str]:
    """Best two usable models from a provider's /models list."""
    chosen = [m for m in spec.preferred_models if m in available]
    if spec.pattern:
        rx = re.compile(spec.pattern)
        extra = [
            m for m in available
            if rx.search(m) and m not in chosen and not any(w in m.lower() for w in _SKIP_MODEL_WORDS)
        ]
        if spec.name == "gemini":
            extra.sort(key=_gemini_sort_key, reverse=True)
        chosen += extra
    return chosen[:2]


def resolve_models(spec: ProviderSpec, client: Any) -> list[str]:
    override = config.env(spec.model_env)
    if override:
        return [override]
    cached = _model_cache.get(spec.name)
    if cached and time.time() - cached[0] < MODEL_CACHE_SECONDS:
        return cached[1]
    models: list[str] = []
    try:
        available = [m.id for m in client.models.list()]
        models = pick_models(spec, available)
    except (openai.AuthenticationError, openai.PermissionDeniedError):
        raise
    except Exception as exc:  # listing is best-effort
        log.warning("Couldn't list %s models: %s", spec.label, exc)
    if not models:
        models = list(spec.preferred_models[:2])
    if not models:
        raise AIUnavailable(f"No usable {spec.label} model found. Set {spec.model_env} in backend/.env.")
    _model_cache[spec.name] = (time.time(), models)
    return models


# ─── Calling ───

def _create(client: Any, model: str, messages: list[dict[str, str]], json_mode: bool, temperature: float) -> str:
    kwargs: dict[str, Any] = {"model": model, "messages": messages, "temperature": temperature}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        response = client.chat.completions.create(**kwargs)
    except openai.BadRequestError as exc:
        # Some models reject JSON mode/temperature, or JSON mode fails validation: retry plainly.
        log.info("%s rejected request options (%s); retrying without them", model, exc)
        kwargs.pop("response_format", None)
        kwargs.pop("temperature", None)
        response = client.chat.completions.create(**kwargs)
    text = (response.choices[0].message.content or "").strip()
    if not text:
        raise ValueError("empty response")
    return text


def complete(messages: list[dict[str, str]], *, json_mode: bool = False, temperature: float = 0.4) -> Completion:
    providers = configured_providers()
    if not providers:
        raise AIUnavailable(NOT_CONFIGURED)

    errors: list[str] = []
    only_rate_limits = True
    for spec in providers:
        try:
            client = client_factory(spec)
            models = resolve_models(spec, client)
        except (openai.AuthenticationError, openai.PermissionDeniedError):
            errors.append(f"{spec.label}: API key rejected")
            only_rate_limits = False
            continue
        except AIUnavailable as exc:
            errors.append(exc.message)
            only_rate_limits = False
            continue

        for model in models:
            try:
                text = _create(client, model, messages, json_mode, temperature)
                return Completion(text=text, provider=spec.label, model=model)
            except openai.RateLimitError:
                errors.append(f"{spec.label} {model}: rate limited")
                continue  # the next model has its own limits
            except openai.NotFoundError:
                errors.append(f"{spec.label} {model}: model not found")
                _model_cache.pop(spec.name, None)
                only_rate_limits = False
                continue
            except (openai.AuthenticationError, openai.PermissionDeniedError):
                errors.append(f"{spec.label}: API key rejected")
                only_rate_limits = False
                break
            except (openai.APIConnectionError, openai.APITimeoutError, openai.InternalServerError) as exc:
                errors.append(f"{spec.label}: {type(exc).__name__}")
                only_rate_limits = False
                break
            except (openai.APIError, ValueError) as exc:
                errors.append(f"{spec.label} {model}: {exc}")
                only_rate_limits = False
                continue

    log.warning("All AI providers failed: %s", "; ".join(errors))
    if errors and only_rate_limits:
        raise AIUnavailable(
            "ThinkFlow's free AI quota is used up for the moment. Try again in a minute "
            "(daily limits reset every 24 hours).",
            status_code=429,
        )
    if any("API key rejected" in e for e in errors) and len(errors) == len(providers):
        raise AIUnavailable("The AI API key in backend/.env was rejected. Check that it's copied correctly.")
    raise AIUnavailable("The AI service is unavailable right now. Please try again shortly.")


def parse_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from model output, tolerating ```json fences and chatter."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fenced:
        text = fenced.group(1)
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object in response")
        value = json.loads(text[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("response is not a JSON object")
    return value


def complete_json(messages: list[dict[str, str]], *, temperature: float = 0.4) -> tuple[dict[str, Any], Completion]:
    """Ask for JSON; if the reply can't be parsed, ask once more with the error."""
    completion = complete(messages, json_mode=True, temperature=temperature)
    try:
        return parse_json_object(completion.text), completion
    except (ValueError, json.JSONDecodeError):
        retry = messages + [
            {"role": "assistant", "content": completion.text[:4000]},
            {"role": "user", "content": "That was not valid JSON. Reply again with ONLY the JSON object."},
        ]
        completion = complete(retry, json_mode=True, temperature=0.2)
        try:
            return parse_json_object(completion.text), completion
        except (ValueError, json.JSONDecodeError):
            raise AIUnavailable("The AI returned an unreadable answer. Please try again.", status_code=502)


def status() -> dict[str, Any]:
    providers = configured_providers()
    if not providers:
        return {"configured": False, "provider": None, "model": None, "providers": [], "error": NOT_CONFIGURED}
    primary = providers[0]
    result: dict[str, Any] = {
        "configured": True,
        "provider": primary.label,
        "model": None,
        "providers": [p.label for p in providers],
        "error": None,
    }
    try:
        result["model"] = resolve_models(primary, client_factory(primary))[0]
    except (openai.AuthenticationError, openai.PermissionDeniedError):
        result["error"] = f"The {primary.label} API key was rejected."
    except Exception as exc:  # e.g. offline: still configured
        result["model"] = config.env(primary.model_env) or (primary.preferred_models[:1] or [None])[0]
        log.warning("AI status check failed: %s", exc)
    return result
