import mongoose, { Document, Schema } from 'mongoose';

export type Role = 'admin' | 'editor' | 'viewer';

export interface IUser extends Document {
    email: string;
    passwordHash?: string;
    role: Role;
    provider: 'local' | 'github' | 'keycloak' | 'auth0';
    providerId?: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
    provider: { type: String, enum: ['local', 'github', 'keycloak', 'auth0'], required: true },
    providerId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Index for OAuth providers
UserSchema.index({ provider: 1, providerId: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
