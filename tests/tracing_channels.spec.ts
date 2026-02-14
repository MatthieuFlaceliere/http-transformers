/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { tracingChannels } from '../index.ts'
import { apiSerializer, container } from './helpers.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import type { TransformerTracingData } from '../src/types.ts'

test.group('Tracing channels | transformerResolver', () => {
  test('should trace transformer resolution for single item', async ({ assert, cleanup }) => {
    const events: {
      start?: TransformerTracingData
      end?: TransformerTracingData
      asyncStart?: TransformerTracingData
      asyncEnd?: TransformerTracingData
      error?: TransformerTracingData
    } = {}

    class User {
      constructor(
        public id: number,
        public name: string
      ) {}
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        }
      }
    }

    const handlers = {
      start(data: TransformerTracingData) {
        events.start = data
      },
      end(data: TransformerTracingData) {
        events.end = data
      },
      asyncStart(data: TransformerTracingData) {
        events.asyncStart = data
      },
      asyncEnd(data: TransformerTracingData) {
        events.asyncEnd = data
      },
      error(data: TransformerTracingData) {
        events.error = data
      },
    }

    tracingChannels.transformerResolver.subscribe(handlers)
    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const user = new User(1, 'John Doe')
    const result = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )

    assert.deepEqual(result, {
      id: 1,
      name: 'John Doe',
    })

    assert.isDefined(events.start)
    assert.isDefined(events.end)
    assert.isDefined(events.asyncStart)
    assert.isDefined(events.asyncEnd)
    assert.isUndefined(events.error)

    assert.instanceOf(events.start!.transformer, UserTransformer)
    assert.equal(events.start!.variant, 'toObject')
    assert.equal(events.start!.depth, 0)
    assert.isUndefined(events.start!.maxDepth)

    assert.instanceOf(events.asyncEnd!.transformer, UserTransformer)
    assert.equal(events.asyncEnd!.variant, 'toObject')
    assert.equal(events.asyncEnd!.depth, 0)
    assert.isUndefined(events.asyncEnd!.maxDepth)
  })

  test('should trace transformer resolution with custom variant', async ({ assert, cleanup }) => {
    const events: {
      start?: TransformerTracingData
      end?: TransformerTracingData
      asyncStart?: TransformerTracingData
      asyncEnd?: TransformerTracingData
      error?: TransformerTracingData
    } = {}

    class User {
      constructor(
        public id: number,
        public name: string,
        public email: string
      ) {}
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
          email: this.resource.email,
        }
      }

      toSummary() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        }
      }
    }

    const handlers = {
      start(data: TransformerTracingData) {
        events.start = data
      },
      end(data: TransformerTracingData) {
        events.end = data
      },
      asyncStart(data: TransformerTracingData) {
        events.asyncStart = data
      },
      asyncEnd(data: TransformerTracingData) {
        events.asyncEnd = data
      },
      error(data: TransformerTracingData) {
        events.error = data
      },
    }

    tracingChannels.transformerResolver.subscribe(handlers)
    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const user = new User(1, 'John Doe', 'john@example.com')
    const result = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('toSummary'),
      container.createResolver()
    )

    assert.deepEqual(result, {
      id: 1,
      name: 'John Doe',
    })

    assert.equal(events.start?.variant, 'toSummary')
  })

  test('should trace nested transformer resolutions', async ({ assert, cleanup }) => {
    const events: {
      start?: TransformerTracingData
      end?: TransformerTracingData
      asyncStart?: TransformerTracingData
      asyncEnd?: TransformerTracingData
      error?: TransformerTracingData
    }[] = []

    class Profile {
      constructor(public bio: string) {}
    }

    class User {
      constructor(
        public id: number,
        public name: string,
        public profile: Profile
      ) {}
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
          profile: ProfileTransformer.transform(this.resource.profile),
        }
      }
    }

    const handlers = {
      start(data: TransformerTracingData) {
        events.push({ start: data })
      },
      end(_: TransformerTracingData) {},
      asyncStart(_: TransformerTracingData) {},
      asyncEnd(_: TransformerTracingData) {},
      error(_: TransformerTracingData) {},
    }

    tracingChannels.transformerResolver.subscribe(handlers)

    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const profile = new Profile('Software Developer')
    const user = new User(1, 'John Doe', profile)
    const result = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )

    assert.deepEqual(result, {
      id: 1,
      name: 'John Doe',
      profile: {
        bio: 'Software Developer',
      },
    })

    assert.instanceOf(events[0].start?.transformer, UserTransformer)
    assert.equal(events[0].start?.variant, 'toObject')
    assert.equal(events[0].start?.depth, 0)

    assert.instanceOf(events[1].start?.transformer, ProfileTransformer)
    assert.equal(events[1].start?.variant, 'toObject')
    assert.equal(events[1].start?.depth, 1)
  })

  test('should trace collection transformations', async ({ assert, cleanup }) => {
    const events: TransformerTracingData[] = []

    class User {
      constructor(
        public id: number,
        public name: string
      ) {}
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        }
      }
    }

    const handlers = {
      start(data: TransformerTracingData) {
        events.push(data)
      },
      end(_: TransformerTracingData) {},
      asyncStart(_: TransformerTracingData) {},
      asyncEnd(_: TransformerTracingData) {},
      error(_: TransformerTracingData) {},
    }

    tracingChannels.transformerResolver.subscribe(handlers)

    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const users = [new User(1, 'John'), new User(2, 'Jane'), new User(3, 'Bob')]
    const result = await apiSerializer.serialize(
      UserTransformer.transform(users),
      container.createResolver()
    )

    assert.lengthOf(result, 3)
    assert.deepEqual(result, [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
      { id: 3, name: 'Bob' },
    ])

    assert.lengthOf(events, 3)
    events.forEach((event) => {
      assert.instanceOf(event.transformer, UserTransformer)
      assert.equal(event.variant, 'toObject')
      assert.equal(event.depth, 0)
    })
  })

  test('should trace with depth and maxDepth parameters', async ({ assert, cleanup }) => {
    const events: TransformerTracingData[] = []

    class Tag {
      constructor(public name: string) {}
    }

    class Post {
      constructor(
        public id: number,
        public title: string,
        public tags: Tag[]
      ) {}
    }

    class User {
      constructor(
        public id: number,
        public name: string,
        public posts: Post[]
      ) {}
    }

    class TagTransformer extends BaseTransformer<Tag> {
      toObject() {
        return {
          name: this.resource.name,
        }
      }
    }

    class PostTransformer extends BaseTransformer<Post> {
      toObject() {
        return {
          id: this.resource.id,
          title: this.resource.title,
          tags: TagTransformer.transform(this.resource.tags),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
          posts: PostTransformer.transform(this.resource.posts),
        }
      }
    }

    const handlers = {
      start(data: TransformerTracingData) {
        events.push(data)
      },
      end(_: TransformerTracingData) {},
      asyncStart(_: TransformerTracingData) {},
      asyncEnd(_: TransformerTracingData) {},
      error(_: TransformerTracingData) {},
    }

    tracingChannels.transformerResolver.subscribe(handlers)

    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const tags = [new Tag('typescript'), new Tag('nodejs')]
    const posts = [new Post(1, 'First Post', tags)]
    const user = new User(1, 'John Doe', posts)

    const result = await apiSerializer.serialize(
      UserTransformer.transform(user).depth(2),
      container.createResolver()
    )

    assert.deepEqual(result, {
      id: 1,
      name: 'John Doe',
      posts: [
        {
          id: 1,
          title: 'First Post',
        },
      ],
    })

    assert.isAtLeast(events.length, 2)

    const userEvent = events.find((e) => e.transformer instanceof UserTransformer)
    assert.isDefined(userEvent)
    assert.equal(userEvent!.depth, 0)
    assert.isUndefined(userEvent!.maxDepth)

    const postEvent = events.find((e) => e.transformer instanceof PostTransformer)
    assert.isDefined(postEvent)
    assert.equal(postEvent!.depth, 1)
    assert.equal(postEvent!.maxDepth, 1)
  })

  test('should not create tracing data when no subscribers', async ({ assert }) => {
    class User {
      constructor(
        public id: number,
        public name: string
      ) {}
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        }
      }
    }

    const user = new User(1, 'John Doe')
    const result = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )

    assert.deepEqual(result, {
      id: 1,
      name: 'John Doe',
    })

    assert.isFalse(tracingChannels.transformerResolver.hasSubscribers)
  })

  test('should trace error events when transformer throws', async ({ assert, cleanup }) => {
    const errorEvents: TransformerTracingData[] = []

    class User {
      constructor(public id: number) {}
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        throw new Error('Transformation failed')
      }
    }

    const handlers = {
      start(_: TransformerTracingData) {},
      end(_: TransformerTracingData) {},
      asyncStart(_: TransformerTracingData) {},
      asyncEnd(_: TransformerTracingData) {},
      error(data: TransformerTracingData) {
        errorEvents.push(data)
      },
    }

    tracingChannels.transformerResolver.subscribe(handlers)

    cleanup(() => {
      tracingChannels.transformerResolver.unsubscribe(handlers)
    })

    const user = new User(1)

    await assert.rejects(
      () => apiSerializer.serialize(UserTransformer.transform(user), container.createResolver()),
      'Transformation failed'
    )

    assert.lengthOf(errorEvents, 1)
    assert.instanceOf(errorEvents[0].transformer, UserTransformer)
  })
})
