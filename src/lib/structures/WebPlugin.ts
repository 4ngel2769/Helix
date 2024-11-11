import { container } from '@sapphire/framework';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { apiRouter } from '../../dashboard/routes/api';
import { authRouter } from '../../dashboard/routes/auth';
import config from '../../config';
import type { SapphireClient } from '@sapphire/framework';

export class WebPlugin {
    private static _app: express.Application;

    public static get app(): express.Application {
        return this._app;
    }

    public static async init(client: SapphireClient) {
        container.client = client;
        const app = express();
        this._app = app;

        // Session middleware
        app.use(session({
            secret: config.dashboard.session.secret,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: config.bot.mongoUri
            }),
            cookie: config.dashboard.session.cookie
        }));

        // Body parsers
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Routes
        app.use('/api', apiRouter);
        app.use('/auth', authRouter);

        // Serve static frontend files in production
        if (process.env.NODE_ENV === 'production') {
            app.use(express.static(path.join(__dirname, '../../../dashboard/dist')));
            
            // Handle SPA routing
            app.get('*', (req, res, next) => {
                if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
                    return next();
                }
                res.sendFile(path.join(__dirname, '../../../dashboard/dist/index.html'));
            });
        }

        // Start server
        const port = config.dashboard.port;
        app.listen(port, () => {
            container.logger.info(`Dashboard running on port ${port}`);
        });
    }
} 