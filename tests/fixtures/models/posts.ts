import { type User } from './user.ts'

export class Post {
  declare id: number
  declare title: string
  declare content: string
  declare author?: User
}
