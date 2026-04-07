import React from "react";
import { cn } from "@/lib/utils";

// Terminal specific UI components
export function TWindow({ children, title, className }: { children: React.ReactNode, title?: string, className?: string }) {
  return (
    <div className={cn("border border-primary/50 bg-background/95 shadow-lg shadow-primary/10 relative overflow-hidden backdrop-blur-sm", className)}>
      {title && (
        <div className="border-b border-primary/50 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-primary/50 block"></span>
            <span className="w-2 h-2 bg-primary/50 block"></span>
            <span className="w-2 h-2 bg-primary/50 block"></span>
          </div>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function TButton({ children, onClick, variant = 'primary', className, disabled, type = 'button' }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'outline' | 'ghost' | 'destructive', className?: string, disabled?: boolean, type?: 'button' | 'submit' | 'reset' }) {
  
  const baseClasses = "px-4 py-2 text-sm uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_10px_rgba(0,255,0,0.5)] border border-primary font-bold",
    outline: "bg-transparent border border-primary text-primary hover:bg-primary/10",
    ghost: "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive shadow-[0_0_10px_rgba(255,0,0,0.3)] font-bold",
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(baseClasses, variants[variant], className)}>
      <span className="select-none">{children}</span>
    </button>
  );
}

export function TBadge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'destructive', className?: string }) {
  const variants = {
    default: "border-primary/30 text-primary/80 bg-primary/5",
    success: "border-primary text-primary bg-primary/10",
    warning: "border-accent text-accent bg-accent/10",
    destructive: "border-destructive text-destructive bg-destructive/10",
  };

  return (
    <span className={cn("px-2 py-0.5 text-xs uppercase border flex items-center gap-1", variants[variant], className)}>
      {children}
    </span>
  );
}

export function TInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={cn("bg-background border border-primary/30 px-3 py-2 text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 w-full transition-all", className)} 
      {...props} 
    />
  );
}
