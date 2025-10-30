# Design System Guidelines

## Overview

This document outlines the comprehensive design system used in the Wetware & Software project. The system is built for transferability to other projects, providing a consistent, accessible, and maintainable foundation for web applications.

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Language**: TypeScript with strict type checking
- **Build Tool**: Bun with Biome for code quality
- **Color Space**: OKLCH for perceptually uniform colors

### Core Principles
1. **Consistency**: Unified design language across all components
2. **Accessibility**: WCAG compliant with keyboard navigation and screen reader support
3. **Performance**: Optimized CSS with minimal bundle size impact
4. **Maintainability**: Theme-driven system with easy customization
5. **Scalability**: Component-based architecture with clear extension patterns

---

## 🎨 Color System

### OKLCH Color Space
The system uses OKLCH color space for better perceptual uniformity and accessibility.

### Brand Colors
```css
/* CSS Custom Properties */
:root {
  --color-silver: 248 248 248;   /* #f8f8f8 - Light backgrounds */
  --color-charcoal: 33 33 33;   /* #212121 - Dark text */
  --color-orange: 255 122 0;    /* #ff7a00 - Brand accent */
}

.dark {
  --color-charcoal: 24 24 24;   /* Darker for dark mode */
  --color-orange: 255 150 60;   /* Warmer accent in dark */
}
```

### Theme System
The system uses shadcn/ui's theme system with OKLCH values:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --border: oklch(0.922 0 0);
  /* ... additional theme tokens */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark mode overrides */
}
```

### Usage in Components
```tsx
// ✅ Correct - Use theme tokens
<div className="bg-background text-foreground border-border">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Incorrect - Hardcoded colors
<div className="bg-white text-gray-900 border-gray-200">
  <h1 className="text-blue-600">Title</h1>
  <p className="text-gray-600">Description</p>
</div>
```

### Color Roles
- **Background**: `bg-background` - Main background color
- **Surface**: `bg-card` - Elevated surfaces, cards
- **Primary**: `text-primary` - Primary actions, links
- **Secondary**: `text-muted-foreground` - Secondary text
- **Border**: `border-border` - Subtle borders
- **Accent**: `bg-accent` - Interactive elements

---

## 📝 Typography

### Font Families
```css
/* Tailwind Configuration */
fontFamily: {
  sans: ["Montserrat", "system-ui", "sans-serif"],
  serif: ["Merriweather", "serif"],
  mono: ["Fira Code", "monospace"],
}
```

### Fluid Typography Scale
The system uses responsive typography that scales with viewport size:

```css
/* Extended font sizes for fluid typography */
fluidTypography: {
  h1: { min: "2.5rem", max: "5rem" },
  h2: { min: "2rem", max: "4rem" },
  h3: { min: "1.5rem", max: "3rem" },
  // ... additional scales
}
```

### Typography Hierarchy
```tsx
// Headings
<h1 className="text-4xl font-bold tracking-tight">Hero Title</h1>
<h2 className="text-3xl font-bold tracking-tight">Page Title</h2>
<h3 className="text-2xl font-bold tracking-tight">Section Title</h3>
<h4 className="text-xl font-semibold">Component Title</h4>

// Body Text
<p className="text-base font-serif">Body text in serif</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<span className="text-xs text-muted-foreground">Caption text</span>
```

### Prose Styling
```css
/* Tailwind Typography Plugin Configuration */
.prose {
  @apply max-w-none dark:prose-invert prose-sm md:prose-base;
}

.prose h1, .prose h2, .prose h3 {
  @apply font-sans;
}

.prose p {
  @apply font-serif;
}
```

---

## 📏 Spacing & Layout

### Spacing Scale
The system uses Tailwind's default spacing scale (4px increments):

```tsx
// Consistent spacing patterns
<div className="p-4">          {/* 16px padding */}
<div className="gap-6">         {/* 24px gap */}
<div className="m-2">          {/* 8px margin */}
<div className="space-y-3">     {/* 12px vertical spacing */}
```

### Layout Patterns

#### Grid System
```tsx
// Responsive grid layouts
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <Card key={item.id} className="p-6">
      <CardContent>{item.content}</CardContent>
    </Card>
  ))}
