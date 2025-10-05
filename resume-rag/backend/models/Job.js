const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  skillsRequired: [String],
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'],
    default: 'Mid'
  },
  location: {
    type: String,
    trim: true
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  remote: {
    type: Boolean,
    default: false
  },
  embedding: {
    type: [Number],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicationDeadline: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for search and filtering
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ skillsRequired: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
