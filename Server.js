backend\server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorMiddleware =
    require('./middlewares/error.middleware');

const app = express();

/* ==============================
   Middlewares
============================== */

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==============================
   ROOT PATHS
============================== */

const backendPath = __dirname;
const frontendPath = path.join(__dirname, '../frontend');
const uploadsPath = path.resolve(__dirname, 'uploads');

/* ==============================
   STATIC FILES
============================== */

// uploads
app.use('/uploads', express.static(uploadsPath));

// frontend
app.use(express.static(frontendPath));

/* ==============================
   API ROUTES (MAIN)
============================== */

const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

/* ==============================
   PAGES
============================== */

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/product.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'product.html'));
});

/* ==============================
   DEBUG
============================== */

console.log('UPLOADS PATH =>', uploadsPath);
console.log('EXISTS =>', fs.existsSync(uploadsPath));

/* ==============================
   HEALTH CHECK
============================== */

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working ✅' });
});

/*
==============================
   GLOBAL ERROR HANDLER
==============================
*/

app.use(
    errorMiddleware
);

/* ==============================
   START SERVER
============================== */

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
