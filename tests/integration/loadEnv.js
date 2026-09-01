import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
    const content = readFileSync(resolve(process.cwd(), '.env.test'), 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
            process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
        }
    }
} catch {
    // .env.test not found — tests will use existing process.env
}
