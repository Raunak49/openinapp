const mongoose = require('mongoose');

const User = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    priority: {
        type: Number
    }
});

module.exports = mongoose.model('User', User);