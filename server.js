const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic auth (za zasebnost prototipa)
app.use(basicAuth({
    users: { 'user': 'password' },
    challenge: true
}));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
