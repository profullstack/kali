import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { TOOLS } from './tools.mjs';

const ARCH = { x64: 'x86_64', arm64: 'aarch64' }[process.arch] || process.arch;

// Ruby build dependencies needed for `gem install wpscan`.
const GEM_APT_DEPS = ['ruby', 'ruby-dev', 'build-essential', 'libcurl4-openssl-dev', 'zlib1g-dev'];

export function haveCmd(cmd) {
  const r = spawnSync('bash', ['-lc', `command -v ${cmd}`], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

// Locate a tool's binary, also probing dirs a login shell might miss.
export function locate(bin) {
  const r = spawnSync('bash', ['-lc', `command -v ${bin}`], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  for (const dir of [join(homedir(), 'go', 'bin'), '/usr/local/bin', '/usr/bin']) {
    const p = join(dir, bin);
    if (existsSync(p)) return p;
  }
  return null;
}

// Build an ordered list of install steps for the given tool names.
// Each step: { desc, kind: 'exec'|'shell', argv?, script? }
export function buildPlan(names) {
  const steps = [];
  const pick = (via) => names.filter((n) => TOOLS[n].via === via);

  const apt = pick('apt');
  const go = pick('go');
  const gem = pick('gem');
  const snap = pick('snap');
  const binary = pick('binary');

  const aptPkgs = apt.map((n) => TOOLS[n].pkg);
  if (gem.length) aptPkgs.push(...GEM_APT_DEPS);
  if (aptPkgs.length) {
    steps.push({ kind: 'exec', desc: 'Update apt package lists', argv: ['sudo', 'apt-get', 'update'] });
    steps.push({
      kind: 'exec',
      desc: `apt install: ${aptPkgs.join(' ')}`,
      argv: ['sudo', 'apt-get', 'install', '-y', ...aptPkgs],
    });
  }

  for (const n of go) {
    steps.push({ kind: 'exec', desc: `go install ${n}`, argv: ['go', 'install', TOOLS[n].mod] });
  }

  for (const n of gem) {
    steps.push({ kind: 'exec', desc: `gem install ${n}`, argv: ['sudo', 'gem', 'install', TOOLS[n].gem, '--no-document'] });
  }

  for (const n of snap) {
    const argv = ['sudo', 'snap', 'install', TOOLS[n].snap];
    if (TOOLS[n].classic) argv.push('--classic');
    steps.push({ kind: 'exec', desc: `snap install ${n}`, argv });
  }

  for (const n of binary) {
    steps.push(binaryStep(n));
  }

  return steps;
}

function binaryStep(n) {
  const t = TOOLS[n];
  const asset = t.assetTpl.replace('{arch}', ARCH);
  // GitHub resolves /releases/latest/download/<asset> to the newest release,
  // so no API call or JSON parsing is required.
  const url = `https://github.com/${t.repo}/releases/latest/download/${asset}`;
  const script = [
    'set -e',
    'tmp=$(mktemp -d)',
    `curl -fsSL -o "$tmp/pkg.tar.gz" "${url}"`,
    `tar xzf "$tmp/pkg.tar.gz" -C "$tmp" ${t.member}`,
    `sudo install -m755 "$tmp/${t.member}" /usr/local/bin/${t.member}`,
    'rm -rf "$tmp"',
  ].join(' && ');
  return { kind: 'shell', desc: `install ${n} (latest) -> /usr/local/bin`, script };
}

// Run one step. Returns true on success. Honors dryRun.
export function runStep(step, { dryRun } = {}) {
  const shown = step.kind === 'exec' ? step.argv.join(' ') : step.script;
  if (dryRun) {
    console.log(`  $ ${shown}`);
    return true;
  }
  console.log(`\n==> ${step.desc}`);
  console.log(`  $ ${shown}`);
  const r =
    step.kind === 'exec'
      ? spawnSync(step.argv[0], step.argv.slice(1), { stdio: 'inherit' })
      : spawnSync('bash', ['-c', step.script], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`  ! step failed (exit ${r.status ?? 'signal'})`);
    return false;
  }
  return true;
}

// Preflight: verify the toolchains the selected steps need are present.
export function missingToolchains(names) {
  const need = new Set();
  for (const n of names) {
    const via = TOOLS[n].via;
    if (via === 'apt') need.add('apt-get');
    else if (via === 'go') need.add('go');
    else if (via === 'gem') need.add('gem');
    else if (via === 'snap') need.add('snap');
    else if (via === 'binary') {
      need.add('curl');
      need.add('tar');
    }
  }
  // gem tools are installed via `gem`, which we also apt-install; only flag
  // `go`, `snap`, `curl`, `tar` and `apt-get` as hard prerequisites.
  return [...need].filter((c) => !haveCmd(c));
}

export const TOOLCHAIN_HINTS = {
  'apt-get': 'This installer targets Debian/Ubuntu; apt-get was not found.',
  go: 'Install Go (https://go.dev/dl) so `go install` works, then re-run.',
  snap: 'Install snapd (`sudo apt-get install snapd`) or install zaproxy manually.',
  curl: 'Install curl (`sudo apt-get install curl`).',
  tar: 'Install tar.',
};
