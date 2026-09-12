import type { ReactNode } from 'react'
import { INSTAGRAM_URL } from '../site'

type Props = {
  className?: string
  children?: ReactNode
}

export function InstagramLink({ className, children = 'Instagram' }: Props) {
  return (
    <a
      className={className}
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  )
}
