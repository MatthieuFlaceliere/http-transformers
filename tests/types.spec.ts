/*
 * @adonisjs/http
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../src/debug.js'
import { type InferData } from '../src/types.js'
import { transform } from '../src/transform.js'
import { User } from './fixtures/models/user.js'
import { Post } from './fixtures/models/posts.js'
import { Email } from './fixtures/models/email.js'
import { Profile } from './fixtures/models/profile.js'
import { PostTransformer } from './fixtures/transformers/post.js'
import { UserTransformer } from './fixtures/transformers/user.js'
import { EmailTransformer } from './fixtures/transformers/email.js'
import { ProfileTransformer } from './fixtures/transformers/profile.js'
import { BaseTransformer } from '../src/base_transformer.js'

test.group('Types', () => {
  test('infer nested objects and arrays', async ({ expectTypeOf }) => {
    class ExampleTransformer extends BaseTransformer<{}> {
      toObject() {
        return {
          id: 1,
          profile: {
            id: 1,
            emails: [
              {
                id: 1,
                email: 'foo@bar.com',
              },
            ],
          },
          can: {
            edit: true,
            create: true,
          },
        }
      }
    }

    const exampleTransformer = new ExampleTransformer({})
    const exampleDataObject = await transform({}, ExampleTransformer)
    type ExampleData = InferData<typeof exampleTransformer>
    debug('%O', exampleDataObject)

    expectTypeOf<ExampleData>().toEqualTypeOf<{
      id: number
      profile: {
        id: number
        emails: { id: number; email: string }[]
      }
      can: {
        create: boolean
        edit: boolean
      }
    }>()
    expectTypeOf(exampleDataObject).toEqualTypeOf<ExampleData>()
  })
})

test.group('Types | Fixtures', () => {
  test('infer graph of post transformer', async ({ expectTypeOf }) => {
    const post = new Post()
    const postTransformer = new PostTransformer(post)
    const postDataObject = await transform(post, PostTransformer)

    type PostData = InferData<typeof postTransformer>
    debug('%O', postDataObject)

    expectTypeOf<PostData>().toEqualTypeOf<{
      id: number
      title: string
      config: { hello: string } | boolean
      can: {
        create: boolean
        edit: boolean
        remove: boolean
      }
      author:
        | {
            id: number
            name: string
            profile?:
              | {
                  id: number
                  twitterHandle: string | null
                  githubUsername: string | null
                }
              | undefined
            posts: {
              id: number
              title: string
              config: { hello: string } | boolean
              can: {
                create: boolean
                edit: boolean
                remove: boolean
              }
            }[]
          }
        | { isGuest: boolean }
        | null
    }>()

    expectTypeOf(postDataObject).toEqualTypeOf<PostData>()
  })

  test('infer graph of user transformer', async ({ expectTypeOf }) => {
    const user = new User()
    const email = new Email()
    user.profile = new Profile()
    user.profile.user = user

    email.user = user
    email.profile = user.profile
    user.profile.emails = [email]
    user.posts = [new Post()]

    const userTransformer = new UserTransformer(user)
    const userDataObject = await transform(user, UserTransformer)
    type UserData = InferData<typeof userTransformer>

    debug('%o', userDataObject)

    expectTypeOf<UserData>().toEqualTypeOf<{
      id: number
      name: string
      profile?:
        | {
            id: number
            twitterHandle: string | null
            githubUsername: string | null
            user?:
              | {
                  id: number
                  name: string
                }
              | undefined
              | null
            emails: {
              id: number
              email: string
              is_verified: boolean
            }[]
          }
        | undefined
      posts: {
        id: number
        title: string
        config: { hello: string } | boolean
        can: {
          create: boolean
          edit: boolean
          remove: boolean
        }
        author:
          | {
              id: number
              name: string
            }
          | { isGuest: boolean }
          | null
      }[]
    }>()
    expectTypeOf(userDataObject).toEqualTypeOf<UserData>()
  })

  test('infer graph of profile transformer', async ({ expectTypeOf }) => {
    const profile = new Profile()
    const email = new Email()
    profile.user = new User()

    email.user = profile.user
    email.profile = profile
    profile.emails = [email]
    profile.user.posts = [new Post()]

    const profileTransformer = new ProfileTransformer(profile)
    const profileDataObject = await transform(profile, ProfileTransformer)
    type ProfileData = InferData<typeof profileTransformer>

    debug('%O', profileDataObject)

    expectTypeOf<ProfileData>().toEqualTypeOf<{
      id: number
      twitterHandle: string | null
      githubUsername: string | null
      user?:
        | {
            id: number
            name: string
          }
        | null
        | undefined
      emails: {
        id: number
        email: string
        is_verified: boolean
      }[]
    }>()
    expectTypeOf(profileDataObject).toEqualTypeOf<ProfileData>()
  })

  test('infer graph of profile email transformer', async ({ expectTypeOf }) => {
    const profile = new Profile()
    const email = new Email()
    const user = new User()
    email.user = user
    email.profile = profile

    const emailTransformer = new EmailTransformer(email)
    const emailDataObject = await transform(email, EmailTransformer)
    type EmailData = InferData<typeof emailTransformer>

    debug('%o', emailDataObject)

    expectTypeOf<EmailData>().toEqualTypeOf<{
      id: number
      email: string
      is_verified: boolean
      user: {
        id: number
        name: string
      } | null
      profile: {
        id: number
        twitterHandle: string | null
        githubUsername: string | null
      } | null
    }>()
    expectTypeOf(emailDataObject).toEqualTypeOf<EmailData>()
  })
})
