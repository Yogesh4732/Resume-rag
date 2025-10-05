const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const JSZip = require('jszip');
const { body, query, validationResult } = require('express-validator');

const Resume = require('../models/Resume');
const { auth, optionalAuth } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { parseResume } = require('../utils/resumeParser');
const { generateEmbedding } = require('../utils/embeddings');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and ZIP files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB
  }
});

// POST /api/resumes - Upload resumes
router.post('/', auth, idempotency, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: 'files',
          message: 'At least one file is required'
        }
      });
    }

    const results = [];
    
    for (const file of req.files) {
      try {
        if (file.mimetype === 'application/zip') {
          // Handle ZIP file
          const zipResults = await processZipFile(file, req.user._id);
          results.push(...zipResults);
        } else {
          // Handle single file
          const result = await processSingleFile(file, req.user._id);
          results.push(result);
        }
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        results.push({
          id: uuidv4(),
          status: 'failed',
          name: file.originalname,
          error: error.message
        });
      }
    }

    res.status(201).json({
      items: results
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Upload failed'
      }
    });
  }
});

// Process single file
async function processSingleFile(file, userId) {
  const resumeId = uuidv4();
  
  const resume = new Resume({
    id: resumeId,
    originalFilename: file.originalname,
    filename: file.filename,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: userId,
    status: 'processing'
  });

  await resume.save();

  // Process asynchronously
  processResumeAsync(resume);

  return {
    id: resumeId,
    status: 'processing',
    name: file.originalname
  };
}

// Process ZIP file
async function processZipFile(zipFile, userId) {
  const results = [];
  const zipData = await fs.readFile(zipFile.path);
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(zipData);

  for (const [filename, file] of Object.entries(zipContents.files)) {
    if (file.dir) continue;

    const extension = path.extname(filename).toLowerCase();
    if (!['.pdf', '.docx'].includes(extension)) continue;

    try {
      const content = await file.async('nodebuffer');
      const tempPath = path.join(path.dirname(zipFile.path), `${uuidv4()}-${filename}`);
      await fs.writeFile(tempPath, content);

      const mimeType = extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      const mockFile = {
        originalname: filename,
        filename: path.basename(tempPath),
        path: tempPath,
        size: content.length,
        mimetype: mimeType
      };

      const result = await processSingleFile(mockFile, userId);
      results.push(result);
    } catch (error) {
      console.error(`Error processing ${filename} from ZIP:`, error);
      results.push({
        id: uuidv4(),
        status: 'failed',
        name: filename,
        error: error.message
      });
    }
  }

  // Clean up ZIP file
  await fs.unlink(zipFile.path).catch(console.error);

  return results;
}

// Async resume processing
async function processResumeAsync(resume) {
  try {
    // Parse resume content
    const parsedData = await parseResume(resume.filePath, resume.mimeType);
    
    // Generate embedding
    const embedding = await generateEmbedding(parsedData.text);
    
    // Update resume with processed data
    resume.parsedContent = parsedData.text;
    resume.extractedData = parsedData.extracted;
    resume.embedding = embedding;
    resume.status = 'processed';
    resume.processedAt = new Date();
    
    await resume.save();
  } catch (error) {
    console.error(`Error processing resume ${resume.id}:`, error);
    resume.status = 'failed';
    resume.errorMessage = error.message;
    await resume.save();
  }
}

module.exports = router;

// GET /api/resumes - List and search resumes with pagination
router.get('/', optionalAuth, [
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
    const isRecruiter = req.user?.isRecruiter || false;

    // Build search filter
    let filter = { status: 'processed' };
    
    if (query) {
      filter.$or = [
        { 'extractedData.name': { $regex: query, $options: 'i' } },
        { 'extractedData.skills': { $regex: query, $options: 'i' } },
        { 'extractedData.experience.company': { $regex: query, $options: 'i' } },
        { 'extractedData.experience.position': { $regex: query, $options: 'i' } },
        { parsedContent: { $regex: query, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const resumes = await Resume.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit + 1); // Get one extra to determine if there are more

    // Determine if there are more results
    const hasMore = resumes.length > limit;
    const items = hasMore ? resumes.slice(0, limit) : resumes;
    const nextOffset = hasMore ? offset + limit : null;

    // Transform results based on user permissions
    const transformedItems = items.map(resume => resume.toSafeJSON(isRecruiter));

    res.json({
      items: transformedItems,
      next_offset: nextOffset
    });
  } catch (error) {
    console.error('Resume list error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve resumes'
      }
    });
  }
});

// GET /api/resumes/:id - Get single resume
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isRecruiter = req.user?.isRecruiter || false;

    const resume = await Resume.findOne({ id });
    
    if (!resume) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found'
        }
      });
    }

    if (resume.status === 'processing') {
      return res.json({
        id: resume.id,
        status: 'processing',
        name: resume.originalFilename,
        uploaded_at: resume.createdAt
      });
    }

    if (resume.status === 'failed') {
      return res.json({
        id: resume.id,
        status: 'failed',
        name: resume.originalFilename,
        uploaded_at: resume.createdAt,
        error: resume.errorMessage
      });
    }

    res.json(resume.toSafeJSON(isRecruiter));
  } catch (error) {
    console.error('Resume get error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve resume'
      }
    });
  }
});

// GET /api/resumes/:id/download - Download resume file (recruiter only)
router.get('/:id/download', auth, async (req, res) => {
  try {
    if (!req.user.isRecruiter) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Recruiter access required'
        }
      });
    }

    const { id } = req.params;
    const resume = await Resume.findOne({ id });
    
    if (!resume) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found'
        }
      });
    }

    // Check if file exists
    try {
      await fs.access(resume.filePath);
    } catch (error) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Resume file not found'
        }
      });
    }

    res.download(resume.filePath, resume.originalFilename);
  } catch (error) {
    console.error('Resume download error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to download resume'
      }
    });
  }
});

// DELETE /api/resumes/:id - Delete resume (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isRecruiter) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Recruiter access required'
        }
      });
    }

    const { id } = req.params;
    const resume = await Resume.findOne({ id });
    
    if (!resume) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found'
        }
      });
    }

    // Delete file
    try {
      await fs.unlink(resume.filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete from database
    await Resume.deleteOne({ id });

    res.json({
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Resume delete error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete resume'
      }
    });
  }
});

module.exports = router;
