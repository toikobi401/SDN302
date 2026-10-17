// Chấm bài tự động bằng node:test (không cần cài thêm thư viện).
//
//   npm run check                 -> chấm tất cả bài trong exercises/
//   npm run check -- 1 3          -> chỉ chấm bài 1 và bài 3
//   npm run check -- challenge    -> chấm bài thử thách
//   npm run check:solution -- 2   -> chạy test với code đáp án (solutions/)

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const target = args.includes('--solution') ? 'solutions' : 'exercises';
const wanted = args
  .filter((arg) => !arg.startsWith('--'))
  .map((arg) => (/^\d+$/.test(arg) ? `ex${arg}` : arg));

const testsDir = path.join(__dirname, '..', 'tests');
const files = fs
  .readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .filter((file) => wanted.length === 0 || wanted.includes(file.replace('.test.js', '')))
  .sort()
  .map((file) => path.join(testsDir, file));

if (files.length === 0) {
  console.error(`Không tìm thấy bài nào khớp với: ${wanted.join(', ')}`);
  console.error('Ví dụ: npm run check -- 1   hoặc   npm run check -- challenge');
  process.exit(1);
}

console.log(`Đang chấm thư mục ${target}/ -> ${files.map((f) => path.basename(f)).join(', ')}\n`);

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  env: { ...process.env, TARGET: target, NODE_ENV: 'test' },
});

process.exit(result.status ?? 1);
