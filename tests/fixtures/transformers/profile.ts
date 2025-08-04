import { BaseTransformer } from '../../../src/base_transformer.js'
import { type Profile } from '../models/profile.js'
import { EmailTransformer } from './email.js'
import { UserTransformer } from './user.js'

export class ProfileTransformer extends BaseTransformer<Profile> {
  toObject() {
    return {
      id: 1,
      twitterHandle: this.resource.twitterHandle,
      githubUsername: this.resource.githubUsername,
      user: this.when(this.resource.user !== undefined, () =>
        UserTransformer.item(this.resource.user)
      ),
      emails: EmailTransformer.collection(this.resource.emails),
    }
  }
}
