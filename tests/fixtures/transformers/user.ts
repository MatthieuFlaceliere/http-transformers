import { type User } from '../models/user.ts'
import { PostTransformer } from './post.ts'
import { ProfileTransformer } from './profile.ts'
import { type ResourceData } from '../../../src/types.ts'
import { BaseTransformer } from '../../../src/base_transformer.ts'

export class UserTransformer extends BaseTransformer<User> {
  basicInfo() {
    return {
      id: this.resource.id,
      name: this.resource.fullName!,
      profile: ProfileTransformer.transform(this.whenLoaded(this.resource.profile)),
    } satisfies ResourceData
  }

  async toObject() {
    return {
      ...this.omit(this.basicInfo(), ['profile']),
      profile: ProfileTransformer.transform(this.whenLoaded(this.resource.profile))?.depth(2),
      posts: PostTransformer.transform(this.whenLoaded(this.resource.posts))?.depth(2),
    } satisfies ResourceData
  }
}
