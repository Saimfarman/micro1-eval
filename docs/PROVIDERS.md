# Providers and quota controls

The runner normalizes provider outputs into `ProviderResponse`: response text,
returned model, finish reason, usage, latency, and provider response ID. The
default `mock` provider is deterministic and offline. Supported optional
provider IDs are `groq`, `gemini`, `openrouter`, `mistral`, and
`azure-openai`; live adapters use OpenAI-compatible chat-completion requests.

Provider/model entries in `models.yaml` are configuration metadata. The
checked-in live model entries are disabled. Running `python -m evalkit run`
without a provider option uses `mock`; selecting a live provider may make
external network requests and incur cost. Live requests must be explicitly
approved by the operator.

Credentials and endpoint/model values are read from local environment
variables or the git-ignored `.env`. `.env.example` lists variable names only.
Never put key values in source, tasks, results, logs, manifests, API responses,
or frontend assets.

The runner supports bounded retries for retryable transport, 429, and server
errors, quota tracking, optional spend caps, immutable attempt writes, and
resume by run ID. Estimate configured work without making provider requests:

```powershell
python -m evalkit estimate
```

For a live study, confirm provider, model ID, pricing, quota, repetition count,
and spend cap before selecting a live provider. No live result should be
claimed unless it is present in saved run evidence.
