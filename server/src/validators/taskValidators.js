import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  order: Joi.number().integer().min(0).default(0),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(80),
  order: Joi.number().integer().min(0),
  archived: Joi.boolean(),
}).min(1);

export const createTaskSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().allow('').max(1000).default(''),
  categoryId: Joi.string().hex().length(24).allow(null),
  icon: Joi.string().trim().max(8).default('✦'),
  points: Joi.number().integer().min(1).max(1000).default(10),
  dailyLimit: Joi.number().integer().min(1).max(50).default(1),
  scheduleDays: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).default([0, 1, 2, 3, 4, 5, 6]),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
  notes: Joi.string().trim().allow('').max(2000).default(''),
  order: Joi.number().integer().min(0).default(0),
});

export const updateTaskSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  description: Joi.string().trim().allow('').max(1000),
  categoryId: Joi.string().hex().length(24).allow(null),
  icon: Joi.string().trim().max(8),
  points: Joi.number().integer().min(1).max(1000),
  dailyLimit: Joi.number().integer().min(1).max(50),
  scheduleDays: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
  notes: Joi.string().trim().allow('').max(2000),
  order: Joi.number().integer().min(0),
  active: Joi.boolean(),
  archived: Joi.boolean(),
}).min(1);

export const completeTaskSchema = Joi.object({
  dateKey: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  occurrence: Joi.number().integer().min(1).optional(),
});
