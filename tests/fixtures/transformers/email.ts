import { type Email } from '../models/email.ts'
import { UserTransformer } from './user.ts'
import { ProfileTransformer } from './profile.ts'
import { BaseTransformer } from '../../../src/base_transformer.ts'

export class EmailTransformer extends BaseTransformer<Email> {
  async toObject() {
    return {
      id: 1,
      email: 'foo@bar.com',
      is_verified: false,
      user: UserTransformer.transform(this.resource.user),
      profile: ProfileTransformer.transform(this.resource.profile),
    }
  }
}
