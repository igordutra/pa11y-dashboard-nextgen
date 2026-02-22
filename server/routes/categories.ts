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
            description: 'Get all categories',
            tags: ['categories'],
            response: {
                200: z.array(z.object({
                    _id: z.any(),
                    name: z.string(),
                    description: z.string().optional(),
                    icon: z.string(),
                    color: z.string(),
                    order: z.number()
                }))
            }
        }
    }, async (req, reply) => {
        const categories = await CategoryModel.find().sort({ order: 1, name: 1 });
        return categories;
    });

    // POST create category
    f.post('/api/categories', {
        schema: {
            description: 'Create a new category',
            tags: ['categories'],
            body: z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                icon: z.enum(CATEGORY_ICONS as any).optional(),
                color: z.string().optional(),
                order: z.number().optional()
            })
        }
    }, async (req, reply) => {
        const category = new CategoryModel(req.body);
        await category.save();
        return category;
    });

    // PUT update category
    f.put('/api/categories/:id', {
        schema: {
            description: 'Update a category',
            tags: ['categories'],
            params: z.object({ id: z.string() }),
            body: z.object({
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                icon: z.enum(CATEGORY_ICONS as any).optional(),
                color: z.string().optional(),
                order: z.number().optional()
            })
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
            description: 'Delete a category and unassign its URLs',
            tags: ['categories'],
            params: z.object({ id: z.string() })
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
