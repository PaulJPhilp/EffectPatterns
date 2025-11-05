# LLM-UI Integration Plan

## Overview
Integration of [llm-ui](https://github.com/richardgill/llm-ui) for enhanced LLM response rendering with:
- Markdown support with custom styling
- Code blocks with syntax highlighting
- JSON and CSV rendering
- Custom component support
- Structured content parsing

## Current Status

### Current Implementation
- **Response Renderer**: Streamdown (lightweight markdown renderer)
- **File**: `components/elements/response.tsx`
- **Status**: ✅ Working with all features

### Attempted Integration
- Tried to integrate `@llm-ui/react` with `@llm-ui/markdown` and `@llm-ui/code`
- **Blocker**: React 19 peer dependency mismatch
  - App uses React 19.0.0-rc
  - llm-ui expects React 18.x
  - Resolved when React 19 becomes the stable release

## Integration Plan

### Phase 1: Wait for React 19 Stable
- React 19 currently in release candidate
- llm-ui will add React 19 support after stable release
- Target: Q4 2025 or later

### Phase 2: Install Dependencies
```bash
bun add @llm-ui/react@latest @llm-ui/markdown@latest @llm-ui/code@latest
```

### Phase 3: Update Response Component
```tsx
import { LLMOutput } from "@llm-ui/react";
import { Markdown } from "@llm-ui/markdown";
import { Code } from "@llm-ui/code";

export const Response = memo(
  ({ className, children, ...props }: ResponseProps) => {
    if (typeof children === "string") {
      return (
        <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
          <LLMOutput>
            {children}
            {({ hasFinished }) => (
              <>
                <Markdown />
                <Code />
              </>
            )}
          </LLMOutput>
        </div>
      );
    }
    return <Streamdown {...props}>{children}</Streamdown>;
  }
);
```

### Phase 4: Add Custom Components (Optional)
- Buttons for actions
- CSV table rendering
- Custom JSON viewers
- Pattern-specific components

## Benefits

✨ **Better Rendering**
- Professional markdown output
- Syntax-highlighted code
- Better mobile support
- Custom styling flexibility

📊 **Structured Data**
- JSON blocks
- CSV tables
- Custom component support

🎨 **Styling**
- Full Tailwind integration
- Dark mode support
- Custom themes

## Alternatives Considered

1. **Remark/Rehype** - More control, larger bundle
2. **MDXRemote** - Runtime compilation overhead
3. **Custom Renderer** - More development work

## Implementation Order

1. ✅ Current: Streamdown (working baseline)
2. ⏳ Future: llm-ui (when React 19 stable)
3. Optional: Custom components (if needed)

## Notes

- Current Streamdown implementation is solid and sufficient
- No rush to migrate until React 19 stabilizes
- Can toggle between renderers with feature flag if needed
- Consider performance implications for large responses
