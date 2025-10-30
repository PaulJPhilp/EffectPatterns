import * as React from "react";

type Variant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "bg-gray-900 text-white",
  secondary: "bg-gray-100 text-gray-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-gray-200 text-gray-800",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}


