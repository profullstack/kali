// Catalog of security tools this installer knows how to install.
//
// Each entry:
//   bin  - the command that ends up on PATH (used for `kali check`)
//   cat  - category slug (see CATEGORIES)
//   via  - install method: 'apt' | 'go' | 'gem' | 'snap' | 'binary'
//   desc - one-line description
//   pkg  - apt package name          (via 'apt')
//   mod  - go module path @version   (via 'go')
//   gem  - rubygem name              (via 'gem')
//   snap - snap name + classic flag  (via 'snap')
//   repo - GitHub owner/repo         (via 'binary', latest release)

export const CATEGORIES = {
  recon: 'Recon & fingerprinting',
  discovery: 'Content & endpoint discovery',
  scanning: 'Vulnerability scanning',
  proxy: 'Interception & manual testing',
  passwords: 'Auth & password attacks',
};

export const TOOLS = {
  // --- recon / fingerprinting ---
  nmap: { cat: 'recon', bin: 'nmap', via: 'apt', pkg: 'nmap', desc: 'Port/service scanner with http-* NSE scripts' },
  whatweb: { cat: 'recon', bin: 'whatweb', via: 'apt', pkg: 'whatweb', desc: 'Web technology / stack fingerprinting' },
  wafw00f: { cat: 'recon', bin: 'wafw00f', via: 'apt', pkg: 'wafw00f', desc: 'WAF detection & fingerprinting' },
  sslscan: { cat: 'recon', bin: 'sslscan', via: 'apt', pkg: 'sslscan', desc: 'Fast TLS/SSL configuration scanner' },
  testssl: { cat: 'recon', bin: 'testssl', via: 'apt', pkg: 'testssl.sh', desc: 'Thorough TLS/SSL configuration auditor' },
  subfinder: { cat: 'recon', bin: 'subfinder', via: 'go', mod: 'github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest', desc: 'Passive subdomain enumeration' },
  httpx: { cat: 'recon', bin: 'httpx', via: 'go', mod: 'github.com/projectdiscovery/httpx/cmd/httpx@latest', desc: 'Fast multi-purpose HTTP prober' },

  // --- discovery ---
  gobuster: { cat: 'discovery', bin: 'gobuster', via: 'apt', pkg: 'gobuster', desc: 'Dir/file/vhost/DNS brute forcer' },
  feroxbuster: { cat: 'discovery', bin: 'feroxbuster', via: 'binary', repo: 'epi052/feroxbuster', assetTpl: '{arch}-linux-feroxbuster.tar.gz', member: 'feroxbuster', desc: 'Fast recursive content discovery' },
  ffuf: { cat: 'discovery', bin: 'ffuf', via: 'apt', pkg: 'ffuf', desc: 'Fast web fuzzer (paths, params, vhosts)' },
  dirsearch: { cat: 'discovery', bin: 'dirsearch', via: 'apt', pkg: 'dirsearch', desc: 'Wordlist-driven path discovery' },
  dirb: { cat: 'discovery', bin: 'dirb', via: 'apt', pkg: 'dirb', desc: 'Classic web content scanner' },
  wfuzz: { cat: 'discovery', bin: 'wfuzz', via: 'apt', pkg: 'wfuzz', desc: 'Web application fuzzer' },
  katana: { cat: 'discovery', bin: 'katana', via: 'go', mod: 'github.com/projectdiscovery/katana/cmd/katana@latest', desc: 'Fast web crawler / endpoint spider' },

  // --- scanning ---
  nuclei: { cat: 'scanning', bin: 'nuclei', via: 'go', mod: 'github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest', desc: 'Template-based vulnerability scanner' },
  nikto: { cat: 'scanning', bin: 'nikto', via: 'apt', pkg: 'nikto', desc: 'Baseline web server vulnerability scan' },
  sqlmap: { cat: 'scanning', bin: 'sqlmap', via: 'apt', pkg: 'sqlmap', desc: 'Automated SQL injection detection/exploitation' },
  wpscan: { cat: 'scanning', bin: 'wpscan', via: 'gem', gem: 'wpscan', desc: 'WordPress security scanner' },

  // --- proxy / manual ---
  zaproxy: { cat: 'proxy', bin: 'zaproxy', via: 'snap', snap: 'zaproxy', classic: true, desc: 'OWASP ZAP intercepting proxy (headless-capable)' },
  mitmproxy: { cat: 'proxy', bin: 'mitmproxy', via: 'apt', pkg: 'mitmproxy', desc: 'Scriptable interactive HTTPS proxy' },

  // --- passwords ---
  hydra: { cat: 'passwords', bin: 'hydra', via: 'apt', pkg: 'hydra', desc: 'Network login brute forcer' },
  medusa: { cat: 'passwords', bin: 'medusa', via: 'apt', pkg: 'medusa', desc: 'Parallel network login brute forcer' },
  hashcat: { cat: 'passwords', bin: 'hashcat', via: 'apt', pkg: 'hashcat', desc: 'GPU-accelerated password recovery' },
  john: { cat: 'passwords', bin: 'john', via: 'apt', pkg: 'john', desc: 'John the Ripper password cracker' },
};

// Tools that are worth knowing about but this installer does not auto-install
// (licensing, GUI, or manual download). Shown by `kali list`.
export const MANUAL = {
  burpsuite: { cat: 'proxy', desc: 'Burp Suite Community — download from portswigger.net' },
};

export function toolNames() {
  return Object.keys(TOOLS);
}

export function toolsByCategory(cat) {
  return Object.entries(TOOLS)
    .filter(([, t]) => t.cat === cat)
    .map(([name]) => name);
}

// Resolve a list of user-supplied targets (tool names, category names, or
// 'all') into a de-duplicated, catalog-ordered list of tool names.
export function resolveTargets(targets) {
  const all = toolNames();
  if (!targets.length || targets.includes('all')) return all;
  const wanted = new Set();
  const unknown = [];
  for (const raw of targets) {
    const t = raw.toLowerCase();
    if (TOOLS[t]) wanted.add(t);
    else if (CATEGORIES[t]) toolsByCategory(t).forEach((n) => wanted.add(n));
    else unknown.push(raw);
  }
  return { names: all.filter((n) => wanted.has(n)), unknown };
}
