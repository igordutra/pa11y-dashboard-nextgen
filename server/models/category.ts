import mongoose, { Document, Schema } from 'mongoose';

// 20 Lucide icon options for categories
export const CATEGORY_ICONS = [
    'folder', 'globe', 'building', 'shopping-cart', 'heart',
    'star', 'bookmark', 'flag', 'shield', 'zap',
    'briefcase', 'code', 'database', 'layout', 'monitor',
    'phone', 'users', 'truck', 'graduation-cap', 'newspaper'
] as const;

export type CategoryIcon = typeof CATEGORY_ICONS[number];

export interface ICategory extends Document {
    name: string;
    description?: string;
    icon: CategoryIcon;
    color: string;
    order: number;
}

const CategorySchema = new Schema<ICategory>({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon: {
        type: String,
        enum: CATEGORY_ICONS,
        default: 'folder'
    },
    color: { type: String, default: '#6366f1' }, // indigo
    order: { type: Number, default: 0 }
}, { timestamps: true });

export const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema);
