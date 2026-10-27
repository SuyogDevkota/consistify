import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80),
  avatarColor: Joi.string().trim().max(32),
}).min(1);

export const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
  confirm: Joi.string().valid('DELETE').required(),
});