</div>
```

#### Content + Sidebar Layout
```tsx
<div className="grid gap-8 lg:grid-cols-[1fr_300px]">
  <main className="min-w-0">        {/* Main content */}
  <aside className="space-y-6">     {/* Sidebar */}
</div>
```

#### Container Widths
```tsx
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content constrained to readable width */}
</div>
```

---

## 🧩 Component System

### Base Component Props
All components extend consistent prop interfaces:

```typescript
interface BaseComponentProps {
  className?: string;      // Additional CSS classes
  children?: ReactNode;    // Child components
  testId?: string;         // Test identifier
}

interface CardComponentProps extends BaseComponentProps {
  hoverable?: boolean;     // Enable hover effects
  variant?: "default" | "outlined" | "elevated";
}
```

### Component Categories

#### 1. Card Components

##### PostCard
Displays blog posts with rich metadata and visual appeal.

```typescript
interface PostCardProps extends CardComponentProps {
  post: Post;                          // Post data
  showDescription?: boolean;           // Show description (default: true)
  showTags?: boolean;                  // Show tags (default: true)
  maxTags?: number;                    // Max tags to show (default: 3)
  minHeight?: string;                  // Minimum card height (default: "200px")
  titleLineClamp?: number;              // Title line clamp (default: 2)
  descriptionLineClamp?: number;        // Description line clamp (default: 3)
  interactive?: boolean;               // Make card clickable (default: false)
  imagePriority?: boolean;             // Image loading priority (default: false)
}
```

**Usage Examples:**
```tsx
// Standard blog post card
<PostCard
  post={post}
  hoverable={true}
  showDescription={true}
  showTags={true}
  testId="blog-post-card"
/>

// Compact mobile-friendly card
<PostCard
  post={post}
  showDescription={false}
  showTags={false}
  minHeight="150px"
  titleLineClamp={1}
  descriptionLineClamp={2}
/>

// Interactive card with custom sizing
<PostCard
  post={post}
  interactive={true}
  maxWidth={{ base: "20rem", md: "24rem", lg: "28rem" }}
  imagePriority={true}
/>
```

##### SeriesCard
Flexible series display with multiple layout variants.

```typescript
interface SeriesCardProps {
  series: Series;                       // Series data
  variant?: "grid" | "carousel" | "list"; // Layout variant (default: "grid")
  size?: "sm" | "md" | "lg";           // Size variant (default: "md")
  showDescription?: boolean;           // Show description (default: true)
  showArticleCount?: boolean;          // Show article count (default: true)
  priority?: boolean;                  // Image loading priority (default: false)
  testId?: string;                     // Test identifier
}
```

**Usage Examples:**
```tsx
// Grid layout for series pages
<SeriesCard
  series={series}
  variant="grid"
  size="lg"
  showDescription={true}
  showArticleCount={true}
/>

// Compact carousel layout
<SeriesCard
  series={series}
  variant="carousel"
  size="sm"
  showDescription={false}
/>

// List layout for sidebars
<SeriesCard
  series={series}
  variant="list"
  size="md"
  showArticleCount={true}
/>
```

##### ProjectCard
Showcase projects with status indicators and technology stack.

```typescript
interface ProjectCardProps extends CardComponentProps {
  project: Project;                    // Project data
  showDescription?: boolean;           // Show description (default: true)
  showTechnologies?: boolean;          // Show tech stack (default: true)
}
```

**Usage Examples:**
```tsx
// Full project display
<ProjectCard
  project={project}
  showDescription={true}
  showTechnologies={true}
  hoverable={true}
/>

// Minimal project display
<ProjectCard
  project={project}
  showDescription={false}
  showTechnologies={false}
/>
```

#### 2. Layout Components

##### SeriesContentLayout
Creates consistent layouts with series sidebar and main content.

```typescript
interface SeriesContentLayoutProps extends BaseComponentProps {
  series: Series[];                    // Series data (currently unused in layout)
  children: ReactNode;                 // Main content
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl" | "full"; // Container width (default: "7xl")
  gap?: "sm" | "md" | "lg" | "xl";     // Gap between sections (default: "lg")
}
```

**Usage Examples:**
```tsx
// Standard layout with wide container
<SeriesContentLayout series={series} maxWidth="7xl" gap="lg">
  <div className="space-y-8">
    <MainContent />
    <RelatedContent />
  </div>
</SeriesContentLayout>

