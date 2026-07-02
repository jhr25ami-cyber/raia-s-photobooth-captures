// Builds a static Capacitor webDir (www/) from the offline `public/` folder.
// The app in public/ is fully static HTML/CSS/JS — no SSR needed for the APK.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const src = resolve(root, 'public');
const dest = resolve(root, 'www');

if (!existsSync(src)) {
  console.error('public/ folder not found');
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });

// Capacitor loads index.html by default → redirect to welcome.html.
const indexHtml = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="0; url=welcome.html"/>
<title>Raia Photobooth</title>
<script>location.replace('welcome.html');</script>
</head>
<body></body>
</html>
`;
await writeFile(resolve(dest, 'index.html'), indexHtml, 'utf8');

console.log('✔ www/ built for Capacitor from public/');
