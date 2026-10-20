import { cp, mkdir, rm } from 'node:fs/promises';

const files = ['index.html', 'app.js', 'upgrades.js', 'styles.css', 'sync.css', 'sw.js', 'manifest.webmanifest'];
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
await Promise.all(files.map(file => cp(file, `www/${file}`)));
