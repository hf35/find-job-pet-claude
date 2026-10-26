import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline';

/** Reads a line from the terminal without echoing it (falls back to plain stdin when piped). */
function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      const rl = createInterface({ input: process.stdin });
      rl.once('line', (line) => {
        resolve(line);
        rl.close();
      });
      rl.once('close', () => resolve(''));
    });
  }
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

const password = await readPassword('Password: ');
if (password.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log('\nPut this into .env (keep the single quotes, the hash contains "$"):\n');
console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
