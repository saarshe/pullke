# Pullke 🍗

<div align="center">
  <img src="packages/alfred/workflow/icon.png" alt="Pullke Logo" width="200">
</div>

Quickly search GitHub repositories and pull requests across multiple organizations with smart caching.

## Features

- 🔍 **Find repositories fast** - Search across multiple organizations with keyword filtering
- 🔀 **Browse pull requests** - Filter by status, author, labels, and dates
- 🔐 **Easy authentication** - Works with GitHub CLI (`gh auth login`)
- ⚡ **Smart caching** - Remembers results locally for faster searches (no data sent to external servers)
- 🎯 **Alfred integration** - Quick access from macOS Alfred launcher

## Packages

- **[@pullke/core](packages/core/)** - Core GitHub API functionality
- **[@pullke/alfred](packages/alfred/)** - Alfred workflow for macOS

## Quick Start

### Alfred Workflow (macOS)

1. Download `Pullke.alfredworkflow` from [Releases](https://github.com/saarshe/pullke/releases)
2. Double-click to install in Alfred
3. Configure organizations and keywords in Alfred's workflow settings
4. Use `pullke repo` to search repositories

## Contributing

```bash
# Clone and setup
git clone https://github.com/saarshe/pullke.git
cd pullke
yarn install && yarn build

# Development
yarn dev          # Watch mode for all packages
yarn test         # Run tests
yarn type-check   # TypeScript validation

# Build Alfred workflow
yarn build:alfred
```

## License

MIT