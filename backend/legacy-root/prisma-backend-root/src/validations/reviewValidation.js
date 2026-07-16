const Joi = require('joi');

const reviewValidation = {
  createReview: Joi.object({
    productId: Joi.string()
      .required()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.empty': 'Product ID is required',
        'string.pattern.base': 'Invalid product ID format'
      }),

    rating: Joi.number()
      .required()
      .integer()
      .min(1)
      .max(5)
      .messages({
        'number.base': 'Rating must be a number',
        'number.empty': 'Rating is required',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must be at most 5',
        'number.integer': 'Rating must be a whole number'
      }),

    title: Joi.string()
      .max(100)
      .trim()
      .allow('')
      .messages({
        'string.max': 'Title cannot exceed 100 characters'
      }),

    comment: Joi.string()
      .required()
      .min(10)
      .max(1000)
      .trim()
      .messages({
        'string.empty': 'Comment is required',
        'string.min': 'Comment must be at least 10 characters long',
        'string.max': 'Comment cannot exceed 1000 characters'
      }),

    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          publicId: Joi.string().allow('')
        })
      )
      .max(5)
      .messages({
        'array.max': 'Maximum 5 images allowed'
      })
  }),

  markHelpful: Joi.object({
    isHelpful: Joi.boolean()
      .required()
      .messages({
        'boolean.base': 'isHelpful must be true or false',
        'any.required': 'isHelpful field is required'
      })
  }),

  addReply: Joi.object({
    text: Joi.string()
      .required()
      .min(5)
      .max(500)
      .trim()
      .messages({
        'string.empty': 'Reply text is required',
        'string.min': 'Reply must be at least 5 characters long',
        'string.max': 'Reply cannot exceed 500 characters'
      })
  }),

  rejectReview: Joi.object({
    moderationNotes: Joi.string()
      .max(200)
      .trim()
      .allow('')
      .messages({
        'string.max': 'Moderation notes cannot exceed 200 characters'
      })
  }),

  queryParams: {
    getReviews: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('newest'),
      filterRating: Joi.string().valid('all', '1', '2', '3', '4', '5').default('all'),
      status: Joi.string().valid('all', 'pending', 'approved', 'rejected').default('approved'),
      search: Joi.string().max(100).allow('')
    })
  }
};

module.exports = { reviewValidation };