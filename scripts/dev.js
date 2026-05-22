import { spawn } from 'child_process';

// Ignore any arguments passed down by npm / the platform runner to avoid option errors
const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
