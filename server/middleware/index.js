const cors = require('cors');
const helmet = require('helmet');
const express = require('express');

const setupMiddleware = (app) => {
  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // Security headers
  app.use(helmet());

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

module.exports = setupMiddleware;

