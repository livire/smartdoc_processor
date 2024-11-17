const express = require("express");
const router = express.Router();
const controller = require("./controller/upload");


// upload route
router.post('/upload', controller.uploadFiles);

module.exports = router;