"use client";

import React, { ReactNode, HTMLAttributes } from "react";

// Main Dialog wrapper
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // This is a simple controlled dialog, you can expand with animations later
  return open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  ) : null;
}

// DialogContent with full HTML div flexibility
interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DialogContent({ children, className = "", ...rest }: DialogContentProps) {
  return (
    <div
      className={`bg-background rounded-lg p-6 shadow-lg max-w-lg w-full ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// DialogHeader container
interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DialogHeader({ children, className = "", ...rest }: DialogHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

// DialogTitle
interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function DialogTitle({ children, className = "", ...rest }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold ${className}`} {...rest}>
      {children}
    </h2>
  );
}

// DialogDescription
interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function DialogDescription({ children, className = "", ...rest }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...rest}>
      {children}
    </p>
  );
}
