import { type Email } from './email.js'
import type { User } from './user.js'

export class Profile {
  declare id: number
  twitterHandle: string | null = null
  githubUsername: string | null = null
  declare user: User
  declare emails: Email[]
}
