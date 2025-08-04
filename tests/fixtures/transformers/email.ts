import { type Email } from '../models/email.js'
import { UserTransformer } from './user.js'
import { ProfileTransformer } from './profile.js'
import { BaseTransformer } from '../../../src/base_transformer.js'

export class EmailTransformer extends BaseTransformer<Email> {
  async toObject() {
    return {
      id: 1,
      email: 'foo@bar.com',
      is_verified: false,
      user: UserTransformer.item(this.resource.user),
      profile: ProfileTransformer.item(this.resource.profile),
    }
  }
}
