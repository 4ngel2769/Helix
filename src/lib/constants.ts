import { join } from 'path';

export const rootDir = join(__dirname, '..', '..');
export const srcDir = join(rootDir, 'src');

// Will change these soon™️...
export const RandomLoadingMessage = ['Computing...', 'Thinking...', 'Cooking some food', 'Give me a moment', 'Loading...', 'Computing...'];

export const Constants = {
    COLORS: {
        ERROR: '#db2b1f',
        WARNING: '#ffd817',
        SUCCESS: '#49e358',
        // ... other colors
    },
    COOLDOWNS: {
        DEFAULT: 5000,
        EXTENDED: 10000
    },
    EMOJIS: {
        HYPESQUAD_HOUSE3: '<:housebalance:888537001152876555>',
    }
    // ... other constants
};
