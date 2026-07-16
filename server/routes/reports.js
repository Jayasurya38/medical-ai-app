import express from "express"
import multer from "multer"
import fs from "fs"
import pdfParse from "pdf-parse/lib/pdf-parse.js"
import Groq from "groq-sdk"
import Report from "../models/Report.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

const fastApiUrl = process.env.FASTAPI_URL || "http://127.0.0.1:8000"

async function analyzeWithWhoGuidelines(documentText) {
  try {
    const response = await fetch(`${fastApiUrl}/analyze-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_text: documentText,
        question: "Identify likely health issues from this document and explain the relevant WHO guidance."
      })
    })

    if (!response.ok) {
      throw new Error(`FastAPI returned ${response.status}`)
    }

    const data = await response.json()
    return {
      answer: data.answer || "",
      evidence: data.evidence || []
    }
  } catch (err) {
    console.warn("WHO-guideline analysis unavailable:", err.message)
    return {
      answer: "",
      evidence: []
    }
  }
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = "uploads/"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, uploadDir)
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  fileFilter: function(req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files allowed!"), false)
    }
  }
})



router.post("/upload", protect, upload.single("report"), async (req, res) => {
  let report = null
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF file" })
    }

    report = await Report.create({
      userId:     req.user.userId,
      fileName:   req.file.originalname,
      fileUrl:    req.file.path,
      reportType: req.body.reportType || "blood_test",
      status:     "analyzing"
    })

    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(req.file.path)
    const pdfData = await pdfParse(pdfBuffer)
    const pdfText = pdfData.text.trim()

    console.log("PDF text extracted, length:", pdfText.length)

    // Check if PDF has readable text (not an image-only/scanned PDF)
    if (pdfText.length < 50) {
      await Report.findByIdAndDelete(report._id)
      return res.status(400).json({
        message: "Could not extract text from this PDF. It may be a scanned image. Please upload a text-based PDF."
      })
    }

    // Send to Groq for analysis
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `You are a medical report analyzer. Analyze this medical report text and return a JSON response with exactly this structure:
{
  "summary": "Brief summary of the report in simple language",
  "abnormalValues": [
    {
      "name": "test name",
      "value": "patient value",
      "normalRange": "normal range",
      "status": "HIGH or LOW or NORMAL"
    }
  ],
  "doctorQuestions": [
    "Question 1 to ask doctor",
    "Question 2 to ask doctor",
    "Question 3 to ask doctor"
  ],
  "overallHealth": "Good or Fair or Poor"
}
Return ONLY the JSON. No extra text. No markdown.
Answer ONLY from the report. Never make up values.

Report text: ${pdfText}`
        }
      ],
      model: "llama-3.3-70b-versatile",
    })

    let responseText = chatCompletion.choices[0].message.content
    console.log("Raw Groq response:", responseText)

    // Strip markdown code fences if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    // Extract JSON object using regex as a fallback
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON response. Please try again.")
    }

    const analysis = JSON.parse(jsonMatch[0])
    const whoCheck = await analyzeWithWhoGuidelines(pdfText)
    const enrichedAnalysis = {
      ...analysis,
      whoGuidance: whoCheck.answer || "WHO-guideline verification was not available.",
      whoEvidence: whoCheck.evidence.slice(0, 3)
    }

    await Report.findByIdAndUpdate(report._id, {
      analysis:       JSON.stringify(enrichedAnalysis),
      abnormalValues: analysis.abnormalValues || [],
      rawText:        pdfText,
      guidanceResult: whoCheck.answer || "",
      guidanceEvidence: whoCheck.evidence.slice(0, 3),
      issueSummary: whoCheck.answer ? whoCheck.answer.split("\n")[0] : "",
      status:         "analyzed"
    })

    res.json({
      message:  "Report analyzed successfully",
      reportId: report._id,
      analysis
    })

  } catch (err) {
    console.log("Full error:", err)
    // Clean up the stuck "analyzing" record from the DB
    if (report?._id) {
      await Report.findByIdAndDelete(report._id).catch(() => {})
    }
    res.status(500).json({ message: err.message || "Failed to analyze report. Please try again." })
  }
})

router.get("/my-reports", protect, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
    res.json(reports)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get("/:id", protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }
    res.json(report)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post("/:id/chat", protect, async (req, res) => {
  try {
    const { message } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report || report.userId.toString() !== req.user.userId) {
      return res.status(404).json({ message: "Report not found or unauthorized" });
    }
    
    let textToProcess = report.rawText;
    if (!textToProcess) {
      if (report.fileUrl && fs.existsSync(report.fileUrl)) {
        const pdfBuffer = fs.readFileSync(report.fileUrl);
        const pdfData = await pdfParse(pdfBuffer);
        textToProcess = pdfData.text;
        
        report.rawText = textToProcess;
        await report.save();
      } else {
        return res.status(400).json({ message: "Report text could not be found or extracted." });
      }
    }

    // Limit context length just in case report is incredibly massive
    // Groq Llama 3 70b handles 8192 tokens. 30,000 chars is safe.
    if (textToProcess.length > 30000) {
       textToProcess = textToProcess.substring(0, 30000);
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert, empathetic medical AI assistant. Answer the user's questions based ONLY on the provided medical report context. Do NOT make up medical advice. If the context doesn't contain the answer, say "I cannot find this information in your report." Explain complex medical terms simply.\n\nMEDICAL REPORT CONTEXT:\n${textToProcess}`
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    res.json({ answer: chatCompletion.choices[0].message.content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ message: "Failed to process chat query" });
  }
});

export default router