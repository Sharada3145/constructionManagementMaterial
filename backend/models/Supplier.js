const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [200, 'Supplier name cannot exceed 200 characters'],
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    materialsSupplied: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 'text' });
supplierSchema.index({ branchId: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
