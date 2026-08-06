import type { HTMLAttributes } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const classes = ['card', className].filter(Boolean).join(' ')

  return <section className={classes} {...props} />
}
