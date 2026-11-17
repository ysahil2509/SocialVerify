import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { PORT, DATABASE_URL } from './lib/config';
import { runDatabaseMigrations } from './prisma/migrate';
import logger from './middlewares/logger';
import authenticate from './middlewares/authenticate';
import authRouter from './routes/authRouter';
import newsRouter from './routes/newsRouter';
import eventsRouter from './routes/eventsRouter';
import conversationRouter from './routes/conversationRouter';
import socialRouter from './routes/socialRouter';
import monitoringRouter from './routes/monitoringRouter';

const app = express();

app.use(cors({
    origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the SocialVerify API",
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "SocialVerify API is healthy and running successfully.",
    });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "SocialVerify API is healthy and running successfully.",
    });
});

app.use("/api/auth", authRouter);
app.use("/api/news", authenticate, newsRouter);
app.use("/api/social", authenticate, socialRouter);
app.use("/api/events", authenticate, eventsRouter);
app.use("/api/conversation", authenticate, conversationRouter);
app.use("/api/monitoring", (req, res, next) => {
    if (req.headers.authorization) {
        return authenticate(req, res, next);
    }
    next();
}, monitoringRouter);

app.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting the server ->", err);
        process.exit(1);
    } else {
        console.log(`Server is running on port -> ${PORT}`);
        void runDatabaseMigrations(DATABASE_URL);
    }
});
