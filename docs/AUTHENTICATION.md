# Authentication & Identity Management

Pa11y Dashboard NextGen features a robust, secure authentication layer with Role-Based Access Control (RBAC). It supports both local credentials and integration with major Identity Providers (IdPs) via OAuth2.

## Table of Contents
- [Core Architecture](#core-architecture)
- [Roles and Permissions](#roles-and-permissions)
- [Setup Wizard](#setup-wizard)
- [Local Authentication](#local-authentication)
- [User Management (Admin Only)](#user-management-admin-only)
- [OAuth2 Integration](#oauth2-integration)
- [Admin Bootstrapping](#admin-bootstrapping)

## Core Architecture

The system uses a **stateless JWT (JSON Web Token)** architecture:
- **Stateless**: The server does not store session data. All identity information is encoded in the token.
- **Security**: Local passwords are hashed using `bcryptjs`. JWTs are signed using a `JWT_SECRET` defined in the environment.
- **Interceptors**: The frontend automatically attaches the token to every API request using an Axios interceptor.
- **Iframe Support**: For the Visual Recorder, the token is passed via the `token` query parameter, as browsers do not send custom headers for iframe sources.

## Roles and Permissions

The system defines three distinct roles:

| Role | Permissions |
| :--- | :--- |
| **admin** | Full access. Can manage URLs, categories, settings, and other users. |
| **editor** | Can manage URLs and categories. Can trigger manual scans. Cannot change global settings or manage users. |
| **viewer** | Read-only access to dashboards, reports, and analytics. Cannot trigger scans or modify data. |

## Setup Wizard

The easiest way to configure authentication is via the built-in wizard:

```bash
cd server
npm run setup
```

This script will guide you through:
1. Enabling/Disabling authentication.
2. Configuring Demo Mode.
3. Creating your first Admin account.
4. Setting up OAuth2 providers (GitHub, Google, etc.).
5. Generating a secure `JWT_SECRET`.

## Local Authentication

- **Registration**: Administrators can manually create new user accounts from the **Settings > User Management** tab. Future iterations will support self-registration with email verification.
- **Login**: Users provide their email and password. The server validates the credentials and returns a JWT.
- **Profile**: Users can change their password from the "Profile" page.

## User Management (Admin Only)

Administrators have access to a dedicated management interface within the Settings page:
- **List Users**: View all registered accounts, their roles, and auth providers.
- **Invite/Create Users**: Create new accounts with an initial password.
- **Change Roles**: Promote or demote users between `admin`, `editor`, and `viewer`.
- **Delete Accounts**: Permanently remove user access.

Note: To prevent accidental lockout, admins cannot delete their own account or change their own role.

## OAuth2 Integration

The dashboard supports OpenID Connect and OAuth2 providers. Registration is automatic: if a user logs in via a provider and their email doesn't exist, a new account with the `viewer` role is created.

### Supported Providers

- **GitHub**: Requires a GitHub OAuth App.
- **Google**: Requires Google Cloud Console credentials.
- **Auth0**: Requires an Auth0 tenant and Application.
- **Keycloak**: Requires a Keycloak realm.

### Configuration

Add the following to your `server/.env` (or project root `.env` for production):

```env
# Example for GitHub
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
```

For detailed callback URLs and configuration links, run `npm run setup`.

## Admin Bootstrapping

If `AUTH_ENABLED=true` and the database contains no admin users, the system will automatically create a temporary admin account on startup:

- **Email**: `admin@demo.local`
- **Password**: Randomly generated 16-character string (logged to console).

**IMPORTANT**: Log in and change this password immediately, or create your own admin account and delete the default one.
