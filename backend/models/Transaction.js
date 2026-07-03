const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: ['issue', 'purchase', 'return', 'adjustment', 'transfer'],
      required: [true, 'Transaction type is required'],
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    materialRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialRequest',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    unitPrice: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    totalPrice: {
      type: Number,
      min: [0, 'Total price cannot be negative'],
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Auto‑generate transaction ID
transactionSchema.pre('save', async function () {
  if (!this.transactionId) {
    const count = await mongoose.model('Transaction').countDocuments();
    const prefix = this.type === 'issue' ? 'ISS' : this.type === 'purchase' ? 'PUR' : this.type === 'transfer' ? 'TRF' : 'TXN';
    this.transactionId = `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }
});

transactionSchema.index({ type: 1 });
transactionSchema.index({ material: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ branchId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
