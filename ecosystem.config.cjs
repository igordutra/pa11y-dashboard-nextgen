module.exports = {
    apps: [
        {
            name: 'pa11y-dashboard',
            script: 'npm',
            args: 'run start',
            cwd: './server',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
