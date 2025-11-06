// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const logger = require('./logger');
const pino = require('pino-http')({
  logger,
});

const passport = require('passport');

const authenticate = require('./auth');

logger.debug(process.env, 'Environment Variables');

const app = express();

// Use helmetjs security middleware first
app.use(helmet());

// Use gzip/deflate compression middleware
app.use(compression());

// Use pino logging middleware
app.use(pino);

// Use CORS
app.use(cors());

// Set up passport
passport.use(authenticate.strategy());
app.use(passport.initialize());

// Define our routes
app.use('/', require('./routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      message: 'not found',
      code: 404,
    },
  });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  if (status > 499) {
    logger.error({ err }, `Error processing request`);
  }

  res.status(status).json({
    status: 'error',
    error: {
      message,
      code: status,
    },
  });
});

module.exports = app;
