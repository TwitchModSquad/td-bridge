const express = require("express");
const router = express.Router();

const authorize = require("./authorize");
router.use("/authorize", authorize);

module.exports = router;
