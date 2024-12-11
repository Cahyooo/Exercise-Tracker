const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");

const Users = require("./model/users.model.js");
const Exercise = require("./model/exercise.model.js");

const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await Users.find({});
  const result = users.map((user) => ({
    _id: user._id,
    username: user.username,
  }));

  res.json(result);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const user = new Users({
    username: username,
  });
  await user.save();
  res.json(user);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const description = req.body.description;
  let duration = req.body.duration;

  if (!typeof duration === "number") {
    duration = 0;
  }

  let date = req.body.date;
  if (!date || date === "") {
    date = new Date();
  }

  const username = await Users.findOne({ _id: userId });

  if (!username) {
    return res.status(404).json({ error: "User not found" });
  }

  const exercise = new Exercise({
    username: username.username,
    description: description,
    duration: duration,
    date: date,
    user_id: userId,
  });

  await exercise.save();
  
  res.json({
    user_id: userId,
    username: username.username,
    description: description,
    duration: duration,
    date: new Date(date).toDateString,
  });
});


app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  try {
    const user = await Users.findOne({ _id: userId });
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit || 0;

    let filter = { user_id: userId };

    if (from) {
      filter.date = { $gte: new Date(from) };
    }
    if (to) {
      if (!filter.date) {
        filter.date = {};
      }
      filter.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(filter).limit(limit);

    const exercisesMapping = exercises.map((exercise, index) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      };
    });

    console.log(exercises);
    res.json({
      username: user.username,
      count: exercises.length,
      _id: userId,
      log: exercisesMapping,
    });
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
