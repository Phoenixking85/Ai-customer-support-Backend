import Joi from 'joi';

export const paymentInitSchema = Joi.object({
  plan: Joi.string().valid('premium').required(),
  callback_url: Joi.string().uri().optional(),
});

export const webhookSchema = Joi.object({
  event: Joi.string().required(),
  data: Joi.object().required(),
});