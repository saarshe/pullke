# @pullke/alfred

Alfred workflow for searching GitHub repositories and pull requests with powerful filtering and caching.

## Features

- 🔍 **Repository Search**: Search across multiple GitHub organizations with keyword filtering
- 🔀 **Pull Request Search**: Search recent PRs in any repository  
- 🔐 **GitHub CLI Authentication**: Uses your existing `gh auth` setup
- ⚡ **Smart Caching**: Fast results with configurable cache TTL
- 🎯 **Alfred Actions**: Open in browser, copy URL, view PRs with keyboard modifiers

## Installation

### 1. Clone and Build

```bash
# Clone the repository
git clone https://github.com/saarshe/pullke.git

# Install dependencies and build
cd pullke
yarn install
yarn build
```

### 2. Setup GitHub Authentication

```bash
# Install GitHub CLI if not already installed
brew install gh

# Authenticate with GitHub
gh auth login
```

### 3. Download Alfred Workflow

> Download link TBD

After downloading, double-click the `.alfredworkflow` file to install it.

## Usage

### Repository Search
Type `pullke` in Alfred → Browse repos → Select a repository:

- **Enter**: Open Pull Requests search for selected repo
- **⌘ + Enter**: Open repository in browser  
- **⌥ + Enter**: Copy repository URL to clipboard

### Pull Request Search  
Browse recent PRs → Select a pull request:

- **Enter**: Open pull request in browser
- **⌥ + Enter**: Copy pull request URL to clipboard

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `organizations` | Comma-separated GitHub orgs to search | Required |
| `keywords` | Filter repos by keywords | Optional |
| `cache_ttl_hours` | Cache duration in hours | 168 (7 days) |
| `selectedRepo` | Repository for PR search (format: owner/repo) | From Alfred query |

## Requirements

- **Node.js 18+**
- **GitHub CLI** (`gh`)
- **Alfred 4+** with Powerpack

---

Made with ❤️ for faster GitHub navigation