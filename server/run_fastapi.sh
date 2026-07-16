#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-fastapi.txt
uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8000 --reload
