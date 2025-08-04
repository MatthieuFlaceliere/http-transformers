import { type Profile } from './profile.js'
import { type User } from './user.js'

export class Email {
  declare id: number
  declare email: string
  declare isVerified: boolean
  declare user: User
  declare profile: Profile
}
