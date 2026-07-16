import os
import re
from collections import Counter
from typing import Dict, List, Optional

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from groq import Groq
from pydantic import BaseModel

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="Medical RAG API", version="1.0.0")

INDEX_STORE: Dict[str, Dict[str, object]] = {}
GUIDELINE_STORE: Dict[str, Dict[str, object]] = {}
EMBEDDING_DIM = 256


class QueryRequest(BaseModel):
    question: str
    report_id: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    evidence: List[str]


class AnalyzeReportRequest(BaseModel):
    document_text: str
    question: Optional[str] = None


class AnalyzeReportResponse(BaseModel):
    answer: str
    evidence: List[str]


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 180) -> List[str]:
    if not text.strip():
        return []

    words = re.findall(r"\S+", text)
    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start = max(0, end - overlap)
    return chunks


def build_embedding(texts: List[str]) -> np.ndarray:
    vectors = np.zeros((len(texts), EMBEDDING_DIM), dtype=np.float32)
    for idx, text in enumerate(texts):
        tokens = re.findall(r"\w+", text.lower())
        for token in tokens:
            h = abs(hash(token)) % EMBEDDING_DIM
            vectors[idx, h] += 1.0

    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def build_index(chunks: List[str]) -> Dict[str, object]:
    vectors = build_embedding(chunks)
    index = faiss.IndexFlatL2(EMBEDDING_DIM)
    index.add(vectors)
    return {"chunks": chunks, "index": index, "vectors": vectors}


def sparse_score(question: str, chunk: str) -> float:
    question_terms = Counter(re.findall(r"\w+", question.lower()))
    chunk_terms = Counter(re.findall(r"\w+", chunk.lower()))
    if not question_terms:
        return 0.0

    score = 0.0
    for term, q_freq in question_terms.items():
        score += q_freq * (chunk_terms.get(term, 0) + 1)
    return score / (sum(question_terms.values()) + 1e-8)


def retrieve_context(question: str, store: Dict[str, object], top_k: int = 5) -> List[Dict[str, object]]:
    chunks = store.get("chunks", [])
    index = store.get("index")
    vectors = store.get("vectors")
    if not chunks or not index or vectors is None:
        return []

    query_vector = build_embedding([question])[0:1]
    query_vector = query_vector.astype(np.float32)
    dense_scores = []
    for vector in vectors:
        dense_scores.append(float(np.dot(query_vector[0], vector)))

    sparse_scores = [sparse_score(question, chunk) for chunk in chunks]
    dense_max = max(dense_scores) if dense_scores else 1.0
    sparse_max = max(sparse_scores) if sparse_scores else 1.0

    candidates: List[Dict[str, object]] = []
    for idx, chunk in enumerate(chunks):
        dense_norm = dense_scores[idx] / max(dense_max, 1e-8)
        sparse_norm = sparse_scores[idx] / max(sparse_max, 1e-8)
        overlap = len(set(re.findall(r"\w+", question.lower())) & set(re.findall(r"\w+", chunk.lower())))
        combined_score = (0.7 * dense_norm) + (0.3 * sparse_norm) + (0.05 * overlap)
        candidates.append({"text": chunk, "score": combined_score})

    ranked = sorted(candidates, key=lambda item: item["score"], reverse=True)
    return ranked[:top_k]


