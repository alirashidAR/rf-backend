import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import statusRoutes from './routes/serverStatus.js';


const app = express();

app.use(express.json());
app.use(cors());


app.use('/auth', authRoutes);
app.use('/',statusRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

