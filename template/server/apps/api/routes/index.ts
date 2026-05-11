import type { Express } from 'express';
import makeAuthRoute from './auth.js';
import makeUserRoute from './user.js';
import makeAccountRoute from './account.js';
import makeAdminRoute from './admin.js';
import makeFilesRoute from './files.js';
import makeBackupRoute from './backup.js';
import makeContentRoute from './content.js';
import makeIapRoute from './iap.js';
import makeHealthRoute from './health.js';

export default function makeRoutes(app: Express): void {
    makeAuthRoute(app);
    makeUserRoute(app);
    makeAccountRoute(app);
    makeAdminRoute(app);
    makeFilesRoute(app);

    // Mobile-paired routes — no-op for web-only projects (the mobile
    // app is the only client that hits them). Delete the imports +
    // calls if you don't ship a mobile app.
    makeBackupRoute(app);
    makeContentRoute(app);
    makeIapRoute(app);
    makeHealthRoute(app);
}
