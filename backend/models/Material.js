const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
      maxlength: [200, 'Material name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'Cement & Concrete',
        'Sand & Aggregates',
        'Bricks & Blocks',
        'Steel & Iron',
        'Tiles & Flooring',
        'Paint & Coatings',
        'Pipes & Fittings',
        'Electrical',
        'Wood & Timber',
        'Plumbing',
        'Hardware',
        'Other',
      ],
    },
    unit: {
      type: String,
      required: [true, 'Unit type is required'],
      enum: ['kg', 'bags', 'tonnes', 'pieces', 'meters', 'liters', 'cubic_meters', 'sq_ft', 'bundles'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    minStockLevel: {
      type: Number,
      required: [true, 'Minimum stock level is required'],
      min: [0, 'Minimum stock level cannot be negative'],
      default: 10,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    location: {
      type: String,
      trim: true,
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

// Virtual: check if stock is low
materialSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minStockLevel;
});

// Ensure virtuals appear in JSON
materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

// Index for search performance
materialSchema.index({ name: 'text', category: 'text' });
materialSchema.index({ category: 1 });

module.exports = mongoose.model('Material', materialSchema);