// Compact layout
<SeriesContentLayout series={series} maxWidth="5xl" gap="md">
  <MainContent />
</SeriesContentLayout>

// Right-aligned series (alternative layout)
<SeriesContentLayoutRight series={series} maxWidth="6xl" gap="xl">
  <MainContent />
</SeriesContentLayoutRight>
```

#### 3. Content Display Components

##### LatestPosts
Displays recent posts with view switching capabilities.

```typescript
interface LatestPostsProps extends BaseComponentProps {
  posts: Post[];                       // Posts to display
  maxPosts?: number;                   // Maximum posts to show (default: 10)
  defaultView?: "card" | "list";       // Default view mode (default: "card")
  showViewToggle?: boolean;            // Show view switcher (default: true)
}
```

**Usage Examples:**
```tsx
// Full-featured with view switching
<LatestPosts
  posts={posts}
  maxPosts={12}
  defaultView="card"
  showViewToggle={true}
/>

// Simple list without toggle
<LatestPosts
  posts={posts}
  maxPosts={5}
  defaultView="list"
  showViewToggle={false}
/>
```

#### 4. UI Components

##### Card System
Consistent container styling with slots for structured content:

```typescript
interface CardProps extends BaseComponentProps {
  children: ReactNode;
}

interface CardHeaderProps extends BaseComponentProps {
  children: ReactNode;
}

interface CardContentProps extends BaseComponentProps {
  children: ReactNode;
}

interface CardFooterProps extends BaseComponentProps {
  children: ReactNode;
}
```

**Usage Examples:**
```tsx
// Standard card structure
<Card className="p-6">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Minimal card
<Card className="p-4">
  <CardContent>
    Simple content
  </CardContent>
</Card>
```

##### Button
Accessible button component with multiple variants:

```typescript
interface ButtonProps extends BaseComponentProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  onClick?: () => void;
}
```

**Usage Examples:**
```tsx
// Primary action
<Button variant="default" size="default">
  Save Changes
</Button>

// Secondary action
<Button variant="outline" size="sm">
  Cancel
</Button>

// Destructive action
<Button variant="destructive" size="sm">
  Delete
</Button>
```

##### CustomTag
Styled tag component for metadata:

```typescript
interface CustomTagProps extends BaseComponentProps {
  children: ReactNode;
  variant?: "default" | "secondary";
}
```

**Usage Examples:**
```tsx
<CustomTag>Technology</CustomTag>
<CustomTag variant="secondary">Tutorial</CustomTag>
```

### Component Variants
Components support multiple variants for different contexts:

```tsx
// Series Card Variants
<UnifiedSeriesCard variant="compact" />    // Sidebars
<UnifiedSeriesCard variant="featured" />   // Hero sections
<UnifiedSeriesCard variant="grid" />       // Series pages
```

---

## ♿ Accessibility

### Focus Management
```css
/* Consistent focus rings */
.focus-ring {
  @apply outline-none ring-2 ring-orange/70 ring-offset-2 ring-offset-background;
}
```

### Keyboard Navigation
```tsx
// Focusable elements with proper tab order
<button className="focus-ring" onClick={handleClick}>
  Action
</button>

<a href="/page" className="focus-ring">
  Link
</a>
```

### ARIA Support
```tsx
// Semantic markup with ARIA where needed
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="/home">Home</a>
    </li>
  </ul>
</nav>
```

### Color Contrast
- All text combinations meet WCAG AA standards
- Focus indicators have 3:1 contrast ratio
- Interactive elements have sufficient color contrast

---

## 🌓 Theming & Dark Mode

### Theme Provider Setup
```tsx
import { ThemeProvider } from "next-themes"

export function App({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
```

### Theme-Aware Components
```tsx
import { useTheme } from "next-themes"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="focus-ring"
    >
      Toggle theme
    </button>
  )
}
```

### CSS Custom Properties
All colors automatically adapt through CSS custom properties:

```css
/* Light mode */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

/* Dark mode */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

---

## 🔧 Implementation Guide

### Project Setup

1. **Install Dependencies**
```bash
bun add @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
bun add -D @shadcn/ui tailwindcss postcss autoprefixer
```

2. **Initialize shadcn/ui**
```bash
npx shadcn-ui@latest init
# Select: New York style, CSS variables, OKLCH colors
```

