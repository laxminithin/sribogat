const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    image: { type: String }, // URL or filename
    tags: [String],
    author: { type: String, default: 'Admin' },
    status: {
      type: String,
      enum: ['draft', 'publish'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
