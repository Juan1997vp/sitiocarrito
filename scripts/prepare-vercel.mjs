import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDirectory = path.join(root, 'public');
const staticFiles = ['index.html', 'styles.css', 'script.js', 'catalog.js', 'admin.html', 'admin.css', 'admin.js'];

await mkdir(publicDirectory, { recursive: true });
await Promise.all(staticFiles.map((file) => cp(path.join(root, file), path.join(publicDirectory, file))));
await cp(path.join(root, 'assets'), path.join(publicDirectory, 'assets'), { recursive: true });
