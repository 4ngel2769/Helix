import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import helmet from 'helmet';
import cors from 'cors';
import config from '../config';
import { container } from '@sapphire/framework';
import type { DiscordUser } from './types';

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "https://cdn.discordapp.com", "data:"],
            connectSrc: ["'self'", "https://discord.com"],
        },
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? config.dashboard.domain 
        : 'http://localhost:3000',
    credentials: true
}));

// Session middleware
app.use(session({
    secret: config.dashboard.session.secret,
    name: config.dashboard.session.name,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.dashboard.mongoUri
    }),
    cookie: config.dashboard.session.cookie
}));

// Passport configuration
passport.use(new DiscordStrategy({
    clientID: config.dashboard.oauth.clientId,
    clientSecret: config.dashboard.oauth.clientSecret,
    callbackURL: `${config.dashboard.domain}${config.dashboard.redirectUri}`,
    scope: config.dashboard.oauth.scopes
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // You can store additional user data in your database here
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

app.use(passport.initialize());
app.use(passport.session());

// Make the Discord client available to routes
app.set('client', container.client);

export function startDashboard() {
    const port = config.dashboard.port;
    app.listen(port, () => {
        container.logger.info(`Dashboard running on port ${port}`);
    });
    return app;
} 