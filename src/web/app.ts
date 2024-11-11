import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import MongoStore from 'connect-mongo';
import type { SapphireClient } from '@sapphire/framework';
import type { Profile } from 'passport-discord';
import '../types/express'; // Import for type augmentation

export async function createWebServer(client: SapphireClient) {
  const app = express();

  // Verify environment variables are loaded
  if (!process.env.SESSION_SECRET || 
      !process.env.DISCORD_CLIENT_ID || 
      !process.env.DISCORD_CLIENT_SECRET || 
      !process.env.MONGODB_URI) {
    throw new Error('Missing required environment variables');
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "https://cdn.discordapp.com", "data:"],
        connectSrc: ["'self'"],
      },
    }
  }));
  
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'your-production-domain'
      : 'http://localhost:3000',
    credentials: true
  }));

  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session setup with MongoDB store
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60 * 24 // 1 day
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: 'lax'
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
  app.set('views', path.join(__dirname, 'views'));

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Make the Discord client available to routes
  app.set('client', client);

  // Import routes
  const authModule = await import('./routes/auth.js');
  const dashboardModule = await import('./routes/dashboard.js');
  const apiModule = await import('./routes/api.js');

  // Use routes
  app.use('/auth', (authModule.default as unknown) as express.Router);
  app.use('/dashboard', (dashboardModule.default as unknown) as express.Router);
  app.use('/api', (apiModule.default as unknown) as express.Router);

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
  });

  return app;
} 