3. **Configure Tailwind**
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        // ... theme tokens
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"],
        mono: ["Fira Code", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
}
```

4. **Add Global Styles**
```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-silver: 248 248 248;
    --color-charcoal: 33 33 33;
    --color-orange: 255 122 0;
    /* OKLCH theme variables */
  }

  .dark {
    --color-charcoal: 24 24 24;
    --color-orange: 255 150 60;
    /* Dark mode overrides */
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans;
  }

  .focus-ring {
    @apply outline-none ring-2 ring-orange/70 ring-offset-2 ring-offset-background;
  }
}
```

### Component Development

1. **Component Structure with Variants**
```typescript
// components/MyComponent.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Define variants using class-variance-authority
const myComponentVariants = cva(
  "relative rounded-lg border border-border bg-card text-card-foreground shadow-sm", // Base styles
  {
    variants: {
      variant: {
        default: "",
        primary: "border-primary bg-primary text-primary-foreground",
        secondary: "border-secondary bg-secondary text-secondary-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
      },
      size: {
        sm: "px-3 py-1 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

// Props interface extending HTML attributes and variant props
interface MyComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof myComponentVariants> {
  testId?: string
  children: React.ReactNode
}

function MyComponent({
  className,
  variant,
  size,
  testId,
  children,
  ...props
}: MyComponentProps) {
  return (
    <div
      className={cn(myComponentVariants({ variant, size }), className)}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
}

MyComponent.displayName = "MyComponent"
export { MyComponent, type MyComponentProps }
```

2. **Type Definitions**
```typescript
// lib/component-types.ts
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  testId?: string
}

export interface CardComponentProps extends BaseComponentProps {
  hoverable?: boolean
  variant?: "default" | "outlined" | "elevated"
}

export interface ClickableProps {
  onClick?: () => void
  disabled?: boolean
}

export interface LoadingProps {
  isLoading?: boolean
  loadingText?: string
}

// Utility type for component props with refs
export type ComponentPropsWithRef<T extends keyof React.JSX.IntrinsicElements> =
  BaseComponentProps & React.JSX.IntrinsicElements[T]

// Utility type for required props
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>
```

3. **Component with Forwarded Ref**
```typescript
// components/MyInput.tsx
import { cn } from "@/lib/utils"
import React from "react"

interface MyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  testId?: string
}

const MyInput = React.forwardRef<HTMLInputElement, MyInputProps>(
  ({ className, testId, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          "disabled:opacity-50",
          className
        )}
        data-testid={testId}
        {...props}
      />
    )
  }
)

MyInput.displayName = "MyInput"
export { MyInput, type MyInputProps }
```

4. **Compound Component Pattern**
```typescript
// components/MyCard.tsx
import { cn } from "@/lib/utils"
import React from "react"

interface MyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  testId?: string
}

interface MyCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  testId?: string
}

interface MyCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  testId?: string
}

interface MyCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  testId?: string
}

// Main Card component
const MyCard = React.forwardRef<HTMLDivElement, MyCardProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      data-testid={testId}
      {...props}
    />
  )
)

// Card sub-components
const MyCardHeader = React.forwardRef<HTMLDivElement, MyCardHeaderProps>(\n  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      data-testid={testId}
      {...props}
    />
  )
)

const MyCardContent = React.forwardRef<HTMLDivElement, MyCardContentProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      data-testid={testId}
      {...props}
    />
  )
)

const MyCardFooter = React.forwardRef<HTMLDivElement, MyCardFooterProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      data-testid={testId}
      {...props}
    />
  )
)

// Set display names for better debugging
MyCard.displayName = "MyCard"
MyCardHeader.displayName = "MyCardHeader"
MyCardContent.displayName = "MyCardContent"
MyCardFooter.displayName = "MyCardFooter"

