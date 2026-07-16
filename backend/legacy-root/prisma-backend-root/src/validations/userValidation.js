const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),

  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .trim()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),

  password: Joi.string()
    .required()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  // Add confirmPassword to validation but strip it before processing
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Passwords do not match'
    }),

  phone: Joi.string()
    .pattern(/^\+?[\d\s-]{10,}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  alternatePhone: Joi.string()
    .pattern(/^\+?[\d\s-]{10,}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  gst: Joi.string()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid GST number'
    }),

  role: Joi.string()
    .valid('user', 'business')
    .default('user'),

  address: Joi.object({
    street: Joi.string().allow(''),
    locality: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid 6-digit pincode'
      })
  }),

  // Allow but ignore verification object from frontend
  verification: Joi.object().unknown(true).optional()

}).unknown(false); // This will strip any unknown fields

const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .trim()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    }),

  rememberMe: Joi.boolean()
});

const passwordResetSchema = Joi.object({
  password: Joi.string()
    .required()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Passwords do not match'
    })
});

const profileUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),

  phone: Joi.string()
    .pattern(/^\+?[\d\s-]{10,}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .messages({
        'string.pattern.base': 'Please provide a valid 6-digit pincode'
      })
  })
}).min(1);

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .trim()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    })
});

// ✅ ADD THIS VALIDATE FUNCTION
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,    // Show all errors, not just the first one
        stripUnknown: true    // Remove fields not defined in schema
      });

      if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: errorMessage });
      }

      // Replace req.body with validated and cleaned data
      req.body = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({ error: 'Validation error occurred' });
    }
  };
};

// ✅ UPDATE MODULE.EXPORTS TO INCLUDE VALIDATE
module.exports = {
  registerSchema,
  loginSchema,
  passwordResetSchema,
  profileUpdateSchema,
  forgotPasswordSchema,
  validate // ← Add this line
};