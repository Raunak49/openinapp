const express = require("express");
const auth = require("../middleware/auth");
const SubTask = require("../models/SubTask");
const Task = require("../models/Task");
const getDaysDifference = require("../utils/getDaysDifference");
const router = express.Router();

router.post("/", auth, async (req, res) => {
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

router.get("/", auth, async (req, res) => {
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

router.put("/:id", auth, async (req, res) => {
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

router.delete("/:id", auth, async (req, res) => {
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

module.exports = router;