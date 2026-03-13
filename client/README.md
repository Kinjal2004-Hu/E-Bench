# E-BENCH — Digital Justice

AI-Powered Legal Intelligence Platform built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
ebench/
├── app/
│   ├── globals.css          # Global styles, CSS variables, animations
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Main page (assembles all sections)
├── components/
│   ├── Navbar.tsx           # Sticky nav with scroll-active links
│   ├── Footer.tsx           # Footer with links
│   └── sections/
│       ├── HeroSection.tsx      # Hero with library frame & scales SVG
│       ├── PurposeSection.tsx   # Problem cards + stats visual
│       ├── FeaturesSection.tsx  # 5 feature cards grid
│       ├── SourcesSection.tsx   # Infinite marquee of legal sources
│       ├── FAQSection.tsx       # Accordion FAQ
│       └── ContactSection.tsx   # Contact cards + form
├── lib/
│   └── useReveal.ts         # Custom hook for scroll-triggered animations
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 🎨 Design System

| Token       | Value      | Usage                        |
|-------------|------------|------------------------------|
| `--navy`    | `#1A2C42`  | Primary text, backgrounds    |
| `--gold`    | `#8B6914`  | Borders, labels              |
| `--gold-light` | `#C4963A` | Buttons, hover accents     |
| `--parchment` | `#F7F3E8` | Main section backgrounds    |
| `--cream`   | `#FDFAF3`  | Hero section background      |

## ✨ Features

- **Scroll-triggered animations** via `IntersectionObserver` (`useReveal` hook)
- **Parallax** on the hero library frame
- **Animated SVG scales** (tilting balance arm)
- **Infinite marquee** for legal sources
- **Accordion FAQ** with smooth height transition
- **Active nav highlighting** based on scroll position
- **Sticky navbar** with blur glass effect on scroll
- **Responsive** layout for mobile
