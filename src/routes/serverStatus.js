import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({ status: "Server is running" });
});

export default router;