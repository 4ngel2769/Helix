import express from 'express';
import passport from 'passport';

export const router = express.Router();

router.get('/login', passport.authenticate('discord'));

router.get('/callback', 
  passport.authenticate('discord', {
    failureRedirect: '/'
  }),
  (_req, res) => res.redirect('/dashboard')
);

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
}); 