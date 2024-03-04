const express = require("express");
const auth = require("../middleware/auth");
const SubTask = require("../models/SubTask");
const Task = require("../models/Task");
const getDaysDifference  = require("../utils/getDaysDifference");
const router = express.Router();

router.post("/", auth, async (req, res) => {
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

router.get("/", auth, async (req, res) => {
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

router.put("/:id", auth, async (req, res) => {
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

router.delete("/:id", auth, async (req, res) => {
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

module.exports = router;