def generate_answer(question: str, context_chunks: List[str]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return (
            "Groq API key is not configured. The RAG pipeline is running locally with retrieved context, "
            "but a live LLM response requires GROQ_API_KEY."
        )

    client = Groq(api_key=api_key)
    context = "\n\n".join(context_chunks[:5]) if context_chunks else "No relevant context was found."
    prompt = (
        "You are a medical assistant. Answer the user's question using only the provided context. "
        "If the context does not contain the answer, say that you cannot find it in the report.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": "You are a helpful medical assistant."}, {"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return completion.choices[0].message.content


def verify_answer(question: str, answer: str, context_chunks: List[str]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return answer

    client = Groq(api_key=api_key)
    context = "\n\n".join(context_chunks[:5]) if context_chunks else "No relevant context was found."
    prompt = (
        "You are a medical evidence checker. Review the candidate answer against the retrieved context. "
        "If the candidate answer is not fully supported by the context, rewrite it to be grounded only in the retrieved evidence.\n\n"
        f"Question:\n{question}\n\nCandidate answer:\n{answer}\n\nRetrieved context:\n{context}"
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": "You are a careful evidence validator."}, {"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return completion.choices[0].message.content


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/ingest", response_model=QueryResponse)
async def ingest_report(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".txt", ".md")):
        raise HTTPException(status_code=400, detail="Only .txt or .md files are supported for this FastAPI RAG service")

    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Uploaded text is empty")

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="The uploaded text did not yield any chunks")

    report_id = file.filename or "default"
    INDEX_STORE[report_id] = build_index(chunks)

    summary = generate_answer("Summarize this medical report in plain language.", chunks)
    return QueryResponse(answer=summary, sources=[file.filename], evidence=chunks[:3])


@app.post("/ingest-who-guidelines", response_model=QueryResponse)
async def ingest_who_guidelines(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".txt", ".md")):
        raise HTTPException(status_code=400, detail="Only .txt or .md files are supported")

    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Uploaded text is empty")

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="The uploaded text did not yield any chunks")

    GUIDELINE_STORE["who_guidelines"] = build_index(chunks)
    summary = generate_answer("Summarize the WHO guidance in plain language.", chunks)
    return QueryResponse(answer=summary, sources=[file.filename], evidence=chunks[:3])


@app.post("/query", response_model=QueryResponse)
async def query_report(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    report_id = request.report_id or "who_guidelines"
    store = INDEX_STORE.get(report_id)
    if not store:
        store = GUIDELINE_STORE.get("who_guidelines")

    if not store:
        raise HTTPException(status_code=404, detail="No report or WHO guideline corpus has been ingested yet")

    ranked_chunks = retrieve_context(request.question, store)
    context_chunks = [item["text"] for item in ranked_chunks]
    initial_answer = generate_answer(request.question, context_chunks)
    verified_answer = verify_answer(request.question, initial_answer, context_chunks)
    return QueryResponse(
        answer=verified_answer,
        sources=[report_id],
        evidence=[item["text"] for item in ranked_chunks],
    )


@app.post("/analyze-report", response_model=AnalyzeReportResponse)
async def analyze_report(request: AnalyzeReportRequest):
    if not request.document_text.strip():
        raise HTTPException(status_code=400, detail="Document text cannot be empty")

    question = request.question or "Identify likely health issues in this document and explain the relevant WHO guidance."
    store = GUIDELINE_STORE.get("who_guidelines")
    if not store:
        raise HTTPException(status_code=404, detail="No WHO guideline corpus has been ingested yet")

    ranked_chunks = retrieve_context(question, store)
    context_chunks = [item["text"] for item in ranked_chunks]
    context = "\n\n".join(context_chunks[:5]) if context_chunks else "No WHO guidance context was found."

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return AnalyzeReportResponse(answer="WHO-guideline verification is unavailable because GROQ_API_KEY is not configured.", evidence=context_chunks)

    client = Groq(api_key=api_key)
    prompt = (
        "You are a medical evidence assistant. Review the uploaded report text and compare it with WHO guidance context. "
        "Describe the likely issues, explain the relevant WHO guidance, and clearly state any limitations.\n\n"
        f"Report text:\n{request.document_text}\n\nWHO guidance context:\n{context}"
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": "You are a careful medical evidence assistant."}, {"role": "user", "content": prompt}],
        temperature=0.2,
    )
    answer = completion.choices[0].message.content
    return AnalyzeReportResponse(answer=answer, evidence=context_chunks)
