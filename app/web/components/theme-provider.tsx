"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import * as React from "react";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemeProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
            {children}
        </NextThemeProvider>
    );
}
