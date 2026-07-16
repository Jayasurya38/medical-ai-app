import mongoose from "mongoose"

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    enum: ["blood_test", "scan", "prescription", "other"],
    default: "blood_test"
  },
  analysis: {
    type: String,
    default: ""
  },
  rawText: {
    type: String,
    default: ""
  },
  abnormalValues: [{
    name: String,
    value: String,
    normalRange: String,
    status: String
  }],
  guidanceResult: {
    type: String,
    default: ""
  },
  guidanceEvidence: [{
    type: String
  }],
  issueSummary: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["uploaded", "analyzing", "analyzed"],
    default: "uploaded"
  }
}, { timestamps: true })

export default mongoose.model("Report", reportSchema)