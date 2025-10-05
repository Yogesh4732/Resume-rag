const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');

const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { auth } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { generateEmbedding, calculateSimilarity } = require('../utils/embeddings');
const { extractJobRequirements, matchResumesToJob } = require('../utils/jobMatcher');

const router = express.Router();

// POST /api/jobs - Create job
router.post('/', auth, idempotency, [
  body('title')
    .isLength({ min: 1 })
    .withMessage('Job title is required'),
  body('description')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters'),
  body('company')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Company name is required'),
  body('skillsRequired')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('experienceLevel')
    .optional()
    .isIn(['Entry', 'Mid', 'Senior', 'Lead', 'Executive'])
    .withMessage('Invalid experience level'),
  body('location')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Location is required'),
  body('remote')
    .optional()
    .isBoolean()
    .withMessage('Remote must be a boolean'),
  body('salary.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('salary.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const {
      title,
      description,
      company,
      skillsRequired = [],
      experienceLevel = 'Mid',
      location,
      jobType = 'Full-time',
      remote = false,
      salary,
      applicationDeadline
    } = req.body;

    // Extract requirements from description
    const requirements = extractJobRequirements(description);

    // Generate embedding for job description
    const embedding = await generateEmbedding(description + ' ' + skillsRequired.join(' '));

    const jobId = uuidv4();
    const job = new Job({
      id: jobId,
      title,
      company,
      description,
      requirements,
      skillsRequired,
      experienceLevel,
      location,
      jobType,
      remote,
      salary,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      embedding,
      createdBy: req.user._id
    });

    await job.save();

    res.status(201).json({
      id: jobId,
      title,
      company,
      description,
      requirements,
      skillsRequired,
      experienceLevel,
      location,
      jobType,
      remote,
      salary,
      applicationDeadline,
      created_at: job.createdAt
    });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create job'
      }
    });
  }
});

// GET /api/jobs - List jobs with pagination
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('q')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Query must not be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const query = req.query.q;

    let filter = { isActive: true };
    
    if (query) {
      filter.$text = { $search: query };
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('createdBy', 'firstName lastName company');

    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    const nextOffset = hasMore ? offset + limit : null;

    const transformedItems = items.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      skillsRequired: job.skillsRequired,
      experienceLevel: job.experienceLevel,
      location: job.location,
      jobType: job.jobType,
      remote: job.remote,
      salary: job.salary,
      applicationDeadline: job.applicationDeadline,
      created_at: job.createdAt,
      created_by: job.createdBy ? {
        name: `${job.createdBy.firstName || ''} ${job.createdBy.lastName || ''}`.trim(),
        company: job.createdBy.company
      } : null
    }));

    res.json({
      items: transformedItems,
      next_offset: nextOffset
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve jobs'
      }
    });
  }
});

// GET /api/jobs/:id - Get single job
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await Job.findOne({ id, isActive: true })
      .populate('createdBy', 'firstName lastName company');
    
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found'
        }
      });
    }

    res.json({
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      skillsRequired: job.skillsRequired,
      experienceLevel: job.experienceLevel,
      location: job.location,
      jobType: job.jobType,
      remote: job.remote,
      salary: job.salary,
      applicationDeadline: job.applicationDeadline,
      created_at: job.createdAt,
      created_by: job.createdBy ? {
        name: `${job.createdBy.firstName || ''} ${job.createdBy.lastName || ''}`.trim(),
        company: job.createdBy.company
      } : null
    });
  } catch (error) {
    console.error('Job get error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve job'
      }
    });
  }
});

// POST /api/jobs/:id/match - Match job to resumes
router.post('/:id/match', auth, [
  body('top_n')
    .isInt({ min: 1, max: 50 })
    .withMessage('top_n must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { id } = req.params;
    const { top_n } = req.body;

    const job = await Job.findOne({ id, isActive: true });
    
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found'
        }
      });
    }

    // Get all processed resumes
    const resumes = await Resume.find({ 
      status: 'processed',
      embedding: { $exists: true, $ne: [] }
    });

    if (resumes.length === 0) {
      return res.json({
        matches: []
      });
    }

    // Calculate similarities and rank
    const matches = [];
    
    for (const resume of resumes) {
      const similarity = calculateSimilarity(job.embedding, resume.embedding);
      
      // Analyze match details
      const matchAnalysis = matchResumesToJob(job, resume);
      
      matches.push({
        resume_id: resume.id,
        score: similarity,
        evidence: matchAnalysis.evidence,
        missing_requirements: matchAnalysis.missing_requirements,
        resume_name: resume.originalFilename,
        candidate_name: resume.extractedData?.name || '[REDACTED]'
      });
    }

    // Sort by score (descending) and take top_n
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, top_n);

    res.json({
      matches: topMatches
    });
  } catch (error) {
    console.error('Job match error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to match job to resumes'
      }
    });
  }
});

// PUT /api/jobs/:id - Update job (creator only)
router.put('/:id', auth, [
  body('title')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Job title is required'),
  body('description')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { id } = req.params;
    const job = await Job.findOne({ id });
    
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found'
        }
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only job creator can update this job'
        }
      });
    }

    const updates = req.body;
    const allowedUpdates = [
      'title', 'company', 'description', 'skillsRequired', 
      'experienceLevel', 'location', 'jobType', 'remote', 
      'salary', 'applicationDeadline'
    ];

    // Apply updates
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        if (field === 'applicationDeadline' && updates[field]) {
          job[field] = new Date(updates[field]);
        } else {
          job[field] = updates[field];
        }
      }
    }

    // Re-generate embedding if description or skills changed
    if (updates.description || updates.skillsRequired) {
      const skillsText = job.skillsRequired ? job.skillsRequired.join(' ') : '';
      job.embedding = await generateEmbedding(job.description + ' ' + skillsText);
      job.requirements = extractJobRequirements(job.description);
    }

    await job.save();

    res.json({
      message: 'Job updated successfully',
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        skillsRequired: job.skillsRequired,
        experienceLevel: job.experienceLevel,
        location: job.location,
        jobType: job.jobType,
        remote: job.remote,
        salary: job.salary,
        applicationDeadline: job.applicationDeadline,
        updated_at: job.updatedAt
      }
    });
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update job'
      }
    });
  }
});

// DELETE /api/jobs/:id - Delete job (creator only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findOne({ id });
    
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found'
        }
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only job creator can delete this job'
        }
      });
    }

    // Soft delete (mark as inactive)
    job.isActive = false;
    await job.save();

    res.json({
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Job delete error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete job'
      }
    });
  }
});

module.exports = router;
