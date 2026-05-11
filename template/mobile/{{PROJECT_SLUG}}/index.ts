// Polyfill browser globals that Metro / third-party packages expect but
// don't exist in the React Native / Hermes environment.
if (typeof globalThis.location === 'undefined') {
    globalThis.location = {
        protocol: 'https:',
        hostname: 'localhost',
        host: 'localhost:8081',
        port: '8081',
        pathname: '/',
        href: 'https://localhost:8081/',
        origin: 'https://localhost:8081'
    } as unknown as Location;
}

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        createElement: () => ({}),
        getElementById: () => null
    } as unknown as Document;
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
