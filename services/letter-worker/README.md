# Letter Worker

Go background worker for queue-backed Reasons-Why letter generation.

## Required environment variables

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)
- `POLL_INTERVAL` (optional, defaults to `2s`)

## Local run

```bash
go run ./cmd/worker
```

## Test

```bash
go test ./...
```

## Container build

```bash
docker build -t insurflow-letter-worker .
```
