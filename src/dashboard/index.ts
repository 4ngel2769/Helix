import { Server } from '@sapphire/plugin-api';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { apiRouter } from './routes/api';
import { authRouter } from './routes/auth';
import path from 'path';
import express from 'express';
import config from '../config';
import type { DiscordUser } from './types';

// Create a new Sapphire API server
const server = new Server({
    origin: config.dashboard.domain,
    prefix: 'api',
    listenOptions: { port: config.dashboard.port || 3000 }
});

// Session middleware
const sessionMiddleware = session({
    secret: config.dashboard.session.secret,
    name: config.dashboard.session.name,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.dashboard.mongoUri
    }),
    cookie: config.dashboard.session.cookie
});

// Passport configuration
passport.use(new DiscordStrategy({
    clientID: config.dashboard.oauth.clientId,
    clientSecret: config.dashboard.oauth.clientSecret,
    callbackURL: `${config.dashboard.domain}${config.dashboard.redirectUri}`,
    scope: config.dashboard.oauth.scopes
}, async (accessToken, refreshToken, profile, done) => {
    try {
        return done(null, {
            ...profile,
            accessToken,
            refreshToken
        });
    } catch (error) {
        return done(error as Error, undefined);
    }
}));

passport.serializeUser((user: Express.User, done) => {
    done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
    done(null, obj);
});

// Add middlewares to Sapphire's server
(server as any).express
    .use(sessionMiddleware)
    .use(passport.initialize())
    .use(passport.session());

// Register API routes
// Use type assertion to tell TypeScript that express exists on server
(server as any).express.use('/api', apiRouter);

// Register auth routes
(server as any).express.use('/auth', require('./routes/auth').authRouter);

// Serve static files from the client build directory
(server as any).express.use(express.static(path.join(__dirname, 'client/build')));

// For any other routes, serve the React app
(server as any).express.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start the server
server.connect().then(() => {
    console.log(`Dashboard server started on port ${config.dashboard.port || 3000}`);
    console.log(`Dashboard available at ${config.dashboard.domain}`);
}).catch(error => {
    console.error('Failed to start dashboard server:', error);
});