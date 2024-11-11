import { Router } from 'express';
import passport from 'passport';
import config from '../../config';

const router = Router();

router.get('/login', passport.authenticate('discord', {
    scope: config.dashboard.oauth.scopes,
    prompt: config.dashboard.oauth.prompt
}));

router.get('/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/',
        successRedirect: '/dashboard'
    })
);

router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

export const authRouter = router; 