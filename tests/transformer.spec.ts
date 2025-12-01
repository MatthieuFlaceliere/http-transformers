/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Container, inject } from '@adonisjs/fold'

import { serialize } from '../src/serialize.ts'
import { BaseTransformer } from '../src/base_transformer.ts'

test.group('Transformer', () => {
  test('throw error when value is null', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await serialize(UserTransformer.transform(null)!)
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  }).throws('Cannot serialize an item with null value')

  test('throw error when value is undefined', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await serialize(UserTransformer.transform(undefined as any)!)
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('allow null values as a value of a top-level object', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await serialize({
      user: UserTransformer.transform(null),
    })

    assert.deepEqual(userData, { user: null })
    expectTypeOf(userData).toEqualTypeOf<{
      user: {
        id: number
        fullName: string | null
        email: string
      } | null
    }>()
  })

  test('throw error when value is undefined', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await serialize(UserTransformer.transform(undefined as any)!)
    expectTypeOf(userData).toEqualTypeOf<{ id: number; fullName: string | null; email: string }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('transform a value using a transformer', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, { id: 1, fullName: null, email: 'foo@bar.com' })
    expectTypeOf(userData).toEqualTypeOf<{ id: number; fullName: string | null; email: string }>()
  })

  test('transform with relationships', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          user: UserTransformer.transform(this.resource.user),
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails: { id: number; email: string; isVerified: boolean }[]
    }>()
  })

  test('transform as a collection', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform([user]))
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
        emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
      },
    ])
    expectTypeOf(userData).toEqualTypeOf<
      {
        id: number
        fullName: string | null
        emails: { id: number; email: string; isVerified: boolean }[]
      }[]
    >()
  })

  test('throw error when required relationship data is missing', async () => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    await serialize(UserTransformer.transform(user))
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('do not throw error when collection data is undefined and marked as optional', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails)),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: undefined,
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?: { id: number; email: string; isVerified: boolean }[] | undefined
    }>()
  })

  test('do not throw error when item data is undefined but depth not reachable', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails)),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?: { id: number; email: string; isVerified: boolean }[] | undefined
    }>()
  })

  test('throw error when item is undefined and depth is reachable', async ({ expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails))?.depth(2),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform(user))

    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?:
        | {
            id: number
            email: string
            isVerified: boolean
            user: {
              id: number
              fullName: string | null
            }
          }[]
        | undefined
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('resolve circular references upto 6 levels deep', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails))?.depth(6),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true
    email.user = user

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform(user))
    assert.snapshot(userData).matchInline(`
      {
        "emails": [
          {
            "email": "foo@bar.com",
            "id": 1,
            "isVerified": true,
            "user": {
              "emails": [
                {
                  "email": "foo@bar.com",
                  "id": 1,
                  "isVerified": true,
                  "user": {
                    "emails": [
                      {
                        "email": "foo@bar.com",
                        "id": 1,
                        "isVerified": true,
                        "user": {
                          "fullName": null,
                          "id": 1,
                        },
                      },
                    ],
                    "fullName": null,
                    "id": 1,
                  },
                },
              ],
              "fullName": null,
              "id": 1,
            },
          },
        ],
        "fullName": null,
        "id": 1,
      }
    `)
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?:
        | {
            id: number
            email: string
            isVerified: boolean
            user: {
              id: number
              fullName: string | null
              emails?:
                | {
                    id: number
                    email: string
                    isVerified: boolean
                    user: {
                      id: number
                      fullName: string | null
                      emails?:
                        | {
                            id: number
                            email: string
                            isVerified: boolean
                            user: {
                              id: number
                              fullName: string | null
                            }
                          }[]
                        | undefined
                    }
                  }[]
                | undefined
            }
          }[]
        | undefined
    }>()
  })

  test('allow null value for items', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }
    class User {
      declare id: number
      declare fullName: string | null
      declare email: Email | null
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: EmailTransformer.transform(this.resource.email),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = null

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, { id: 1, fullName: null, email: null })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: {
        id: number
        email: string
        isVerified: boolean
      } | null
    }>()
  })

  test('throw error when item value is undefined', async ({ expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }
    class User {
      declare id: number
      declare fullName: string | null
      declare email: Email | null
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: EmailTransformer.transform(this.resource.email),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await serialize(UserTransformer.transform(user))
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: {
        id: number
        email: string
        isVerified: boolean
      } | null
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('transform as item', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, { id: 1, fullName: null, email: 'foo@bar.com' })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  })

  test('transform as collection', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(UserTransformer.transform([user]))
    assert.deepEqual(userData, [{ id: 1, fullName: null, email: 'foo@bar.com' }])
    expectTypeOf(userData).toEqualTypeOf<
      {
        id: number
        fullName: string | null
        email: string
      }[]
    >()
  })

  test('transform using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await serialize(UserTransformer.transform(user).useVariant('basicInfo'))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
    }>()
  })

  test('transform as item using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await serialize(UserTransformer.transform(user).useVariant('basicInfo'))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
    })

    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
    }>()
  })

  test('transform as collection using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await serialize(UserTransformer.transform([user]).useVariant('basicInfo'))
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
      },
    ])
    expectTypeOf(userData).toEqualTypeOf<
      {
        id: number
        fullName: string | null
      }[]
    >()
  })

  test('inject dependencies to the toObject method', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class Logger {
      level: string = 'info'
    }

    class UserTransformer extends BaseTransformer<User> {
      @inject()
      toObject(logger: Logger) {
        return {
          id: this.resource.id,
          loggingLevel: logger.level,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const container = new Container().createResolver()
    container.bindValue(Logger, new Logger())
    const userData = await serialize(
      UserTransformer.transform(user).useVariant('toObject'),
      container
    )

    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      email: 'foo@bar.com',
      loggingLevel: 'info',
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
      loggingLevel: string
    }>()
  })

  test('pick and omit values', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return this.pick(this.resource, ['id', 'email'])
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          ...this.omit(this.resource, ['emails']),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await serialize(UserTransformer.transform(user))
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com' }],
    })
    expectTypeOf(userData).toEqualTypeOf<{
      id: number
      fullName: string | null
      emails: { id: number; email: string }[]
    }>()
  })

  test('transform as paginator', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(
      UserTransformer.paginate([user], {
        total: 1,
        currentPage: 1,
      })
    )
    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      total: 1,
      currentPage: 1,
    })
    expectTypeOf(userData).toEqualTypeOf<{
      meta: {
        total: number
        currentPage: number
      }
      data: {
        id: number
        fullName: string | null
        email: string
      }[]
    }>()
  })

  test('set metadata', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(
      UserTransformer.paginate([user], {}).setMetaData({
        total: 10,
        currentPage: 1,
        lastPage: 1,
      })
    )

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      currentPage: 1,
      lastPage: 1,
      total: 10,
    })
    expectTypeOf(userData).toEqualTypeOf<{
      meta: {
        total: number
        currentPage: number
        lastPage: number
      }
      data: {
        id: number
        fullName: string | null
        email: string
      }[]
    }>()
  })

  test('compute metadata', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await serialize(
      UserTransformer.paginate([user], {
        total: 10,
        currentPage: 1,
      }).setMetaData((metaData) => {
        return {
          ...metaData,
          lastPage: 1,
        }
      })
    )

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      currentPage: 1,
      lastPage: 1,
      total: 10,
    })
    expectTypeOf(userData).toEqualTypeOf<{
      meta: {
        total: number
        currentPage: number
        lastPage: number
      }
      data: {
        id: number
        fullName: string | null
        email: string
      }[]
    }>()
  })

  test('return non-serializable values as it is', async ({ assert, expectTypeOf }) => {
    const userData = await serialize([1, 2, 3] as const)
    expectTypeOf(userData).toEqualTypeOf<readonly [1, 2, 3]>()
    assert.deepEqual(userData, [1, 2, 3])
  })
})
