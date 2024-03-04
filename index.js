const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");
const User = require("./models/User");
require("dotenv").config();
const cron = require("node-cron");
const userRouter = require("./routes/user");
const taskRouter = require("./routes/task");
const subtaskRouter = require("./routes/subtask");
const getDaysDifference = require("./utils/getDaysDifference");
const app = express();

const accountSid = "AC102fdecda7036a36ef7fff9428f1d3b6";
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

cron.schedule("* * * * *", async () => {
  const users = await User.find({}).sort({ priority: 1 });
  users.forEach(async (user) => {
    const date = new Date();
    const tasks = await Task.find({ deletedAt: null });
    let call = false;
    tasks.forEach(async (task) => {
      const days = getDaysDifference(date, new Date(task.dueDate));
      if (days === 0) {
        if(task.isCalled === false && call === false && task.status !== "done") {
            client.calls.create({
                url: "http://demo.twilio.com/docs/voice.xml",
                to: user.phone,
                from: "+17697597253",
            })
            .then(call => console.log(call.sid));
            await Task.findOneAndUpdate({ _id: task._id }, { priority: 0, isCalled: true });
            call = true;
        }
        else await Task.findOneAndUpdate({ _id: task._id }, { priority: 0 });
      } else if (days < 3) {
        await Task.findOneAndUpdate({ _id: task._id }, { priority: 1 });
      } else if (days < 5) {
        await Task.findOneAndUpdate({ _id: task._id }, { priority: 2 });
      } else {
        await Task.findOneAndUpdate({ _id: task._id }, { priority: 3 });
      }
    });
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

app.use(express.json());

app.use("/user", userRouter);

app.use("/task", taskRouter);

app.use("/subtask", subtaskRouter);


app.all("*", (req, res) => {
  res.status(404).send("Page not found");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
