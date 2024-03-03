const mongoose = require('mongoose');

const Task = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    dueDate: {
        type: Date,
        required: true
    },
    priority: {
        type: Number,
        enum: [0, 1, 2, 3],
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'done'],
        default: 'todo'
    },
    deletedAt: {
        type: Date,
        default: null
    },
    isCalled: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});


module.exports = mongoose.model('Task', Task);
