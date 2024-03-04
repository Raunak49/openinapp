const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

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

module.exports = auth;