import { Server } from '@sapphire/plugin-api';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import config from '../config';
import type { DiscordUser } from './types';

export function initializeDashboard(server: Server): void {
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
    server.express
        .use(sessionMiddleware)
        .use(passport.initialize())
        .use(passport.session());
} 