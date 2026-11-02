# Providers and quota controls

The runner uses one `ProviderResponse` shape for mock and HTTP providers:
response text, returned model, finish reason, usage, latency, and provider
response ID. The mock provider is fully offline and is the only provider used
by tests.

HTTP requests are opt-in. The adapters read keys from the local `.env`, classify
429 and 5xx responses as retryable, use bounded exponential backoff, and do not
include secrets in attempt records. Authentication and other 4xx responses fail
immediately.

`Quota` enforces requests-per-minute, requests-per-day, and optional spend caps.
The runner writes each raw attempt before grading. Pass `--run-id ID` to resume
an existing run; existing attempt files are reused and are not requested again.
`--no-resume` explicitly disables reuse. `estimate` reports calls, token
estimates, quota fraction, and pacing runtime for every configured model.
