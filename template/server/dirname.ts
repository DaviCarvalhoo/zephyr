// Project-root directory, resolved from this file's own URL. Import
// this anywhere you'd otherwise reach for `process.cwd()` — `cwd()`
// depends on where the user invoked node from. You get bitten when:
//   - running `tsx watch` from a subdir
//   - running `knex migrate:latest` from core/
//   - running `npm run console` from apps/console/
//
// `import.meta.url` is anchored to the file itself, so this constant
// is always the server/ root regardless of the caller's cwd.

import { fileURLToPath } from 'url';
import path from 'node:path';

export default path.dirname(fileURLToPath(import.meta.url));
