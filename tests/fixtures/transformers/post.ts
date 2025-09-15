import { type Post } from '../models/posts.ts'
import { UserTransformer } from './user.ts'
import { BaseTransformer } from '../../../src/base_transformer.ts'

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
          ? UserTransformer.transform(this.resource.author).depth(2)
          : { isGuest: true },
    }
  }
}
