# @profullstack/kali

One command to install a curated set of **Kali-style security tools** for web
application testing on a plain **Debian/Ubuntu** box — no need to run Kali itself.

> Unofficial convenience installer. "Kali Linux" is a trademark of OffSec; this
> project is not affiliated with or endorsed by them. **Only test systems you
> are authorized to test** — unauthorized scanning/attacking is illegal in most
> jurisdictions.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/profullstack/kali/main/install.sh | sh
kali install                          # install everything
```

The installer itself needs no root: it puts the `kali` command under `~/.local` (fetching a private Node if yours is too old). `kali install` then uses `sudo` for the pentest tools it installs. Run the installer again to update; remove the CLI with `sh ~/.local/share/kali/uninstall.sh`.

Or with npm:

```sh
npx @profullstack/kali install        # install everything
npm i -g @profullstack/kali           # or the CLI globally
```

## Usage

```sh
kali list                 # all known tools, grouped by category
kali install              # install everything
kali install scanning     # install one category
kali install nuclei ffuf  # install specific tools
kali install all --dry-run
kali check                # what's already installed, and where
```

Flags: `--dry-run` (print commands only), `-y`/`--yes` (skip the prompt).

## What it installs

| Category | Tools |
|----------|-------|
| **Recon & fingerprinting** | nmap, whatweb, wafw00f, sslscan, testssl, subfinder, httpx |
| **Content & endpoint discovery** | gobuster, feroxbuster, ffuf, dirsearch, dirb, wfuzz, katana |
| **Vulnerability scanning** | nuclei, nikto, sqlmap, wpscan |
| **Interception & manual testing** | zaproxy (OWASP ZAP), mitmproxy |
| **Auth & password attacks** | hydra, medusa, hashcat, john |

Burp Suite is listed by `kali list` but not auto-installed — download the
Community edition from PortSwigger.

## How each tool is installed

- **apt** — most tools, from Ubuntu's own repositories (`sudo apt-get install`).
- **go install** — the ProjectDiscovery tools (`nuclei`, `httpx`, `subfinder`,
  `katana`) into `~/go/bin`. Requires Go on `PATH`.
- **gem** — `wpscan` (the installer pulls the required Ruby build deps via apt).
- **snap** — `zaproxy` (OWASP ZAP), classic confinement.
- **GitHub release binary** — `feroxbuster` into `/usr/local/bin`.

Privileged steps use `sudo`; run from an account that can `sudo`. Tools
installed to `~/go/bin` need that directory on your `PATH`.

## Requirements

- Debian/Ubuntu (uses `apt-get`)
- Node.js >= 18
- `sudo` rights; `curl` and `tar`; `go` (only if installing the go tools);
  `snapd` (only for zaproxy)

## License

MIT