// Export compound component
export {
  MyCard,
  MyCardHeader,
  MyCardContent,
  MyCardFooter,
  type MyCardProps,
  type MyCardHeaderProps,
  type MyCardContentProps,
  type MyCardFooterProps,
}
```

### Configuration Files

#### Complete Tailwind Configuration
```javascript
// tailwind.config.js
/ ** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        card: "oklch(var(--card))",
        "card-foreground": "oklch(var(--card-foreground))",
        popover: "oklch(var(--popover))",
        "popover-foreground": "oklch(var(--popover-foreground))",
        primary: "oklch(var(--primary))",
        "primary-foreground": "oklch(var(--primary-foreground))",
        secondary: "oklch(var(--secondary))",
        "secondary-foreground": "oklch(var(--secondary-foreground))",
        muted: "oklch(var(--muted))",
        "muted-foreground": "oklch(var(--muted-foreground))",
        accent: "oklch(var(--accent))",
        "accent-foreground": "oklch(var(--accent-foreground))",
        destructive: "oklch(var(--destructive))",
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",
        // Brand colors
        silver: "rgb(var(--color-silver) / <alpha-value>)",
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
        orange: "rgb(var(--color-orange) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"],
        mono: ["Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xs": ["0.5rem", { lineHeight: "0.75rem" }],
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        footer: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
        header: "9999",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
}
```

#### Complete Global Styles
```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tailwind v3: remove v4 @theme; fonts are configured via next/font */

