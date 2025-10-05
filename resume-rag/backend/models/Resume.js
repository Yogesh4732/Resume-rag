const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'processed', 'failed'],
    default: 'processing'
  },
  parsedContent: {
    type: String
  },
  extractedData: {
    name: String,
    email: String,
    phone: String,
    address: String,
    skills: [String],
    experience: [{
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      description: String,
      duration: String
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: String,
      endDate: String,
      gpa: String
    }],
    certifications: [String],
    languages: [String],
    summary: String
  },
  embedding: {
    type: [Number],
    default: []
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for search
resumeSchema.index({ 'extractedData.skills': 1 });
resumeSchema.index({ 'extractedData.name': 1 });
resumeSchema.index({ status: 1 });
resumeSchema.index({ createdAt: -1 });

// Method to redact PII
resumeSchema.methods.toSafeJSON = function(isRecruiter = false) {
  const resume = this.toObject();
  
  if (!isRecruiter && resume.extractedData) {
    // Redact PII fields for non-recruiters
    const piiFields = ['email', 'phone', 'address', 'name'];
    piiFields.forEach(field => {
      if (resume.extractedData[field]) {
        resume.extractedData[field] = '[REDACTED]';
      }
    });
    
    // Redact personal info from experience and education
    if (resume.extractedData.experience) {
      resume.extractedData.experience = resume.extractedData.experience.map(exp => ({
        ...exp,
        description: exp.description ? '[REDACTED]' : exp.description
      }));
    }
  }
  
  return resume;
};

module.exports = mongoose.model('Resume', resumeSchema);
