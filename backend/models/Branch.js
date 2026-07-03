const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    managerName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'deactive'],
      default: 'active',
    },
    isCentralWarehouse: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for id to keep it consistent
branchSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

branchSchema.set('toJSON', { virtuals: true });
branchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Branch', branchSchema);
