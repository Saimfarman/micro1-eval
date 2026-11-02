import time

import pytest

from evalkit.model_config import estimate, load_models
from evalkit.providers import Quota


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
