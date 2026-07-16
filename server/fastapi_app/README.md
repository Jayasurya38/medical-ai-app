# FastAPI RAG pipeline

This service supports:
- ingesting document text or WHO guideline text
- hybrid dense + sparse retrieval
- reranking-style scoring by combining dense and sparse signals
- a second LLM pass that verifies the initial answer against retrieved evidence

## Endpoints
- GET /health
- POST /ingest
- POST /ingest-who-guidelines
- POST /query

## Example usage

Start the service:

```bash
cd server
/usr/bin/python3 -m uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000
```

Upload WHO guidelines:

```bash
curl -X POST "http://127.0.0.1:8000/ingest-who-guidelines" \
  -F "file=@/path/to/who_guidelines.txt"
```

Query the pipeline:

```bash
curl -X POST "http://127.0.0.1:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the WHO recommendations for this topic?","report_id":"who_guidelines"}'
```
