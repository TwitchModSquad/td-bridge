const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();
const config = require("../config.json");
const api = require("../api/");

app.use(cookieParser());
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '/views'));
app.use(express.static("web/static"));

const controllers = require("./controllers/");
app.use("/", controllers)

app.listen(config.backend.port, () => {
  api.Logger.info(`Web app listening on port ${config.backend.port}`);
});
