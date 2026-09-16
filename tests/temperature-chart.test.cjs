const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = ts.transpileModule(
  readFileSync(path.join(__dirname, '..', 'src/lib/chart.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const chart = { exports: {} };
new Function('module', 'exports', source)(chart, chart.exports);

test('chart interpolation returns exact recorded endpoints', () => {
  assert.equal(chart.exports.interpolateSeries([20, 24, 22], 0), 20);
  assert.equal(chart.exports.interpolateSeries([20, 24, 22], 0.5), 24);
  assert.equal(chart.exports.interpolateSeries([20, 24, 22], 1), 22);
});

test('chart interpolation follows the smooth curve between readings', () => {
  assert.ok(Math.abs(chart.exports.interpolateSeries([20, 24], 0.5) - 22) < 0.01);
  assert.equal(chart.exports.interpolateSeries([], 0.5), null);
});
