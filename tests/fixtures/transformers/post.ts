import { type Post } from '../models/posts.js'
import { UserTransformer } from './user.js'
import { BaseTransformer } from '../../../src/base_transformer.js'

export class PostTransformer extends BaseTransformer<Post> {
  async toObject() {
    return {
      id: 1,
      title: this.resource.title,
      config:
        this.resource.id === 2
          ? {
              hello: 'world',
            }
          : false,
      can: {
        create: true,
        edit: true,
        remove: false,
      },
      author:
        this.resource.author !== undefined
          ? UserTransformer.item(this.resource.author).depth(2)
          : { isGuest: true },
    }
  }
}
