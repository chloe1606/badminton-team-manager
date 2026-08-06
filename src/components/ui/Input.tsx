import type { InputHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const classes = ['input', className].filter(Boolean).join(' ')

  return <input className={classes} {...props} />
}
