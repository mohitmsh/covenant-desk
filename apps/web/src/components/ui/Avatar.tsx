import { initials } from "@/utils/format"
import styles from "./Avatar.module.css"

interface AvatarProps {
  readonly name: string
}

export function Avatar({ name }: AvatarProps) {
  return (
    <span className={styles.avatar} title={name} aria-hidden>
      {initials(name)}
    </span>
  )
}
