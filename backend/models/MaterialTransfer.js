const mongoose = require('mongoose');

const materialTransferSchema = new mongoose.Schema(
  {
    transferId: {
      type: String,
      unique: true,
    },
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    items: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
          required: true,
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        unit: {
          type: String,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'transferred', 'rejected'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Auto‑generate a human‑readable transfer ID before saving
materialTransferSchema.pre('save', async function () {
  if (!this.transferId) {
    const last = await mongoose.model('MaterialTransfer')
      .findOne({}, { transferId: 1 })
      .sort({ transferId: -1 })
      .lean();

    let nextNum = 1;
    if (last?.transferId) {
      const match = last.transferId.match(/TRF-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    this.transferId = `TRF-${String(nextNum).padStart(6, '0')}`;
  }
});

materialTransferSchema.index({ status: 1 });
materialTransferSchema.index({ fromBranch: 1 });
materialTransferSchema.index({ toBranch: 1 });
materialTransferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MaterialTransfer', materialTransferSchema);
