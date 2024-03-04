const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const router = express.Router();

router.post("/signup", async (req, res) => {
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

router.post("/login", async (req, res) => {
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


module.exports = router;