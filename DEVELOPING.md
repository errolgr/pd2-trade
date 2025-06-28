# Development Guide

Welcome to the PD2 Trader development team! This guide will help you get started with the project and understand the development workflow.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)
- **Git** - [Download here](https://git-scm.com/)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/errolgr/pd2-trade.git
   cd pd2-trade
   ```

2. **Install dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Rust dependencies (this will happen automatically on first build)
   ```

3. **Start development server**
   ```bash
   # Start the development server with hot reload
   npm run tauri dev
   ```

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend (Tauri)
- **Rust** - System programming language
- **Tauri 2** - Desktop app framework
- **Serde** - Serialization/deserialization

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Sentry** - Error tracking and monitoring

## 📁 Project Structure

```
pd2-trade/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components (shadcn/ui style)
│   │   ├── custom/        # Custom components
│   │   └── dialogs/       # Dialog components
│   ├── pages/             # Page components
│   │   ├── landing/       # Landing page
│   │   ├── price-check/   # Item price checking
│   │   ├── quick-list/    # Quick list functionality
│   │   └── settings/      # Settings page
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── common/            # Shared types and utilities
│   └── assets/            # Static assets
├── src-tauri/             # Rust/Tauri backend
│   ├── src/               # Rust source code
│   │   └── modules/       # Rust modules
│   └── Cargo.toml         # Rust dependencies
├── public/                # Public assets
│   └── runes/             # Rune images
└── docs/                  # Documentation
```

## 🔧 Development Commands

### Frontend Development
```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```


### Documentation
```bash
# Start documentation dev server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview documentation
npm run docs:preview
```

## 🎯 Key Features

### 1. Item Price Check
- Real-time item pricing from PD2 marketplace
- Rune exchange rates
- Item quality and stat analysis

### 2. Quick List
- Fast access to frequently used items
- Keyboard shortcuts for quick actions

### 3. Settings & Configuration
- User preferences
- Hotkey configuration
- Appearance settings

## 🔌 Development Workflow

### 1. Making Changes
1. Create a new branch for your feature/fix
2. Make your changes following the coding standards
3. Test your changes thoroughly
4. Commit with a descriptive message
5. Create a pull request

### 2. Code Standards
- Use TypeScript for all new code
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Add comments for complex logic

### 3. Testing
- Test and Tauri functionality
- Verify hotkeys work correctly
- Test on Windows (primary platform)

## 🐛 Debugging

### Frontend Debugging
- Use browser dev tools for React debugging
- Check the console for errors
- Use React DevTools extension

### Tauri Debugging
- Check the Tauri console output
- Use `npm run tauri:debug` for debug builds

### Common Issues
1. **Port conflicts**: Ensure port 1420 is available
2. **Rust compilation errors**: Run `cargo clean` and try again
3. **Node modules issues**: Delete `node_modules` and `package-lock.json`, then `npm install`

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)