const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./auth/discord');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const config = require('../../dist/config');

// Import API routes
const guildsRouter = require('./api/guilds');
const reactionRolesRouter = require('./api/reactionRoles');

// Create Express app
const app = express();
const PORT = config.dashboard.port || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:', 'cdn.discordapp.com', 'i.imgur.com'],
            fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
            connectSrc: ["'self'", 'discord.com']
        }
    }
}));
app.use(cors({
    origin: config.dashboard.domain,
    credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store
app.use(session({
    secret: config.dashboard.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 604800000, // 1 week
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    },
    store: MongoStore.create({
        mongoUrl: config.mongo.uri,
        collectionName: 'dashboard_sessions'
    })
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Discord auth routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: '/login'
    }),
    (req, res) => {
        res.redirect('/');
    }
);
app.get('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// API routes
app.use('/api/guilds', guildsRouter);
app.use('/api', reactionRolesRouter);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Store bot client for API access
const initServer = (botClient) => {
    app.set('botClient', botClient);
    
    app.listen(PORT, () => {
        console.log(`Dashboard listening on port ${PORT}`);
    });
};

module.exports = { initServer };