// src/routes/api/index.js

const express = require('express');

const router = express.Router();

router.get('/fragments', require('./get'));

module.exports = router;
