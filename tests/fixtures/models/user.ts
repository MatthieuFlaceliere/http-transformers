import type { Post } from './posts.ts'
import type { Profile } from './profile.ts'

export class User {
  declare id: number
  declare email: string
  fullName: string | null = null
  declare password: string
  declare profile: Profile | null
  declare posts: Post[]
}
