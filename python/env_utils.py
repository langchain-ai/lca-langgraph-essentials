"""Check Academy environment settings and installed packages."""

import os

from dotenv import dotenv_values


def summarize_value(value: str) -> str:
    """Return masked form: ****last4 or boolean string."""
    lower = value.lower()
    if lower in ("true", "false"):
        return lower
    return "****" + value[-4:] if len(value) > 4 else "****" + value


def _credential_problem(value, example=None):
    """Identify missing, blank, and template credentials without revealing them."""
    if value is None or not value.strip():
        return "is required but not set or empty"
    normalized = value.strip().lower()
    if (
        value == example
        or normalized.startswith(
            ("your_", "your-", "<", "replace_", "replace-", "****")
        )
        or "..." in normalized
        or normalized in {"changeme", "placeholder", "..."}
    ):
        return "still has an example/placeholder value"
    return None


def doublecheck_env(file_path: str, *, chat_provider_keys=None, direct_api_keys=()):
    """Check selected chat providers and independent credentials in the loaded environment."""
    if not os.path.exists(file_path):
        print(f"Did not find file {file_path}.")
        print("This optional check uses example.env, not your credentials file.\n")
        return

    parsed = dotenv_values(file_path)
    required_keys = set(direct_api_keys)
    declared_chat_keys = []
    required_section = False
    with open(file_path) as file:
        for line in file:
            stripped = line.strip()
            if stripped.startswith("# Chat providers:"):
                declared_chat_keys = [
                    key.strip()
                    for key in stripped.split(":", 1)[1].split(",")
                    if key.strip()
                ]
            if stripped.startswith("#"):
                required_section = stripped[1:].strip().lower().startswith("required")
            elif "=" in stripped and required_section:
                required_keys.add(stripped.split("=", 1)[0].strip())

    chat_keys = set(
        declared_chat_keys if chat_provider_keys is None else chat_provider_keys
    )
    gateway = os.getenv("LANGSMITH_GATEWAY", "")
    gateway_enabled = bool(gateway) and gateway.lower() not in {"false", "0", "no"}
    supported_keys = {"OPENAI_API_KEY", "ANTHROPIC_API_KEY"}
    base_overrides = {
        "OPENAI_API_KEY": ("OPENAI_API_BASE", "OPENAI_BASE_URL"),
        "ANTHROPIC_API_KEY": ("ANTHROPIC_API_URL", "ANTHROPIC_BASE_URL"),
    }
    gateway_keys = {
        key
        for key in chat_keys & supported_keys
        if gateway_enabled and not any(os.getenv(name) for name in base_overrides[key])
    }
    required_keys.update(chat_keys - gateway_keys)
    required_keys.difference_update(gateway_keys - set(direct_api_keys))
    if gateway_keys:
        gateway_key = (
            "LANGSMITH_GATEWAY_API_KEY"
            if os.getenv("LANGSMITH_GATEWAY_API_KEY")
            else "LANGSMITH_API_KEY"
        )
        required_keys.add(gateway_key)
        print(
            "LangSmith Gateway enabled for supported chat models; local provider keys are not needed for those calls."
        )
        print(
            "Tools, embeddings, and evaluators keep their own credentials. Tracing is configured independently."
        )
    if gateway_enabled and chat_keys - gateway_keys:
        print(
            "Some selected models use direct authentication (unsupported integration or base URL override)."
        )

    tracing = next(
        (
            os.environ[name]
            for name in (
                "LANGSMITH_TRACING_V2",
                "LANGCHAIN_TRACING_V2",
                "LANGSMITH_TRACING",
                "LANGCHAIN_TRACING",
            )
            if os.getenv(name, "").strip()
        ),
        "",
    )
    if tracing == "true":
        tracing_key = next(
            (
                name
                for name in ("LANGSMITH_API_KEY", "LANGCHAIN_API_KEY")
                if os.getenv(name, "").strip()
            ),
            "LANGSMITH_API_KEY",
        )
        required_keys.add(tracing_key)

    issues = []
    keys = dict.fromkeys([*parsed, *sorted(required_keys)])
    for key in keys:
        current = os.getenv(key)
        print(f"{key}={summarize_value(current) if current else '<not set>'}")
        if key in required_keys:
            problem = _credential_problem(current, parsed.get(key))
            if problem:
                issues.append(f"  {key} {problem}")
    if issues:
        print("\nIssues found:")
        print("\n".join(issues))
    print()
