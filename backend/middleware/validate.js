import { z } from 'zod';

export const itemValidationSchema = z.object({
  category: z.enum(['Groceries', 'Vegetables', 'Fruits', 'Spices', 'Others'], {
    errorMap: (issue, ctx) => {
      if (issue.code === "invalid_enum_value") {
        return { message: "Category must be one of: Groceries, Vegetables, Fruits, Spices, Others" };
      }
      return { message: ctx.defaultError };
    }
  }),
  defaultUnit: z.enum(['kg', 'g', 'L', 'ml', 'pcs', 'pack'], {
    errorMap: (issue, ctx) => {
      if (issue.code === "invalid_enum_value") {
        return { message: "Unit must be one of: kg, g, L, ml, pcs, pack" };
      }
      return { message: ctx.defaultError };
    }
  }),
  translations: z.array(
    z.object({
      languageCode: z.string().min(2, "Language code must be at least 2 characters"),
      names: z.array(
        z.string().trim().min(1, "Name cannot be empty")
      ).min(1, "At least one name is required")
    })
  ).min(1, "At least one translation is required")
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        status: 'fail',
        errors: formattedErrors
      });
    }
    next(error);
  }
};
