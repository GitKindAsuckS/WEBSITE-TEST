const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic auth (for private prototype)
app.use(basicAuth({
    users: { 'user': 'password' }, // change user/password as you like
    challenge: true
}));

// Serve all static files from 'dist' (your Vite build folder)
app.use(express.static(path.join(__dirname, 'dist')));

// Route for index.html (default)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Route for game.html
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'game.html'));
});

// Optional: Generic route to serve any other HTML file in dist
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'dist', `${page}.html`);
  res.sendFile(filePath, err => {
    if (err) next(); // if file doesn't exist, move to next middleware
  });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
