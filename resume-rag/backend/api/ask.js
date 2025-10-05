const express = require('express');
const { body, validationResult } = require('express-validator');
const Resume = require('../models/Resume');
const { optionalAuth } = require('../middleware/auth');

// Util to match query to relevant resume snippets
function getRelevantSnippets(text, query, k) {
  if (!text || !query) return [];
  // Simple keyword match and extract sentences containing query terms
  const sentences = text.split(/[\r\n\.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const q = query.toLowerCase();
  const matched = sentences
    .filter(s => s.toLowerCase().includes(q))
    .sort((a, b) => b.length - a.length);
  return matched.slice(0, k);
}

const router = express.Router();

router.post('/',
  optionalAuth,
  [
    body('query')
      .isLength({ min: 2 })
      .withMessage('Query must be provided'),
    body('k')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('k must be 1-20'),
  ],
  async (req, res) => {
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

      const { query, k = 5 } = req.body;
      const isRecruiter = req.user?.isRecruiter || false;

      // Only search processed resumes
      const resumes = await Resume.find({ status: 'processed' });
      const results = [];

      resumes.forEach(resume => {
        const snippets = getRelevantSnippets(resume.parsedContent, query, k);
        if (snippets.length > 0) {
          results.push({
            resume_id: resume.id,
            snippet: snippets[0], // best match
            score: 0.8 + (snippets.length / k) * 0.2 // simple relevance score
          });
        }
      });

      // Sort by score and take top-k total
      results.sort((a, b) => b.score - a.score);
      const finalResults = results.slice(0, k);

      res.json({
        results: finalResults
      });
    } catch (error) {
      console.error('Ask error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Query failed'
        }
      });
    }
  }
);

module.exports = router;
