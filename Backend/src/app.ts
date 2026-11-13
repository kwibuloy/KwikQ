import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import queueRoutes from './routes/queueRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export interface AppOptions {
    /** Allowed browser origins. Defaults to CORS_ORIGINS (comma separated) or the Vite dev URL. */
    corsOrigins?: string[];
    /** Max auth requests per IP per window (default 10 per 15 minutes). */
    authRateLimit?: number;
}

export function parseOrigins(value: string | undefined): string[] {
    return (value || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

export function createApp(options: AppOptions = {}) {
    const app = express();
    const origins = options.corsOrigins ?? parseOrigins(process.env.CORS_ORIGINS || process.env.APP_URL);

    // Behind the k8s service / nginx; needed for correct client IPs in rate limiting.
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
    app.disable('x-powered-by');

    app.use(helmet());
    app.use(
        cors({
            origin(origin, callback) {
                // Allow same-origin / server-to-server requests (no Origin header).
                if (!origin || origins.includes(origin)) return callback(null, true);
                return callback(null, false);
            },
            credentials: true,
        }),
    );
    app.use(express.json({ limit: '50kb' }));

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: options.authRateLimit ?? Number(process.env.AUTH_RATE_LIMIT ?? 10),
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
    });
    app.use(['/api/auth/login', '/api/auth/register', '/api/auth/validate-invitation-code'], authLimiter);

    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    app.use('/api', queueRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);

    // Last-resort handler: never leak stack traces or driver messages.

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        const status = (err as { status?: number })?.status;
        if (status && status >= 400 && status < 500) {
            return res.status(status).json({ error: 'Bad request' });
        }
        console.error('Unhandled error:', err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    return app;
}
