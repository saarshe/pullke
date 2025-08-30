# Alfred Workflow Files

This directory contains the Alfred workflow definition files for the Pullke GitHub search workflow.

## Files

- **`info.plist`** - Main workflow configuration, contains all the workflow logic, scripts, and connections
- **`prefs.plist`** - Default preferences (empty by default, users configure their own organizations/keywords)

## Building the Workflow

To build a distributable `.alfredworkflow` file:

```bash
# From the alfred package directory
yarn build:workflow
```

This will:
1. Build the TypeScript sources
2. Copy workflow files to a temporary directory
3. Include the compiled JavaScript files
4. Create a `.alfredworkflow` package (zip file)
5. Place it in the `build/` directory

## Installation

Double-click the generated `Pullke.alfredworkflow` file to install it in Alfred.

## Configuration

After installation, configure the workflow in Alfred's preferences:
1. Open Alfred Preferences → Workflows
2. Find "Pullke" workflow
3. Click the [𝒙] button to configure environment variables
4. Set your **Organizations** (comma-separated)
5. Set your **Keywords** (comma-separated, optional)
6. Adjust **Cache TTL** if needed (default: 168 hours)

## Script Paths

The workflow uses relative paths (`./dist/script-name.js`) so it works regardless of where the workflow is installed. When you build the workflow, the compiled JavaScript files are included in the package.
