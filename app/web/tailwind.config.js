/** @type {import('tailwindcss').Config} */
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
        silver: "rgb(var(--color-silver) / <alpha-value>)",
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
        orange: "rgb(var(--color-orange) / <alpha-value>)",
        diagram: {
          line: "rgb(var(--color-charcoal) / 1)",
          subtle: "rgb(var(--color-charcoal) / 0.6)",
          accent: "rgb(var(--color-orange) / 1)",
          bg: "rgb(var(--color-silver) / 1)",
        },
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
      fluidTypography: {
        h1: {
          min: "2.5rem",
          max: "5rem",
        },
        h2: {
          min: "2rem",
          max: "4rem",
        },
        h3: {
          min: "1.5rem",
          max: "3rem",
        },
        h4: {
          min: "1.25rem",
          max: "2.5rem",
        },
        h5: {
          min: "1rem",
          max: "2rem",
        },
        h6: {
          min: "0.875rem",
          max: "1.5rem",
        },
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
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
    // Note: tailwindcss-fluid-typography disabled (incompatible with Tailwind 4.1)
    // Use manual fluid typography with Tailwind's native viewport-relative sizing
  ],
};
