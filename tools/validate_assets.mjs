// CI: validate every model with the Khronos glTF validator and check image files are what their
// extension says. Downloaded assets are checked here, on GitHub, never on the dev laptop (LESSONS L21).
import validator from 'gltf-validator';
import { readFileSync, readdirSync } from 'node:fs';

let bad = 0;
for (const f of readdirSync('assets/models').filter(n => n.endsWith('.gltf'))) {
  const report = await validator.validateBytes(new Uint8Array(readFileSync(`assets/models/${f}`)), { uri: f });
  const { numErrors, numWarnings } = report.issues;
  console.log(`${f}: ${numErrors} errors, ${numWarnings} warnings`);
  if (numErrors) { bad++; console.log(report.issues.messages.filter(m => m.severity === 0).slice(0, 5)); }
}
for (const dir of ['assets/textures', 'assets/hdri', 'assets/source'])
  for (const f of readdirSync(dir).filter(n => /\.(jpg|png)$/.test(n))) {
    const b = readFileSync(`${dir}/${f}`);
    const ok = f.endsWith('.png') ? b.subarray(1, 4).toString() === 'PNG' : b[0] === 0xff && b[1] === 0xd8;
    console.log(`${dir}/${f}: ${ok ? 'ok' : 'wrong file type'}`);
    if (!ok) bad++;
  }
process.exit(bad ? 1 : 0);
