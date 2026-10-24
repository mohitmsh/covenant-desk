import type { ButtonHTMLAttributes } from "react"
import styles from "./Button.module.css"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: "primary" | "secondary" | "ghost"
}

export function Button({ variant = "secondary", type = "button", className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      {...props}
    />
  )
}
