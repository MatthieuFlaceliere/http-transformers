import { type User } from './user.js'

export class Post {
  declare id: number
  declare title: string
  declare content: string
  declare author?: User
}
