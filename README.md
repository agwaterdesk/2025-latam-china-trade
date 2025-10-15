# 2025 LATAM-China Trade Svelte App

A Svelte application designed to be embedded in WordPress sites via jsDelivr CDN.

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
- `wordpress-embed.html` - Ready-to-use embed code

### Deploy to WordPress
```bash
# Commit to GitHub
git add dist/ wordpress-embed.html
git commit -m "Build for WordPress"
git push

# Then in WordPress:
# 1. Add a "Custom HTML" block
# 2. Copy contents of wordpress-embed.html
# 3. Paste into the block
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:embed` - Build + generate WordPress embed code
- `npm run preview` - Preview production build

## 🎯 Features

- Interactive scroll-based components
- Draggable threshold controls
- Responsive design
- WordPress-compatible via jsDelivr CDN
- Automatic file updates when you push to GitHub