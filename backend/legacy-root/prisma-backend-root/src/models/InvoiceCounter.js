const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastInvoiceNumber: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
invoiceCounterSchema.index({ year: 1 });

// Static method to generate next invoice number
invoiceCounterSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  
  try {
    // Find or create counter for current year
    let counter = await this.findOne({ year: currentYear });
    
    if (!counter) {
      // Create new counter for the year
      counter = new this({
        year: currentYear,
        currentNumber: 1,
        lastInvoiceNumber: `${currentYear}00001`
      });
    } else {
      // Increment counter
      counter.currentNumber += 1;
      counter.lastInvoiceNumber = `${currentYear}${counter.currentNumber.toString().padStart(5, '0')}`;
      counter.updatedAt = new Date();
    }
    
    await counter.save();
    
    console.log(`✅ Generated invoice number: ${counter.lastInvoiceNumber}`);
    return counter.lastInvoiceNumber;
    
  } catch (error) {
    console.error('❌ Error generating invoice number:', error);
    
    // Fallback: generate with timestamp if database fails
    const timestamp = Date.now().toString().slice(-5);
    const fallbackNumber = `${currentYear}${timestamp}`;
    console.warn(`⚠️ Using fallback invoice number: ${fallbackNumber}`);
    return fallbackNumber;
  }
};

// Static method to get current counter info
invoiceCounterSchema.statics.getCurrentCounter = async function(year = null) {
  const targetYear = year || new Date().getFullYear();
  return await this.findOne({ year: targetYear });
};

// Static method to reset counter for a year (admin function)
invoiceCounterSchema.statics.resetCounter = async function(year, startFrom = 0) {
  const counter = await this.findOneAndUpdate(
    { year },
    { 
      currentNumber: startFrom,
      lastInvoiceNumber: `${year}${(startFrom + 1).toString().padStart(5, '0')}`,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
  
  console.log(`🔄 Reset counter for year ${year} to start from ${startFrom}`);
  return counter;
};

// Method to validate invoice number format
invoiceCounterSchema.statics.isValidInvoiceNumber = function(invoiceNumber) {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') return false;
  
  // Check if it matches YYYY00000 format (10 digits total)
  const regex = /^(\d{4})(\d{5})$/;
  const match = invoiceNumber.match(regex);
  
  if (!match) return false;
  
  const year = parseInt(match[1]);
  const number = parseInt(match[2]);
  
  // Basic validation
  const currentYear = new Date().getFullYear();
  return year >= 2020 && year <= currentYear + 1 && number >= 1 && number <= 99999;
};

// Pre-save middleware to update timestamps
invoiceCounterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

module.exports = InvoiceCounter;