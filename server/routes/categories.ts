import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UrlModel } from '../models/index.js';
import { CategoryModel, CATEGORY_ICONS } from '../models/category.js';
import mongoose from 'mongoose';

export default async function categoryRoutes(fastify: FastifyInstance) {
    const f = fastify.withTypeProvider<ZodTypeProvider>();

    // GET all categories
    f.get('/api/categories', {
        schema: {
            description: 'Retrieve all URL categories, used for organizing and filtering monitored sites',
            summary: 'List categories',
            tags: ['categories'],
            response: {
                200: z.array(z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()).describe('Unique identifier for the category'),
                    name: z.string().describe('Display name of the category'),
                    description: z.string().optional().describe('Optional descriptive text'),
                    icon: z.string().describe('Lucide icon name (e.g., "Globe", "Briefcase")'),
                    color: z.string().describe('Hex color or Tailwind color class for UI badges'),
                    order: z.number().describe('Sort order in the dashboard UI')
                }))
            }
        }
    }, async (_req, _reply) => {
        const categories = await CategoryModel.find().sort({ order: 1, name: 1 });
        return categories;
    });

    // POST create category
    f.post('/api/categories', {
        schema: {
            description: 'Create a new category for site organization',
            summary: 'Create category',
            tags: ['categories'],
            body: z.object({
                name: z.string().min(1).describe('Name of the new category'),
                description: z.string().optional().describe('Brief description'),
                icon: z.enum(CATEGORY_ICONS as any).optional().default('Tag').describe('Lucide icon name'),
                color: z.string().optional().default('#3b82f6').describe('Display color (Hex)'),
                order: z.number().optional().default(0).describe('Numeric sort order')
            }),
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    name: z.string(),
                    description: z.string().optional(),
                    icon: z.string(),
                    color: z.string(),
                    order: z.number()
                })
            }
        }
    }, async (req, _reply) => {
        const category = new CategoryModel(req.body);
        await category.save();
        return category;
    });

    // PUT update category
    f.put('/api/categories/:id', {
        schema: {
            description: 'Update properties of an existing category',
            summary: 'Update category',
            tags: ['categories'],
            params: z.object({ 
                id: z.string().describe('The category ID to update') 
            }),
            body: z.object({
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                icon: z.enum(CATEGORY_ICONS as any).optional(),
                color: z.string().optional(),
                order: z.number().optional()
            }),
            response: {
                200: z.object({
                    _id: z.preprocess((val: any) => val?.toString(), z.string()),
                    name: z.string(),
                    description: z.string().optional(),
                    icon: z.string(),
                    color: z.string(),
                    order: z.number()
                }),
                404: z.object({
                    error: z.string()
                }).describe('Category not found')
            }
        }
    }, async (req, reply) => {
        const category = await CategoryModel.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!category) return reply.status(404).send({ error: 'Category not found' });
        return category;
    });

    // DELETE category (unassigns URLs, does not delete them)
    f.delete('/api/categories/:id', {
        schema: {
            description: 'Permanently remove a category. All URLs assigned to this category will be unassigned but NOT deleted.',
            summary: 'Delete category',
            tags: ['categories'],
            params: z.object({ 
                id: z.string().describe('The category ID to remove') 
            }),
            response: {
                200: z.object({
                    success: z.boolean().describe('Whether the deletion was successful')
                }),
                404: z.object({
                    error: z.string()
                }).describe('Category not found')
            }
        }
    }, async (req, reply) => {
        const category = await CategoryModel.findByIdAndDelete(req.params.id);
        if (!category) return reply.status(404).send({ error: 'Category not found' });
        // Unassign URLs from this category
        await UrlModel.updateMany(
            { categoryId: new mongoose.Types.ObjectId(req.params.id) },
            { $set: { categoryId: null } }
        );
        return { success: true };
    });
}
