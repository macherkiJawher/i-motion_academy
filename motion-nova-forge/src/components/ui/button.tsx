import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        electric:
          "bg-[image:var(--gradient-electric)] bg-[length:200%_200%] text-primary-foreground font-semibold shadow-[0_16px_50px_-16px_color-mix(in_oklab,var(--electric)_85%,transparent)] hover:bg-[position:100%_50%] hover:shadow-[0_22px_70px_-14px_color-mix(in_oklab,var(--electric)_95%,transparent)]",
        glass:
          "glass text-foreground hover:border-electric/50 hover:shadow-[0_0_38px_-8px_color-mix(in_oklab,var(--electric)_70%,transparent)]",
        outlineGlow:
          "border border-electric/45 text-electric hover:bg-electric/10 hover:shadow-[0_0_34px_-10px_color-mix(in_oklab,var(--electric)_90%,transparent)]",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "border border-input bg-transparent hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-secondary/60 hover:text-foreground",
        link: "text-electric underline-offset-4 hover:underline rounded-md",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-9 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
