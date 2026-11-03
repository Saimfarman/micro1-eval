import time

import pytest

from evalkit.model_config import estimate, load_models
from evalkit.providers import Quota, ProviderResponse, mock_response, validate_provider_config


def test_quota_enforces_request_rate_and_spend_cap():
    quota = Quota(requests_per_minute=1, requests_per_day=2, spend_cap_usd=0.1)
    quota.reserve(0.1, now=10)
    with pytest.raises(RuntimeError, match="requests-per-minute"):
        quota.reserve(0, now=10)
    with pytest.raises(RuntimeError, match="spend cap"):
        quota.reserve(0.01, now=100)


def test_model_config_estimate_is_deterministic(tmp_path):
    models = load_models(__import__("pathlib").Path("models.yaml"))
    result = estimate(models, 19, repetitions=2)
    assert result["tasks"] == 19
    assert result["models"][0]["calls"] == 38


def test_quota_daily_limit():
    quota = Quota(requests_per_minute=100, requests_per_day=1)
    quota.reserve(now=time.monotonic())
    with pytest.raises(RuntimeError, match="per-day"):
        quota.reserve(now=time.monotonic())


def test_provider_response_contract_contains_redacted_metadata():
    response = mock_response({"id": "T1", "module": "M1", "history": "Keys: x. Initial: x=0.\nT1  start=1  commit=2  w(x)=1", "prompt": "x"})
    assert isinstance(response, ProviderResponse)
    assert response.request_metadata["live"] is False
    assert "api_key" not in response.request_metadata


def test_live_provider_validation_is_network_free(tmp_path, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = validate_provider_config("groq", tmp_path)
    assert result["ready"] is False
    assert "GROQ_API_KEY" in result["missing"]
