# Providers and quota controls

The runner uses one `ProviderResponse` shape for mock and HTTP providers:
response text, returned model, finish reason, usage, latency, and provider
response ID. The mock provider is fully offline and is the only provider used
by tests.

Configured provider IDs are `mock`, `groq`, `gemini`, `openrouter`, `mistral`,
and `azure-openai`. The checked-in model table is metadata only; disabled live
models do not make a network request. Environment variable names are listed in
`.env.example`: `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`,
`GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_MODEL`,
`OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`,
`MISTRAL_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
`AZURE_OPENAI_DEPLOYMENT`, and `MAX_SPEND_USD`. Values belong only in the
git-ignored `.env`.

HTTP requests are opt-in. The adapters read keys from the local `.env`, classify
429 and 5xx responses as retryable, use bounded exponential backoff, and do not
include secrets in attempt records. Authentication and other 4xx responses fail
immediately.

`Quota` enforces requests-per-minute, requests-per-day, and optional spend caps.
The runner writes each raw attempt before grading. Pass `--run-id ID` to resume
an existing run; existing attempt files are reused and are not requested again.
`--no-resume` explicitly disables reuse. `estimate` reports calls, token
estimates, quota fraction, and pacing runtime for every configured model.
Provider-specific capability differences, exact model IDs, prices, and enabled
status must be recorded in `models.yaml` before an approved live run.
