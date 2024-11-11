import { container } from '@sapphire/framework';
import type { SapphireClient } from '@sapphire/framework';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import MongoStore from 'connect-mongo';
import type { Profile } from 'passport-discord';
import type { Request, Response } from 'express';
import type { Server } from 'http';

export class WebPlugin {
  private static client: SapphireClient;
  private static server: Server;

  public static init(client: SapphireClient): void {
    WebPlugin.client = client;
    void WebPlugin.start();
  }

  private static async start() {
    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'"],
        },
      },
    }));
    app.use(cors());

    // Session setup
    if (!process.env.SESSION_SECRET || !process.env.MONGODB_URI) {
      throw new Error('Missing required environment variables');
    }

    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 60 * 60 * 24 // 1 day
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
      }
    }));

    // Passport setup
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new DiscordStrategy({
      clientID: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['identify', 'guilds']
    }, async (accessToken: string, _refreshToken: string, profile: Profile, done: (error: any, user?: Express.User) => void) => {
      try {
        const user: Express.User = {
          ...profile,
          accessToken
        };
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));

    passport.serializeUser((user: Express.User, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });

    // View engine setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../web/views'));

    // Body parser
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Static files
    app.use(express.static(path.join(__dirname, '../../web/public')));

    // Make the Discord client available to routes
    app.set('client', WebPlugin.client);

    // Import routes
    const { router: authRoutes } = await import('../../web/routes/auth.js');
    const { router: dashboardRoutes } = await import('../../web/routes/dashboard.js');
    const { router: apiRoutes } = await import('../../web/routes/api.js');

    // Use routes
    app.use('/auth', authRoutes);
    app.use('/dashboard', dashboardRoutes);
    app.use('/api', apiRoutes);

    // Error handler
    app.use((err: Error, _req: Request, res: Response) => {
      container.logger.error(err.stack);
      res.status(500).render('error', { error: err });
    });

    // Start the server
    const port = process.env.DASHBOARD_PORT || 3001;
    try {
      const server = app.listen(port, () => {
        container.logger.info(`Dashboard is running on port ${port}`);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          container.logger.error(`Port ${port} is already in use. Please use a different port.`);
          // Try next port
          const nextPort = Number(port) + 1;
          container.logger.info(`Attempting to use port ${nextPort}...`);
          app.listen(nextPort, () => {
            container.logger.info(`Dashboard is running on port ${nextPort}`);
          });
        } else {
          container.logger.error('Failed to start dashboard server:', err);
        }
      });

      WebPlugin.server = server;
    } catch (error) {
      container.logger.error('Failed to start dashboard server:', error);
    }
  }

  public static shutdown(): void {
    if (WebPlugin.server) {
      WebPlugin.server.close(() => {
        container.logger.info('Dashboard server shut down.');
      });
    }
  }
} 