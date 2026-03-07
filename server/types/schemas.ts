import { z } from 'zod';

/**
 * Shared settings schema used for both global settings and per-URL overrides.
 */
export const settingsSchema = z.object({
  runners: z.array(z.enum(['axe', 'htmlcs'])).optional(),
  includeNotices: z.boolean().optional(),
  includeWarnings: z.boolean().optional(),
  timeout: z.number().optional(),
  wait: z.number().optional(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    isMobile: z.boolean().optional()
  }).optional(),
  hideElements: z.string().optional(),
  rootElement: z.string().optional(),
  userAgent: z.string().optional(),
  ignore: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional()
});

/**
 * Per-URL overrides schema.
 */
export const overridesSchema = settingsSchema.optional();
