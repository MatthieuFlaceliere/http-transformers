import { type Email } from './email.ts'
import type { User } from './user.ts'

export class Profile {
  declare id: number
  twitterHandle: string | null = null
  githubUsername: string | null = null
  declare user: User
  declare emails: Email[]
}
