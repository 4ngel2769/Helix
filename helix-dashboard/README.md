### Step 1: Set Up the Project Structure

Create a new directory for your dashboard:

```
/dashboard
    ├── index.html
    ├── styles.css
    ├── script.js
    └── server.js
```

### Step 2: Install Required Packages

You will need to install some packages to handle the server-side logic and OAuth2 authentication. Assuming you are using Express, you can install the necessary packages:

```bash
npm install express express-session passport passport-discord mongoose dotenv
```

### Step 3: Create the Server Logic

In `server.js`, set up the Express server and configure Discord OAuth2:

```javascript
// dashboard/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(express.static('public'));
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Routes
app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    res.sendFile(__dirname + '/index.html');
});

// Fetch user's guilds
app.get('/api/guilds', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }
    res.json(req.user.guilds);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```

### Step 4: Create the Frontend

In `index.html`, create a simple UI to display the user's servers:

```html
<!-- dashboard/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
    <title>Dashboard</title>
</head>
<body>
    <h1>Your Servers</h1>
    <div id="guilds-container" class="grid"></div>
    <script src="script.js"></script>
</body>
</html>
```

In `styles.css`, add some basic styles:

```css
/* dashboard/styles.css */
body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 20px;
}

h1 {
    text-align: center;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
}

.guild {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 10px;
    text-align: center;
}

.guild img {
    width: 100%;
    border-radius: 5px;
}

.disabled {
    opacity: 0.5;
}
```

In `script.js`, fetch the user's guilds and display them:

```javascript
// dashboard/script.js
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/guilds');
    const guilds = await response.json();
    const container = document.getElementById('guilds-container');

    guilds.forEach(guild => {
        const guildDiv = document.createElement('div');
        guildDiv.className = 'guild';
        guildDiv.innerHTML = `
            <img src="${guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 'https://via.placeholder.com/150'}" alt="${guild.name}">
            <h3>${guild.name}</h3>
            ${guild.permissions ? 
                `<button onclick="manageRoles('${guild.id}')">Manage</button>` : 
                `<button class="disabled" disabled>Add Bot</button>`}
        `;
        container.appendChild(guildDiv);
    });
});

function manageRoles(guildId) {
    // Redirect to the reaction roles management page
    window.location.href = `/manage/${guildId}`;
}
```

### Step 5: Environment Variables

Create a `.env` file in the root of your project to store your environment variables:

```
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/callback
MONGODB_URI=your_mongodb_uri
```

### Step 6: Run the Server

Start your server:

```bash
node dashboard/server.js
```

### Step 7: Access the Dashboard

Navigate to `http://localhost:3000/dashboard` in your browser. You should see a login button that redirects you to Discord for authentication. After logging in, you will see your servers displayed in a grid format.

### Step 8: Manage Reaction Roles

You can create a separate route for managing reaction roles, which can be accessed by clicking the "Manage" button for each server. This would involve creating another HTML page and corresponding logic to handle the reaction roles management.

### Conclusion

This is a basic implementation of a Discord bot dashboard. You can expand upon this by adding more features, improving the UI, and integrating additional functionalities as needed.