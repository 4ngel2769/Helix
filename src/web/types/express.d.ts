import type { Profile } from 'passport-discord';

declare global {
  namespace Express {
    interface User extends Profile {
      accessToken: string;
    }
  }
}

export {}; 