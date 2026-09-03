import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, CATEGORIES, resolveTargets, toolsByCategory } from '../src/tools.mjs';
import { buildPlan } from '../src/install.mjs';

test('every tool has a known category and install method', () => {
  const methods = new Set(['apt', 'go', 'gem', 'snap', 'binary']);
  for (const [name, t] of Object.entries(TOOLS)) {
    assert.ok(CATEGORIES[t.cat], `${name} has unknown category ${t.cat}`);
    assert.ok(methods.has(t.via), `${name} has unknown via ${t.via}`);
    assert.ok(t.bin, `${name} missing bin`);
    assert.ok(t.desc, `${name} missing desc`);
    if (t.via === 'apt') assert.ok(t.pkg, `${name} missing pkg`);
    if (t.via === 'go') assert.match(t.mod, /@/, `${name} go mod needs @version`);
    if (t.via === 'binary') assert.ok(t.repo && t.assetTpl && t.member, `${name} binary fields`);
  }
});

test('resolveTargets: all / category / tool / unknown', () => {
  assert.equal(resolveTargets([]).length, Object.keys(TOOLS).length);
  assert.equal(resolveTargets(['all']).length, Object.keys(TOOLS).length);

  const scan = resolveTargets(['scanning']);
  assert.deepEqual(scan.names.sort(), toolsByCategory('scanning').sort());
  assert.deepEqual(scan.unknown, []);

  const one = resolveTargets(['nuclei']);
  assert.deepEqual(one.names, ['nuclei']);

  const bad = resolveTargets(['nuclei', 'nope']);
  assert.deepEqual(bad.names, ['nuclei']);
  assert.deepEqual(bad.unknown, ['nope']);
});

test('buildPlan groups apt into a single install and adds ruby deps for gem tools', () => {
  const plan = buildPlan(['nmap', 'nikto', 'wpscan']);
  const aptInstall = plan.find((s) => s.desc.startsWith('apt install:'));
  assert.ok(aptInstall, 'expected an apt install step');
  assert.ok(aptInstall.argv.includes('nmap'));
  assert.ok(aptInstall.argv.includes('nikto'));
  assert.ok(aptInstall.argv.includes('ruby-dev'), 'wpscan should pull ruby build deps');
  assert.ok(plan.some((s) => s.desc === 'gem install wpscan'));
});

test('buildPlan builds a go install and a binary shell step', () => {
  const plan = buildPlan(['nuclei', 'feroxbuster']);
  assert.ok(plan.some((s) => s.kind === 'exec' && s.argv.join(' ').startsWith('go install')));
  const ferox = plan.find((s) => s.kind === 'shell');
  assert.ok(ferox && ferox.script.includes('releases/latest/download'));
  assert.ok(ferox.script.includes('/usr/local/bin/feroxbuster'));
});
