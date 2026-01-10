/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { inject } from '@adonisjs/fold'
import { type InferData } from '../src/types.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import { apiSerializer, container, wrappedApiSerializer } from './helpers.ts'

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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(null)!,
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(undefined as any)!,
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      {
        user: UserTransformer.transform(null),
      },
      container.createResolver()
    )

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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(undefined as any)!,
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
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

    await apiSerializer.serialize(UserTransformer.transform(user), container.createResolver())
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )

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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('basicInfo'),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('basicInfo'),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]).useVariant('basicInfo'),
      container.createResolver()
    )
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

    const resolver = container.createResolver()
    resolver.bindValue(Logger, new Logger())
    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('toObject'),
      resolver
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
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

    const userData = await apiSerializer.serialize(
      UserTransformer.paginate([user], {
        total: 1,
        currentPage: 1,
      }),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      metadata: {
        total: 1,
        currentPage: 1,
      },
    })
    expectTypeOf(userData).toEqualTypeOf<{
      data: {
        id: number
        fullName: string | null
        email: string
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('return non-serializable values as it is', async ({ assert, expectTypeOf }) => {
    const userData = await apiSerializer.serialize([1, 2, 3] as const, container.createResolver())
    expectTypeOf(userData).toEqualTypeOf<readonly [1, 2, 3]>()
    assert.deepEqual(userData, [1, 2, 3])
  })

  test('pass additional parameters to the transformer constructor', async ({
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
      constructor(
        email: Email,
        protected sendVerificationTick: boolean
      ) {
        super(email)
      }

      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          ...(this.sendVerificationTick ? { isVerified: this.resource.isVerified } : {}),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails, false),
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

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
        emails: [{ id: 1, email: 'foo@bar.com' }],
      },
    ])
    expectTypeOf(userData).toEqualTypeOf<
      {
        id: number
        fullName: string | null
        emails: { id: number; email: string; isVerified?: boolean | undefined }[]
      }[]
    >()
  })

  test('pass additional parameters to the transformer constructor during pagination', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class EmailTransformer extends BaseTransformer<Email> {
      constructor(
        email: Email,
        protected sendVerificationTick: boolean
      ) {
        super(email)
      }

      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          ...(this.sendVerificationTick ? { isVerified: this.resource.isVerified } : {}),
        }
      }
    }

    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    const emailData = await apiSerializer.serialize(
      EmailTransformer.paginate([email], {}, true),
      container.createResolver()
    )
    assert.deepEqual(emailData, {
      data: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
      metadata: {},
    })
    expectTypeOf(emailData).toEqualTypeOf<{
      data: {
        id: number
        email: string
        isVerified?: boolean | undefined
      }[]
      metadata: Record<string, any>
    }>()
  })
})

test.group('Transformer | wrapping', () => {
  test('transform and wrap an item value', async ({ assert, expectTypeOf }) => {
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

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }
    }>()
    expectTypeOf(userData).toEqualTypeOf<{ data: UserData }>()

    assert.deepEqual(userData, { data: { id: 1, fullName: null, email: 'foo@bar.com' } })
  })

  test('transform and wrap a collection value', async ({ assert, expectTypeOf }) => {
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

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{ data: UserData[] }>()
    expectTypeOf(userData).toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }[]
    }>()

    assert.deepEqual(userData, { data: [{ id: 1, fullName: null, email: 'foo@bar.com' }] })
  })

  test('transform and wrap a paginator value', async ({ assert, expectTypeOf }) => {
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

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.paginate([user], {}),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData.data).toEqualTypeOf<UserData[]>()
    expectTypeOf(userData).toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }[]
      metadata: {
        currentPage: number
        totalItems: number
      }
    }>()

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      metadata: {
        currentPage: 10,
        totalItems: 10,
      },
    })
  })

  test('do and wrap on top-level resources', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class Post {
      declare id: number
      declare title: string
      declare user: User
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

    class PostTransformer extends BaseTransformer<Post> {
      toObject() {
        return {
          id: this.resource.id,
          title: this.resource.title,
          author: UserTransformer.transform(this.resource.user),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const post = new Post()
    post.id = 1
    post.title = 'hello world'
    post.user = user

    const postData = await wrappedApiSerializer.serialize(
      PostTransformer.transform(post),
      container.createResolver()
    )
    type PostData = InferData<PostTransformer>

    expectTypeOf(postData.data).toEqualTypeOf<PostData>()
    expectTypeOf(postData).toEqualTypeOf<{
      data: {
        id: number
        title: string
        author: { id: number; fullName: string | null; email: string }
      }
    }>()
    assert.deepEqual(postData, {
      data: {
        id: 1,
        title: 'hello world',
        author: {
          id: 1,
          fullName: null,
          email: 'foo@bar.com',
        },
      },
    })
  })
})
