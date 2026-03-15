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
    console.log('This script will help you set up local Admin credentials and configure OAuth providers.\n');

    const adminDetails = await prompts([
        {
            type: 'text',
            name: 'email',
            message: 'Enter Admin Email:',
            initial: 'admin@example.local'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter Admin Password:'
        }
    ]);

    if (!adminDetails.email || !adminDetails.password) {
        console.log('Aborted.');
        process.exit(1);
    }

    const providerSelection = await prompts([
        {
            type: 'multiselect',
            name: 'providers',
            message: 'Select OAuth providers to configure:',
            choices: [
                { title: 'GitHub', value: 'github' },
                { title: 'Google', value: 'google' },
                { title: 'Auth0', value: 'auth0' },
                { title: 'Keycloak', value: 'keycloak' }
            ],
            instructions: false
        }
    ]);

    const oauthConfig: Record<string, any> = {};

    for (const provider of providerSelection.providers) {
        console.log(`\n--- Configuring ${provider.toUpperCase()} ---`);
        if (provider === 'github') {
            console.log('Create an OAuth App: https://github.com/settings/developers');
            console.log('Callback URL: http://localhost:8080/api/auth/github/callback');
        } else if (provider === 'google') {
            console.log('Create credentials: https://console.cloud.google.com/apis/credentials');
            console.log('Callback URL: http://localhost:8080/api/auth/google/callback');
        }

        const details = await prompts([
            {
                type: 'text',
                name: 'clientId',
                message: `${provider} Client ID:`
            },
            {
                type: 'text',
                name: 'clientSecret',
                message: `${provider} Client Secret:`
            }
        ]);

        if (details.clientId && details.clientSecret) {
            oauthConfig[provider] = details;
        }
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('\nConnected to MongoDB.');

        const existingAdmin = await UserModel.findOne({ email: adminDetails.email });
        if (existingAdmin) {
            console.log('User already exists! Updating password and role to admin...');
            existingAdmin.passwordHash = await bcrypt.hash(adminDetails.password, 10);
            existingAdmin.role = 'admin';
            existingAdmin.provider = 'local';
            await existingAdmin.save();
        } else {
            console.log('Creating new Admin user...');
            const passwordHash = await bcrypt.hash(adminDetails.password, 10);
            const adminUser = new UserModel({
                email: adminDetails.email,
                passwordHash,
                role: 'admin',
                provider: 'local'
            });
            await adminUser.save();
        }
        
        console.log('Admin user successfully configured!');

        const jwtSecret = crypto.randomBytes(32).toString('hex');
        
        console.log('\n' + '='.repeat(60));
        console.log('IMPORTANT: Add the following to your .env file:');
        console.log('='.repeat(60));
        console.log(`AUTH_ENABLED=true`);
        console.log(`JWT_SECRET=${jwtSecret}`);
        
        if (oauthConfig.github) {
            console.log(`GITHUB_CLIENT_ID=${oauthConfig.github.clientId}`);
            console.log(`GITHUB_CLIENT_SECRET=${oauthConfig.github.clientSecret}`);
        }
        
        if (oauthConfig.google) {
            console.log(`GOOGLE_CLIENT_ID=${oauthConfig.google.clientId}`);
            console.log(`GOOGLE_CLIENT_SECRET=${oauthConfig.google.clientSecret}`);
        }

        if (oauthConfig.auth0) {
            console.log(`AUTH0_CLIENT_ID=${oauthConfig.auth0.clientId}`);
            console.log(`AUTH0_CLIENT_SECRET=${oauthConfig.auth0.clientSecret}`);
            console.log(`# AUTH0_DOMAIN=your-tenant.auth0.com`);
        }

        if (oauthConfig.keycloak) {
            console.log(`KEYCLOAK_CLIENT_ID=${oauthConfig.keycloak.clientId}`);
            console.log(`KEYCLOAK_CLIENT_SECRET=${oauthConfig.keycloak.clientSecret}`);
            console.log(`# KEYCLOAK_BASE_URL=https://your-keycloak-server/auth`);
        }

        console.log('='.repeat(60));
        console.log('For more advanced configuration, visit: https://github.com/fastify/fastify-oauth2');
        console.log('='.repeat(60) + '\n');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

main();