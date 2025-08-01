const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const app = express();

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'computer_qr_db'
});

// Connect to MySQL
db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
const computerRoutes = require('./routes/computer')(db);
app.use('/', computerRoutes);

// Error handling
app.use((req, res) => res.status(404).send('Page not found'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server error');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});