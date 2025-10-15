# 2025 LATAM-China Trade Svelte App

A Svelte application designed to be embedded in WordPress sites via GitHub hosting.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Build for WordPress Embed
```bash
npm run build:embed
```

This generates:
- `dist/` folder with all build files
- `wordpress-github-embed.html` - Ready-to-use embed code

### Deploy
1. Commit the `dist/` folder to GitHub
2. Copy contents of `wordpress-github-embed.html`
3. Paste into WordPress Custom HTML block

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:embed` - Build + generate WordPress embed code
- `npm run preview` - Preview production build

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # Svelte components
│   └── assets/         # Static assets
└── routes/             # SvelteKit routes
```

## 🔧 Configuration

- **SvelteKit**: Configured for static output to `dist/` folder
- **Build**: Generates separate JS/CSS files (not inline) for WordPress compatibility
- **GitHub**: Files served from GitHub raw URLs for easy WordPress embedding

## 📖 Documentation

See [WORDPRESS-EMBED-INSTRUCTIONS.md](./WORDPRESS-EMBED-INSTRUCTIONS.md) for detailed WordPress embedding instructions.

## 🎯 Features

- Interactive scroll-based components
- Draggable threshold controls
- Responsive design
- WordPress-compatible build output
- GitHub-hosted deployment