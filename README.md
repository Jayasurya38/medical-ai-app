# 🏥 Medical AI Report Analyzer

A full-stack web application that uses **LLMs (Llama 3.3 70B via Groq)** to analyze medical PDF reports and provides an interactive RAG-powered chatbot to answer questions about your health data.

## ✨ Features

- 📄 **PDF Upload & Parsing** — Upload any medical report in PDF format
- 🤖 **AI-Powered Analysis** — Automatically extracts key insights using Llama 3.3 70B
  - Executive summary in plain language
  - Notable/abnormal lab values with status (HIGH / LOW / NORMAL)
  - Suggested questions to ask your doctor
  - Overall health indication
- 💬 **RAG Chatbot** — Ask specific questions about your report; the AI answers only from your actual data
- 🔐 **User Authentication** — JWT-based secure login and signup
- 🌙 **Dark / Light Mode** — Full theme support
- 📱 **Responsive UI** — Works on all screen sizes

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| AI / LLM | Groq API — Llama 3.3 70B Versatile |
| PDF Parsing | `pdf-parse` |
| Auth | JWT (JSON Web Tokens) |
| File Uploads | Multer |

## 🏗️ Architecture

```
User → React Frontend → Express API → Groq (Llama 3.3 70B)
                               ↓
                          MongoDB (reports, users)
```

**RAG Flow:**
1. PDF is uploaded → text extracted via `pdf-parse`
2. Text is injected into LLM system prompt as context
3. LLM answers user questions grounded strictly in that context

## 🚀 Getting Started

### FastAPI RAG Service

A FastAPI-based RAG endpoint is included under [server/fastapi_app](server/fastapi_app). It can be started separately for document ingestion and retrieval-based QA.

```bash
cd server
chmod +x run_fastapi.sh
./run_fastapi.sh
```

The service exposes:
- GET /health
- POST /ingest for uploading a text file and building a simple retrieval index
- POST /query for question answering against the indexed report context


### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Groq API key — get one free at [console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/medical-ai-app.git
cd medical-ai-app
```

### 2. Setup the Server

```bash
cd server
npm install
```

Create a `.env` file (use `.env.example` as a template):

```bash
cp .env.example .env
```

Fill in your values in `.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/medical-ai-app
JWT_SECRET=your_strong_secret_here
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

Start the server:

```bash
npm start
```

Server runs at: `http://localhost:5000`

### 3. Setup the Client

```bash
cd client
npm install
npm start
```

Client runs at: `http://localhost:3000`

## 📁 Project Structure

```
medical-ai-app/
├── client/                  # React frontend
│   └── src/
│       ├── api/             # Axios config
│       ├── components/      # Navbar, ChatPanel, etc.
│       ├── context/         # Auth & Theme context
│       └── pages/           # Dashboard, Login, ReportDetail, etc.
│
└── server/                  # Node.js backend
    ├── middleware/          # JWT auth middleware
    ├── models/              # Mongoose schemas (User, Report)
    ├── routes/              # auth.js, reports.js
    ├── uploads/             # Temporary PDF storage (git-ignored)
    └── index.js             # Server entry point
```

## 🔒 Security Notes

- `.env` is git-ignored — never commit real credentials
- Uploaded PDFs are stored locally in `server/uploads/` (also git-ignored)
- JWT tokens expire and are verified on every protected route

## 📝 Environment Variables

See `server/.env.example` for all required variables.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.
