const mongoose = require('mongoose');

const SubTask = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    status: {
        type: String,
        enum: ['todo', 'done'],
        default: 'todo'
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true});

module.exports = mongoose.model('SubTask', SubTask);