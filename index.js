const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");
const User = require("./models/User");
const SubTask = require("./models/SubTask");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cron = require("node-cron");
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
        if(task.isCalled === false && call === false) {
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

function getDaysDifference(date1, date2) {
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();
  var difference_ms = date2_ms - date1_ms;
  var difference_days = Math.floor(difference_ms / (1000 * 60 * 60 * 24));

  return difference_days;
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

app.use(express.json());

app.post("/user/signup", async (req, res) => {
  try {
    const phone = req.body.phone;
    const priority = req.body.priority;
    if (!phone || !priority) {
      return res.status(400).send("Phone and priority are required");
    }
    if (!phone.match(/^\+?[0-9]{2}-?[0-9]{6,12}$/)) {
      return res.status(400).send("Phone number is invalid");
    }

    const existingUser = await User.findOne({ phone: phone });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const user = new User({
      phone: phone,
      priority: priority,
    });
    const newUser = await user.save();
    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/user/login", async (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) {
      return res.status(400).send("Phone is required");
    }
    if (phone.match(/^[0-9]{10}$/) === null) {
      return res.status(400).send("Phone number is invalid");
    }
    const user = await User.findOne({ phone: phone });
    if (!user) {
      return res.status(400).send("User not found");
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(400).send(error);
  }
});

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    if (!token) {
      return res.status(401).send("Please authenticate");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id });
    if (!user) {
      return res.status(401).send("Please authenticate");
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

app.post("/task", auth, async (req, res) => {
  try {
    const title = req.body.title;
    const description = req.body.description;
    const dueDate = req.body.dueDate;
    if (!title || !description || !dueDate) {
      return res
        .status(400)
        .send("Title, description and dueDate are required");
    }
    if (isNaN(new Date(dueDate))) {
      return res.status(400).send("Invalid dueDate");
    }
    const days = getDaysDifference(new Date(), new Date(dueDate));
    let priority = -1;
    if (days === 0) {
      priority = 0;
    } else if (days < 3) {
      priority = 1;
    } else if (days < 5) {
      priority = 2;
    } else {
      priority = 3;
    }
    const task = new Task({
      title: title,
      description: description,
      dueDate: dueDate,
      owner: req.user._id,
      status: "todo",
      priority,
    });
    const newTask = await task.save();
    res.json(newTask);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.get("/task", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort === "asc" ? 1 : -1;
    const tasks = await Task.find(
      { owner: req.user._id, deletedAt: null },
      null,
      {
        limit: 10,
        skip: (page - 1) * 10,
      }
    ).sort({ dueDate: sort });
    res.json(tasks);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.post("/subtask", auth, async (req, res) => {
  try {
    const taskId = req.body.taskId;
    if (!taskId) {
      return res.status(400).send("taskId is required");
    }
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
      deletedAt: null,
    });
    if (!task) {
      return res.status(400).send("Task not found");
    }

    const subTask = new SubTask({
      taskId: taskId,
      status: "todo",
    });

    const newSubTask = await subTask.save();
    res.json(newSubTask);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.get("/subtask", auth, async (req, res) => {
  try {
    const taskId = req.query.taskId;
    if (!taskId) {
      return res.status(400).send("taskId is required");
    }
    const subTasks = await SubTask.find({ taskId, deletedAt: null });
    res.json(subTasks);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.put("/task/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const options = {};
    if (req.body.status) {
      options.status = req.body.status === "done" ? "done" : "todo";
    }
    if (req.body.dueDate) {
      options.dueDate = req.body.dueDate;
    }
    if (!id) {
      return res.status(400).send("id is required");
    }
    const task = await Task.findOneAndUpdate(
      { _id: id, owner: req.user._id, deletedAt: null },
      options
    );
    if (!task) {
      return res.status(400).send("Task not found");
    }
    if (req.body.status) {
      await SubTask.updateMany({ taskId: id }, { status: options.status });
    }
    res.json(task);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.put("/subtask/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const options = {};
    if (req.body.status) {
      options.status = req.body.status === "done" ? "done" : "todo";
    }
    if (!id) {
      return res.status(400).send("id is required");
    }
    const subTask = await SubTask.findOneAndUpdate(
      { _id: id, deletedAt: null },
      options
    );
    if (!subTask) {
      return res.status(400).send("SubTask not found");
    }

    const AllSubTasks = await SubTask.find({
      taskId: subTask.taskId,
      deletedAt: null,
    });
    let doneCount = 0;
    AllSubTasks.forEach((subTask) => {
      if (subTask.status === "done") {
        doneCount++;
      }
    });
    if (doneCount === AllSubTasks.length) {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "done" }
      );
    } else if (doneCount === 0) {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "todo" }
      );
    } else {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "in-progress" }
      );
    }

    res.json(subTask);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.delete("/task/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).send("id is required");
    }
    const task = await Task.findOneAndUpdate(
      { _id: id, owner: req.user._id, deletedAt: null },
      { deletedAt: new Date() }
    );
    if (!task) {
      return res.status(400).send("Task not found");
    }

    await SubTask.updateMany({ taskId: id }, { deletedAt: new Date() });
    res.json(task);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.delete("/subtask/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).send("id is required");
    }
    const subTask = await SubTask.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() }
    );
    if (!subTask) {
      return res.status(400).send("SubTask not found");
    }
    const AllSubTasks = await SubTask.find({
      taskId: subTask.taskId,
      deletedAt: null,
    });
    let doneCount = 0;
    AllSubTasks.forEach((subTask) => {
      if (subTask.status === "done") {
        doneCount++;
      }
    });
    if (doneCount === AllSubTasks.length) {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "done" }
      );
    } else if (doneCount === 0) {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "todo" }
      );
    } else {
      await Task.findOneAndUpdate(
        { _id: subTask.taskId, deletedAt: null },
        { status: "in-progress" }
      );
    }

    res.json(subTask);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
