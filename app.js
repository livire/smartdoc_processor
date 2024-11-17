// app.js
const express = require("express");
const session = require('express-session');
const routes = require("./route");
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const app = express();

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use application routes
app.use(routes);
// console.log(routes);

module.exports = app;
