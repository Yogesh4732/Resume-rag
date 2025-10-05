const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

const parseResume = async (filePath, mimeType) => {
  try {
    let text = '';
    
    if (mimeType === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      throw new Error('Unsupported file type');
    }

    // Extract structured data from text
    const extracted = extractResumeData(text);

    return {
      text: text.trim(),
      extracted
    };
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

const extractResumeData = (text) => {
  const data = {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    address: extractAddress(text),
    skills: extractSkills(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    certifications: extractCertifications(text),
    languages: extractLanguages(text),
    summary: extractSummary(text)
  };

  return data;
};

const extractName = (text) => {
  // Simple name extraction - look for capitalized words at the beginning
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Check if first line looks like a name (2-4 words, all capitalized)
    const nameMatch = firstLine.match(/^([A-Z][a-z]+ )+[A-Z][a-z]+$/);
    if (nameMatch) {
      return firstLine;
    }
  }
  return null;
};

const extractEmail = (text) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
};

const extractPhone = (text) => {
  const phoneRegex = /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
};

const extractAddress = (text) => {
  // Look for address patterns
  const addressRegex = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b[^\n]*/i;
  const match = text.match(addressRegex);
  return match ? match[0].trim() : null;
};

const extractSkills = (text) => {
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'core competencies', 'technologies']);
  if (!skillsSection) return [];

  // Common technical skills
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'HTML', 'CSS', 'TypeScript', 'PHP', 'Ruby', 'C#', 'C++', 'Go', 'Rust',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'SQL', 'MongoDB',
    'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST API', 'Machine Learning',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Linux',
    'DevOps', 'CI/CD', 'Jenkins', 'Terraform', 'Ansible', 'Microservices'
  ];

  const foundSkills = [];
  const textLower = skillsSection.toLowerCase();

  commonSkills.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return foundSkills;
};

const extractExperience = (text) => {
  const experienceSection = extractSection(text, ['experience', 'work experience', 'employment', 'professional experience']);
  if (!experienceSection) return [];

  // Simple extraction - split by years and extract company/position
  const experiences = [];
  const lines = experienceSection.split('\n').filter(line => line.trim());
  
  let currentExp = null;
  for (const line of lines) {
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      if (currentExp) {
        experiences.push(currentExp);
      }
      currentExp = {
        startDate: yearMatch[0],
        endDate: null,
        company: '',
        position: '',
        description: line
      };
    } else if (currentExp && line.trim()) {
      if (!currentExp.company && line.length < 50) {
        currentExp.company = line.trim();
      } else if (!currentExp.position && line.length < 50) {
        currentExp.position = line.trim();
      }
    }
  }
  
  if (currentExp) {
    experiences.push(currentExp);
  }

  return experiences;
};

const extractEducation = (text) => {
  const educationSection = extractSection(text, ['education', 'academic background', 'qualifications']);
  if (!educationSection) return [];

  const education = [];
  const lines = educationSection.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const degreeMatch = line.match(/\b(Bachelor|Master|PhD|Associate|Certificate)\b/i);
    if (degreeMatch) {
      education.push({
        degree: line.trim(),
        institution: '',
        field: '',
        startDate: '',
        endDate: ''
      });
    }
  }

  return education;
};

const extractCertifications = (text) => {
  const certSection = extractSection(text, ['certifications', 'certificates', 'licenses']);
  if (!certSection) return [];

  const lines = certSection.split('\n').filter(line => line.trim() && line.length > 5);
  return lines.map(line => line.trim());
};

const extractLanguages = (text) => {
  const langSection = extractSection(text, ['languages']);
  if (!langSection) return [];

  const commonLanguages = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean',
    'Portuguese', 'Italian', 'Russian', 'Arabic', 'Hindi', 'Dutch', 'Swedish'
  ];

  const foundLanguages = [];
  const textLower = langSection.toLowerCase();

  commonLanguages.forEach(lang => {
    if (textLower.includes(lang.toLowerCase())) {
      foundLanguages.push(lang);
    }
  });

  return foundLanguages;
};

const extractSummary = (text) => {
  const summarySection = extractSection(text, ['summary', 'objective', 'profile', 'about']);
  if (summarySection) {
    return summarySection.split('\n')[0].trim();
  }

  // Fall back to first paragraph
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  return paragraphs.length > 0 ? paragraphs[0].trim() : null;
};

const extractSection = (text, sectionKeywords) => {
  const textLower = text.toLowerCase();
  
  for (const keyword of sectionKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b[\\s\\n]*:?[\\s\\n]*([\\s\\S]*?)(?=\\n\\s*\\b(?:experience|education|skills|summary|objective|certifications|languages|projects|awards)\\b|$)`, 'i');
    const match = textLower.match(regex);
    
    if (match && match[1]) {
      // Find the corresponding section in original text (preserving case)
      const startIndex = text.toLowerCase().indexOf(match[0].toLowerCase());
      if (startIndex !== -1) {
        const sectionText = text.substring(startIndex + match[0].length - match[1].length, startIndex + match[0].length);
        return sectionText.trim();
      }
    }
  }
  
  return null;
};

module.exports = {
  parseResume,
  extractResumeData
};
