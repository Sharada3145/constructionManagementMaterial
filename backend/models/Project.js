const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [300, 'Project name cannot exceed 300 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    location: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    expectedEndDate: {
      type: Date,
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },
    status: {
      type: String,
      enum: ['planning', 'in_progress', 'on_hold', 'completed'],
      default: 'planning',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    contractors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ name: 'text' });

module.exports = mongoose.model('Project', projectSchema);
