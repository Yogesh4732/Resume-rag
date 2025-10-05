let tf = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (err) {
  // Optional dependency: if tfjs-node is not installed, fall back to JS implementation
  tf = null;
}

class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelLoaded = false;
  }

  async initialize() {
    if (this.modelLoaded) return;

    try {
      // For production, you would load a pre-trained sentence embedding model
      // For this demo, we'll use a simple approach with TF-IDF-like embeddings
      console.log('Initializing embedding service...');
      this.modelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw error;
    }
  }

  async generateEmbedding(text) {
    await this.initialize();
    
    // Simple text preprocessing
    const cleanText = this.preprocessText(text);
    const tokens = this.tokenize(cleanText);
    
    // Generate a simple embedding using bag-of-words + TF-IDF approach
    const embedding = this.createEmbedding(tokens);
    
    return embedding;
  }

  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text) {
    return text.split(' ').filter(token => token.length > 2);
  }

  createEmbedding(tokens) {
    // Create a simple 384-dimensional embedding
    const dimension = 384;
    const embedding = new Array(dimension).fill(0);
    
    // Common technical terms with higher weights
    const techTerms = {
      'javascript': [1, 0, 1, 0, 1],
      'python': [0, 1, 0, 1, 0],
      'react': [1, 1, 0, 0, 1],
      'node': [0, 0, 1, 1, 0],
      'aws': [1, 0, 0, 1, 1],
      'docker': [0, 1, 1, 0, 0],
      'kubernetes': [1, 1, 1, 0, 0],
      'machine': [0, 0, 0, 1, 1],
      'learning': [1, 0, 1, 1, 0],
      'database': [0, 1, 0, 0, 1],
      'api': [1, 1, 0, 1, 0],
      'frontend': [1, 0, 1, 0, 0],
      'backend': [0, 1, 0, 1, 1],
      'fullstack': [1, 1, 1, 1, 1]
    };
    
    // Hash function to distribute tokens across dimensions
    const hash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    tokens.forEach(token => {
      if (techTerms[token]) {
        // Use predefined patterns for known technical terms
        techTerms[token].forEach((value, index) => {
          const pos = (hash(token) + index * 77) % dimension;
          embedding[pos] += value * 0.5;
        });
      } else {
        // Distribute unknown tokens using hash
        const positions = [
          hash(token) % dimension,
          (hash(token) * 31) % dimension,
          (hash(token) * 37) % dimension
        ];
        
        positions.forEach(pos => {
          embedding[pos] += 0.3;
        });
      }
    });
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }
    
    return embedding;
  }

  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0;
    }

    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    const similarity = dotProduct / (magnitude1 * magnitude2);
    return Math.max(0, Math.min(1, similarity)); // Clamp between 0 and 1
  }
}

const embeddingService = new EmbeddingService();

const generateEmbedding = async (text) => {
  return await embeddingService.generateEmbedding(text);
};

const calculateSimilarity = (embedding1, embedding2) => {
  return embeddingService.calculateSimilarity(embedding1, embedding2);
};

module.exports = {
  generateEmbedding,
  calculateSimilarity,
  embeddingService
};
