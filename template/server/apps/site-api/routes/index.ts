import type { Express } from 'express';
import makePublicRoute from './public.js';

export default function makeRoutes(app: Express): void {
    makePublicRoute(app);

    // Add new site API route modules here as the project grows:
    // makeCustomerRoute(app);
    // makeCheckoutRoute(app);
}
