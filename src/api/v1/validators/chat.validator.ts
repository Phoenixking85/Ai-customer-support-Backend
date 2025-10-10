import Joi from 'joi';

export const chatSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  context_limit: Joi.number().integer().min(100).max(3000).optional(),
});