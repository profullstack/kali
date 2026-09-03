#!/usr/bin/env node
import { CATEGORIES, TOOLS, MANUAL, toolsByCategory, resolveTargets, toolNames } from '../src/tools.mjs';
import { buildPlan, runStep, locate, missingToolchains, TOOLCHAIN_HINTS } from '../src/install.mjs';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('-')));
const args = argv.filter((a) => !a.startsWith('-'));
const cmd = args.shift() || 'help';

const has = (...f) => f.some((x) => flags.has(x));

function help() {
  console.log(`kali — installer for popular Kali-style web pentesting tools (Debian/Ubuntu)

USAGE
  kali <command> [targets...] [flags]

COMMANDS
  install [targets...]   Install tools. Targets = tool names, category names, or "all".
                         With no target, installs everything.
  list [category]        List known tools, grouped by category.
  categories             List category slugs.
  check                  Show which tools are installed (and where).
  help                   Show this help.

FLAGS
  --dry-run              Print the commands that would run, without running them.
  -y, --yes              Skip the confirmation prompt for install.

EXAMPLES
  kali list
  kali install                 # everything
  kali install scanning        # just the vuln scanners
  kali install nuclei ffuf     # specific tools
  kali install all --dry-run
  kali check

Categories: ${Object.keys(CATEGORIES).join(', ')}

Note: an unofficial convenience installer. "Kali Linux" is a trademark of
OffSec; this project is not affiliated with or endorsed by them. Only test
systems you are authorized to test.`);
}

function list(cat) {
  const cats = cat ? [cat] : Object.keys(CATEGORIES);
  for (const c of cats) {
    if (!CATEGORIES[c]) {
      console.error(`Unknown category: ${c}`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${CATEGORIES[c]}  (${c})`);
    for (const n of toolsByCategory(c)) {
      const t = TOOLS[n];
      console.log(`  ${n.padEnd(13)} ${t.desc}  [${t.via}]`);
    }
    for (const [n, m] of Object.entries(MANUAL)) {
      if (m.cat === c) console.log(`  ${n.padEnd(13)} ${m.desc}  [manual]`);
    }
  }
}

function check() {
  let installed = 0;
  const total = toolNames().length;
  for (const c of Object.keys(CATEGORIES)) {
    const names = toolsByCategory(c);
    if (!names.length) continue;
    console.log(`\n${CATEGORIES[c]}`);
    for (const n of names) {
      const path = locate(TOOLS[n].bin);
      if (path) installed++;
      const mark = path ? '✓' : '✗';
      console.log(`  ${mark} ${n.padEnd(13)} ${path || 'not installed'}`);
    }
  }
  console.log(`\n${installed}/${total} installed.`);
}

function categories() {
  for (const [slug, name] of Object.entries(CATEGORIES)) {
    console.log(`  ${slug.padEnd(11)} ${name}`);
  }
}

async function confirm(question) {
  if (has('-y', '--yes') || !process.stdin.isTTY) return true;
  process.stdout.write(`${question} [y/N] `);
  const answer = await new Promise((resolve) => {
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (d) => resolve(d.trim().toLowerCase()));
  });
  return answer === 'y' || answer === 'yes';
}

async function install(targets) {
  const { names, unknown } = resolveTargets(targets);
  if (unknown && unknown.length) {
    console.error(`Unknown target(s): ${unknown.join(', ')}`);
    console.error('Run `kali list` to see tool names, or `kali categories`.');
    process.exitCode = 1;
    return;
  }
  if (!names.length) {
    console.error('Nothing to install.');
    process.exitCode = 1;
    return;
  }

  const dryRun = has('--dry-run');

  if (!dryRun) {
    const missing = missingToolchains(names);
    if (missing.length) {
      console.error('Missing prerequisites:');
      for (const m of missing) console.error(`  - ${m}: ${TOOLCHAIN_HINTS[m] || ''}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`Will install ${names.length} tool(s): ${names.join(', ')}`);
  const plan = buildPlan(names);

  if (dryRun) {
    console.log('\nPlanned commands:');
    for (const step of plan) runStep(step, { dryRun: true });
    return;
  }

  if (!(await confirm('\nProceed?'))) {
    console.log('Aborted.');
    return;
  }

  let failures = 0;
  for (const step of plan) {
    if (!runStep(step)) failures++;
  }

  console.log('\n— Result —');
  let ok = 0;
  for (const n of names) {
    const path = locate(TOOLS[n].bin);
    if (path) ok++;
    console.log(`  ${path ? '✓' : '✗'} ${n.padEnd(13)} ${path || 'not found on PATH'}`);
  }
  console.log(`\n${ok}/${names.length} tools available.`);
  if (failures || ok < names.length) {
    console.log('Some tools may need a new shell (PATH) or a manual step — see messages above.');
    process.exitCode = 1;
  }
  try { process.stdin.pause(); } catch { /* ignore */ }
}

switch (cmd) {
  case 'install':
    await install(args);
    break;
  case 'list':
    list(args[0]);
    break;
  case 'categories':
    categories();
    break;
  case 'check':
  case 'doctor':
    check();
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    help();
    process.exitCode = 1;
}
