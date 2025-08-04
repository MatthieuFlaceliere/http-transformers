import { type User } from '../models/user.js'
import { PostTransformer } from './post.js'
import { ProfileTransformer } from './profile.js'
import { type ResourceData } from '../../../src/types.js'
import { BaseTransformer } from '../../../src/base_transformer.js'

export class UserTransformer extends BaseTransformer<User> {
  basicInfo() {
    return {
      id: this.resource.id,
      name: this.resource.fullName!,
      profile: ProfileTransformer.item(this.whenLoaded(this.resource.profile)),
    } satisfies ResourceData
  }

  async toObject() {
    return {
      ...this.omit(this.basicInfo(), ['profile']),
      profile: ProfileTransformer.item(this.whenLoaded(this.resource.profile))
        ?.depth(2)
        .notNullable(),
      posts: PostTransformer.collection(this.resource.posts).depth(2),
    } satisfies ResourceData
  }
}