@layer base {
  :root {
    /* Brand colors - RGB values for alpha support */
    --color-silver: 248 248 248; /* #f8f8f8 */
    --color-charcoal: 33 33 33; /* #212121 */
    --color-orange: 255 122 0; /* #ff7a00 */

    /* Z-index scale for consistent layering */
    --z-dropdown: 1000;
    --z-sticky: 1020;
    --z-footer: 9998;
    --z-fixed: 1030;
    --z-modal-backdrop: 1040;
    --z-modal: 1050;
    --z-popover: 1060;
    --z-tooltip: 1070;
    --z-header: 9999;
  }

  .dark {
    /* Dark theme brand colors - adjust for contrast */
    --color-charcoal: 24 24 24; /* Darker for dark mode */
    --color-orange: 255 150 60; /* Warmer accent in dark */
  }

  /* Base typography styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    @apply font-sans font-bold tracking-tight;
  }

  /* Prose styling with brand colors */
  .prose {
    @apply max-w-none dark:prose-invert prose-sm md:prose-base;
  }

  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4,
  .prose h5,
  .prose h6 {
    @apply font-sans;
  }

  .prose h1 {
    @apply text-3xl md:text-4xl;
  }

  .prose h2 {
    @apply text-2xl md:text-3xl;
  }

  .prose p {
    @apply font-serif;
  }

  /* Code blocks */
  .prose pre {
    @apply bg-[#111] text-silver border border-white/10 rounded-lg px-4 py-3 font-mono;
  }

  .prose code {
    @apply bg-orange/10 text-charcoal dark:text-silver rounded px-1 py-0.5 text-sm font-mono;
  }

  .prose pre code {
    @apply bg-transparent text-silver p-0;
  }

  /* Brand color utilities */
  .text-brand {
    @apply text-charcoal dark:text-silver;
  }

  .text-muted {
    @apply text-charcoal/60 dark:text-silver/60;
  }

  .text-subtle {
    @apply text-charcoal/40 dark:text-silver/40;
  }

  .bg-brand {
    @apply bg-silver dark:bg-charcoal;
  }

  .bg-elevated {
    @apply bg-white dark:bg-charcoal/50;
  }

  .border-brand {
    @apply border-charcoal/20 dark:border-white/20;
  }

  .border-subtle {
    @apply border-charcoal/5 dark:border-white/5;
  }

  /* Link styling */
  .link-brand {
    @apply text-orange hover:underline underline-offset-4 hover:opacity-80;
  }

  .link-brand-subtle {
    @apply text-orange/90 hover:text-orange underline underline-offset-4 decoration-orange/40 hover:decoration-orange/60;
  }

  /* Inline emphasis */
  .emphasis-brand {
    @apply bg-orange/10 text-charcoal dark:text-silver rounded px-1;
  }

  /* Dividers */
  .divider-brand {
    @apply border-t border-charcoal/20 dark:border-white/20;
  }

  /* Focus states */
  .focus-ring {
    @apply outline-none ring-2 ring-orange/70 ring-offset-2 ring-offset-silver dark:ring-offset-charcoal;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Base layout */
  body {
    min-height: 100vh;
    overflow-x: hidden;
  }

  body {
    color: var(--foreground);
    background: radial-gradient(
      ellipse at top,
      var(--gradient-start) 0%,
      var(--gradient-end) 100%
    );
    background-attachment: fixed;
    @apply font-sans;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }

  /* Utility for isolation when we need a new stacking context */
  .isolation-isolate {
    isolation: isolate;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  @media (prefers-color-scheme: dark) {
    html {
      color-scheme: dark;
    }
  }
}

/* Modern theme system using OKLCH color space */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Gradient variables for subtle background depth */
  --gradient-start: oklch(0.99 0 0);
  --gradient-end: oklch(0.97 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.3 0 0);
  --input: oklch(0.25 0 0);
  --ring: oklch(0.556 0 0);

  /* Dark mode gradient */
  --gradient-start: oklch(0.16 0 0);
  --gradient-end: oklch(0.145 0 0);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply text-foreground;
  }
}
```

#### Theme Provider Setup
```typescript
// components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

#### Utility Functions
```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Additional utility functions
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}
```

### Testing Guidelines

```typescript
// Component test structure
import { render, screen } from "@testing-library/react"
import { MyComponent } from "./MyComponent"

describe("MyComponent", () => {
  it("renders with default props", () => {
    render(<MyComponent testId="my-component">Content</MyComponent>)

    const component = screen.getByTestId("my-component")
    expect(component).toBeInTheDocument()
    expect(component).toHaveTextContent("Content")
  })

  it("applies variant classes correctly", () => {
    render(<MyComponent variant="primary" testId="primary-component">Content</MyComponent>)

    const component = screen.getByTestId("primary-component")
    expect(component).toHaveClass("bg-primary", "text-primary-foreground")
  })

  it("handles click events", () => {
    const handleClick = vi.fn()
    render(
      <MyComponent onClick={handleClick} testId="clickable-component">
        Click me
      </MyComponent>
    )

    const component = screen.getByTestId("clickable-component")
    component.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("supports custom className", () => {
    render(
      <MyComponent className="custom-class" testId="custom-component">
        Content
      </MyComponent>
    )

    const component = screen.getByTestId("custom-component")
    expect(component).toHaveClass("custom-class")
  })
})

// Testing compound components
```
---

## 📋 Checklist for New Projects

### Setup Phase
- [ ] Initialize Next.js project with TypeScript
- [ ] Install required dependencies (Tailwind, shadcn/ui, fonts)
- [ ] Configure Tailwind with theme system
- [ ] Set up global CSS with theme variables
- [ ] Configure font loading (Montserrat, Merriweather, Fira Code)
- [ ] Set up theme provider for dark mode

### Component Development
- [ ] Create base component types and utilities
- [ ] Implement core UI components (Button, Card, etc.)
- [ ] Build layout components
- [ ] Create specialized components for domain
- [ ] Ensure all components support theming
- [ ] Add proper TypeScript types and JSDoc
- [ ] Include testId props for testing
- [ ] Implement focus management and accessibility

### Quality Assurance
- [ ] All components use theme tokens (no hardcoded colors)
- [ ] Typography follows established hierarchy
- [ ] Spacing uses Tailwind scale consistently
- [ ] Components are keyboard accessible
- [ ] Color contrast meets WCAG standards
- [ ] Responsive design works across breakpoints
- [ ] Dark mode support is complete
- [ ] Components have comprehensive tests

### Documentation
- [ ] Component usage guidelines documented
- [ ] Props and variants clearly explained
- [ ] Code examples provided
- [ ] Accessibility considerations noted
- [ ] Migration guide for updates

---

## 🚀 Migration & Maintenance

### Updating the System
1. **Color Changes**: Modify CSS custom properties in globals.css
2. **Typography**: Update font families or sizes in tailwind.config.js
3. **Components**: Extend existing variants or add new component types
4. **Spacing**: Adjust Tailwind configuration if needed

### Version Compatibility
- **Next.js**: Compatible with 13+ (App Router)
- **React**: Works with 18+ (including React 19)
- **Tailwind**: Requires 3.0+ with CSS variables support
- **shadcn/ui**: Latest version recommended

### Performance Considerations
- CSS custom properties enable efficient theme switching
- Component variants use CSS classes for optimal performance
- Tree-shakable imports reduce bundle size
- Minimal runtime overhead for theme system

---

This design system provides a solid foundation for building consistent, accessible, and maintainable web applications. The modular architecture allows for easy customization while maintaining design consistency across projects.
