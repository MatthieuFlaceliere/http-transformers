import { type Profile } from './profile.ts'
import { type User } from './user.ts'

export class Email {
  declare id: number
  declare email: string
  declare isVerified: boolean
  declare user: User
  declare profile: Profile
}
