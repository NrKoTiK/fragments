// src/routes/index.js

const express = require('express');
const { hostname } = require('os');

const { version, author, repository } = require('../../package.json');

const router = express.Router();
const { authenticate } = require('../auth');

router.use(`/v1`, authenticate(), require('./api'));

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '') || 'https://github.com/NrKoTiK/fragments',
    version,
    hostname: hostname(),
  });
});

module.exports = router;
