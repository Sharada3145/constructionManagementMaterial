const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Contractor is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    items: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
          required: true,
        },
        requestedQuantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        approvedQuantity: {
          type: Number,
          min: [0, 'Approved quantity cannot be negative'],
          default: 0,
        },
        unit: {
          type: String,
          required: true,
        },
        originalInput: {
          type: String, // store the raw text the contractor typed, e.g. "cemnt 20 bag"
          trim: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'partially_approved', 'rejected', 'issued'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto‑generate a human‑readable request ID before saving
materialRequestSchema.pre('save', async function () {
  if (!this.requestId) {
    // Find the highest existing requestId number to avoid collisions
    // when records have been deleted (countDocuments would give wrong result)
    const last = await mongoose.model('MaterialRequest')
      .findOne({}, { requestId: 1 })
      .sort({ requestId: -1 })
      .lean();

    let nextNum = 1;
    if (last?.requestId) {
      const match = last.requestId.match(/REQ-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    this.requestId = `REQ-${String(nextNum).padStart(6, '0')}`;
  }
});

materialRequestSchema.index({ status: 1 });
materialRequestSchema.index({ contractor: 1 });
materialRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
