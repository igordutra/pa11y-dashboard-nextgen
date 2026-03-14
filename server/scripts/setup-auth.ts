import prompts from 'prompts';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../models/user.js';
import crypto from 'crypto';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pa11y-dashboard';

async function main() {
    console.log('--- Pa11y Dashboard NextGen: Auth Setup ---');
    console.log('This script will help you set up an Admin user and generate a JWT secret.\n');

    const responses = await prompts([
        {
            type: 'text',
            name: 'email',
            message: 'Enter Admin Email:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter Admin Password:'
        }
    ]);

    if (!responses.email || !responses.password) {
        console.log('Aborted.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('\nConnected to MongoDB.');

        const existingAdmin = await UserModel.findOne({ email: responses.email });
        if (existingAdmin) {
            console.log('User already exists! Updating password and role to admin...');
            existingAdmin.passwordHash = await bcrypt.hash(responses.password, 10);
            existingAdmin.role = 'admin';
            await existingAdmin.save();
        } else {
            console.log('Creating new Admin user...');
            const passwordHash = await bcrypt.hash(responses.password, 10);
            const adminUser = new UserModel({
                email: responses.email,
                passwordHash,
                role: 'admin',
                provider: 'local'
            });
            await adminUser.save();
        }
        
        console.log('Admin user successfully configured!');

        const jwtSecret = crypto.randomBytes(32).toString('hex');
        console.log('\n======================================================');
        console.log('IMPORTANT: Add the following to your .env file:');
        console.log(`JWT_SECRET=${jwtSecret}`);
        console.log('AUTH_ENABLED=true');
        console.log('======================================================\n');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

main();