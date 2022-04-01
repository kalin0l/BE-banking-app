const express = require("express");
const bodyParser = require("body-parser");
const HttpError = require("./models/httpError");
const mongoose = require("mongoose");

const userRoutes = require("./routes/userRoutes");
const movRoutes = require('./routes/movementRoutes')
const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH')
  next();
});
app.use('/api/users/',movRoutes );
app.use("/api/users/", userRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this path", 404);
  return next(error);
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({
    message: error.message || "Unknown error occured!",
  });
});
mongoose
  .connect(
    "mongodb+srv://kalio:Translate1234567@cluster0.6i76j.mongodb.net/users?retryWrites=true&w=majority"
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => console.log(err));
