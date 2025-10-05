const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
let redis = null;
try {
	redis = require('redis');
} catch (err) {
	redis = null;
}
require('dotenv').config();

// Import routes
const authRoutes = require('./api/auth');
const resumeRoutes = require('./api/resumes');
const jobRoutes = require('./api/jobs');
const askRoutes = require('./api/ask');

// Import middleware
const rateLimitMiddleware = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Redis client setup (optional)
let redisClient = null;
if (redis && process.env.REDIS_URL) {
	redisClient = redis.createClient({ url: process.env.REDIS_URL });

	redisClient.on('error', (err) => {
		console.error('Redis Client Error:', err);
	});

	redisClient.connect().catch(err => console.error('Redis connect error:', err));
}

// Make redis client available globally (may be null in dev)
app.locals.redis = redisClient;

// Middleware
app.use(helmet());
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ask', askRoutes);

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDB');
    
		// Start server
		const PORT = process.env.PORT || 5000;
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
			console.log(`Environment: ${process.env.NODE_ENV}`);
		});
	})
	.catch((error) => {
		console.error('MongoDB connection error:', error);
		process.exit(1);
	});

// Graceful shutdown
process.on('SIGTERM', async () => {
	console.log('SIGTERM received, shutting down gracefully');
	if (redisClient) {
		await redisClient.quit().catch(() => {});
	}
	await mongoose.connection.close();
	process.exit(0);
});

module.exports = app;
