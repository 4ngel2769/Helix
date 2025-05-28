const passport = require('passport');
const { Strategy } = require('passport-discord');
const config = require('../../../dist/config');

// Configure Discord strategy
passport.use(new Strategy({
    clientID: config.dashboard.oauth.clientId,
    clientSecret: config.dashboard.oauth.clientSecret,
    callbackURL: config.dashboard.redirectUri,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Store tokens with the user data
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    return done(null, profile);
}));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

module.exports = passport;