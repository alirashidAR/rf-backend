import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import statusRoutes from './routes/serverStatus.js';
import projectRoutes from './routes/projectRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import metricRoutes from './routes/metricRoutes.js';


const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again later.',
});

const app = express();

app.use(limiter)
app.use(express.json());
app.use(cors('*'));

//metrics route
app.use('/api', metricRoutes);
app.use('/auth', authRoutes);
app.use('/',statusRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', searchRoutes);
app.use('/api',facultyRoutes);
app.use('/api', userRoutes);

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});

