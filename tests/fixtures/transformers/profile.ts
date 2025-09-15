import { BaseTransformer } from '../../../src/base_transformer.ts'
import { type Profile } from '../models/profile.ts'
import { EmailTransformer } from './email.ts'
import { UserTransformer } from './user.ts'

export class ProfileTransformer extends BaseTransformer<Profile> {
  toObject() {
    return {
      id: 1,
      twitterHandle: this.resource.twitterHandle,
      githubUsername: this.resource.githubUsername,
      user: this.when(this.resource.user !== undefined, () =>
        UserTransformer.transform(this.resource.user)
      ),
      emails: EmailTransformer.transform(this.resource.emails),
    }
  }
}
