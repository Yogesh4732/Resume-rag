const { calculateSimilarity } = require('./embeddings');

const extractJobRequirements = (description) => {
  const requirements = [];
  const text = description.toLowerCase();
  
  // Common skill patterns
  const skillPatterns = [
    /\b(javascript|js)\b/g,
    /\b(typescript|ts)\b/g,
    /\breact\b/g,
    /\bnode\.?js\b/g,
    /\bpython\b/g,
    /\bjava\b/g,
    /\bc#\b/g,
    /\bc\+\+\b/g,
    /\bhtml\b/g,
    /\bcss\b/g,
    /\bsql\b/g,
    /\bmongodb\b/g,
    /\bpostgresql\b/g,
    /\bmysql\b/g,
    /\baws\b/g,
    /\bazure\b/g,
    /\bgcp\b/g,
    /\bdocker\b/g,
    /\bkubernetes\b/g,
    /\bgit\b/g,
    /\blinux\b/g,
    /\bmachine learning\b/g,
    /\bdeep learning\b/g,
    /\bai\b/g,
    /\bdevops\b/g,
    /\bci\/cd\b/g,
    /\bmicroservices\b/g,
    /\bapi\b/g,
    /\brest\b/g,
    /\bgraphql\b/g
  ];

  const skillNames = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 
    'C#', 'C++', 'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'Linux',
    'Machine Learning', 'Deep Learning', 'AI', 'DevOps', 'CI/CD',
    'Microservices', 'API', 'REST', 'GraphQL'
  ];

  skillPatterns.forEach((pattern, index) => {
    if (pattern.test(text)) {
      requirements.push(skillNames[index]);
    }
  });

  // Experience level patterns
  const experiencePatterns = [
    { pattern: /\b(\d+)\+?\s*years?\s*(of\s*)?experience\b/g, type: 'experience' },
    { pattern: /\bsenior\b/g, type: 'level', value: 'Senior' },
    { pattern: /\bjunior\b/g, type: 'level', value: 'Junior' },
    { pattern: /\blead\b/g, type: 'level', value: 'Lead' },
    { pattern: /\bmanager\b/g, type: 'level', value: 'Manager' }
  ];

  experiencePatterns.forEach(({ pattern, type, value }) => {
    const matches = text.match(pattern);
    if (matches) {
      if (type === 'experience') {
        const years = matches[0].match(/\d+/)[0];
        requirements.push(`${years}+ years experience`);
      } else if (type === 'level') {
        requirements.push(value);
      }
    }
  });

  return [...new Set(requirements)]; // Remove duplicates
};

const matchResumesToJob = (job, resume) => {
  const evidence = {};
  const missingRequirements = [];
  
  const jobRequirements = job.requirements || [];
  const jobSkills = job.skillsRequired || [];
  const allRequirements = [...jobRequirements, ...jobSkills];
  
  const resumeText = resume.parsedContent?.toLowerCase() || '';
  const resumeSkills = resume.extractedData?.skills || [];
  const resumeExperience = resume.extractedData?.experience || [];
  
  // Check each requirement
  allRequirements.forEach(requirement => {
    const reqLower = requirement.toLowerCase();
    let found = false;
    let evidenceText = '';
    
    // Check in resume skills
    const skillMatch = resumeSkills.find(skill => 
      skill.toLowerCase().includes(reqLower) || reqLower.includes(skill.toLowerCase())
    );
    
    if (skillMatch) {
      found = true;
      evidenceText = `Skill listed: ${skillMatch}`;
    } else {
      // Check in resume text
      const sentences = resumeText.split(/[.!?]+/);
      const relevantSentence = sentences.find(sentence => 
        sentence.includes(reqLower) && sentence.length > 10
      );
      
      if (relevantSentence) {
        found = true;
        evidenceText = relevantSentence.trim();
        // Truncate if too long
        if (evidenceText.length > 200) {
          evidenceText = evidenceText.substring(0, 200) + '...';
        }
      }
    }
    
    if (found) {
      evidence[requirement] = evidenceText;
    } else {
      missingRequirements.push(requirement);
    }
  });
  
  // Special handling for experience requirements
  const experienceRequirements = jobRequirements.filter(req => 
    req.includes('years') || req.includes('experience')
  );
  
  experienceRequirements.forEach(req => {
    const yearsMatch = req.match(/\d+/);
    if (yearsMatch) {
      const requiredYears = parseInt(yearsMatch[0]);
      let totalExperience = 0;
      
      // Calculate total experience from resume
      resumeExperience.forEach(exp => {
        if (exp.startDate && exp.endDate) {
          // Simple year calculation (would need better date parsing in production)
          const startYear = parseInt(exp.startDate);
          const endYear = exp.endDate.toLowerCase().includes('present') ? 
            new Date().getFullYear() : parseInt(exp.endDate);
          
          if (startYear && endYear) {
            totalExperience += Math.max(0, endYear - startYear);
          }
        } else if (exp.description) {
          // Look for years mentioned in description
          const expYears = exp.description.match(/\b(\d+)\s*years?\b/);
          if (expYears) {
            totalExperience += parseInt(expYears[1]);
          }
        }
      });
      
      if (totalExperience >= requiredYears) {
        evidence[req] = `${totalExperience} years total experience found`;
        // Remove from missing requirements if it was added
        const index = missingRequirements.indexOf(req);
        if (index > -1) {
          missingRequirements.splice(index, 1);
        }
      }
    }
  });
  
  return {
    evidence,
    missing_requirements: missingRequirements
  };
};

const rankCandidates = (candidates, job) => {
  return candidates.map(candidate => {
    const similarity = calculateSimilarity(job.embedding, candidate.embedding);
    const matchAnalysis = matchResumesToJob(job, candidate);
    
    // Calculate bonus score based on requirements match
    const totalRequirements = (job.requirements?.length || 0) + (job.skillsRequired?.length || 0);
    const matchedRequirements = Object.keys(matchAnalysis.evidence).length;
    const matchRatio = totalRequirements > 0 ? matchedRequirements / totalRequirements : 0;
    
    // Combine similarity and requirements match (weighted average)
    const finalScore = (similarity * 0.7) + (matchRatio * 0.3);
    
    return {
      ...candidate.toSafeJSON(true), // Always show full data for ranking
      score: finalScore,
      similarity: similarity,
      match_ratio: matchRatio,
      evidence: matchAnalysis.evidence,
      missing_requirements: matchAnalysis.missing_requirements
    };
  }).sort((a, b) => b.score - a.score);
};

module.exports = {
  extractJobRequirements,
  matchResumesToJob,
  rankCandidates
};
