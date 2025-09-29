/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'

import { Maybe } from './maybe.ts'
import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { Collection } from './resource/collection.ts'

/**
 * Serves as the base for creating custom data transformers.
 *
 * @example
 * ```ts
 * // Creates a one-to-one relationship between two transformers
 * transformer.item(value)
 *
 * // Creates a one-to-many relationship between two transformer
 * transformer.collection(values)
 *
 * // Wraps the value inside a Maybe to allow undefined values when forming a relation
 * transformer.whenLoaded(value)
 *
 * // Lazily compute value when a conditional is true. A simpler way of writing ternary
 * transformer.when(conditon, () => computeValue())
 *
 * // Sets the value when an aggregate was computed for the relationship. Think
 * // of it as a shorthand of self reading the value from the $extras object
 * transformer.whenCounted('relationName')
 * ```
 */
export abstract class BaseTransformer<T> {
  /**
   * Static method to transform data into Item or Collection instances.
   * Handles single objects, arrays, null values, and Maybe-wrapped values.
   *
   * @param data - The data to transform (can be single object, array, null, or Maybe-wrapped)
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return { id: this.resource.id, name: this.resource.name }
   *   }
   * }
   *
   * // Transform single user
   * const userItem = UserTransformer.transform(user)
   *
   * // Transform array of users
   * const userCollection = UserTransformer.transform([user1, user2])
   *
   * // Transform with Maybe wrapper
   * const maybeUser = UserTransformer.transform(new Maybe(user))
   * ```
   */
  /**
   * Transform data wrapped in Maybe that can be undefined
   *
   * @param data - Maybe-wrapped data that can be undefined
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0]>
  ): Item<InstanceType<Self>, 1, 'toObject'> | undefined

  /**
   * Transform a single data object
   *
   * @param data - Single data object to transform
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0]
  ): Item<InstanceType<Self>, 1, 'toObject'>

  /**
   * Transform data wrapped in Maybe that can be undefined or null
   *
   * @param data - Maybe-wrapped data that can be undefined or null
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0] | null>
  ): Item<InstanceType<Self>, 1, 'toObject'> | undefined | null

  /**
   * Transform a single data object that can be null
   *
   * @param data - Single data object that can be null
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0] | null
  ): Item<InstanceType<Self>, 1, 'toObject'> | null

  /**
   * Transform an array wrapped in Maybe that can be undefined
   *
   * @param data - Maybe-wrapped array that can be undefined
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0][]>
  ): Collection<InstanceType<Self>, 1, 'toObject'> | undefined

  /**
   * Transform an array of data objects
   *
   * @param data - Array of data objects to transform
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0][]
  ): Collection<InstanceType<Self>, 1, 'toObject'>

  /**
   * Implementation method that handles all transform overloads
   *
   * @param data - Union of all possible data types that can be transformed
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data:
      | ConstructorParameters<Self>[0]
      | null
      | Maybe<ConstructorParameters<Self>[0] | null>
      | ConstructorParameters<Self>[0][]
      | Maybe<ConstructorParameters<Self>[0][]>
  ) {
    /**
     * If optional values are allowed and the value is undefined, then
     * we return undefined
     */
    const canBeOptional = data instanceof Maybe
    const unwrappedValue = canBeOptional ? data.value : data
    if (canBeOptional && unwrappedValue === undefined) {
      return undefined
    }

    if (Array.isArray(unwrappedValue)) {
      return new Collection(unwrappedValue, this, 1, 'toObject', new RuntimeException())
    }

    if (unwrappedValue === null) {
      return null
    }

    return new Item<InstanceType<Self>, 1, 'toObject'>(
      unwrappedValue,
      this,
      1,
      'toObject',
      new RuntimeException()
    )
  }

  /**
   * Create a paginated collection from an array of data
   *
   * @param data - Array of data objects to transform into a paginated collection
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return { id: this.resource.id, name: this.resource.name }
   *   }
   * }
   *
   * // Create paginated collection
   * const paginatedUsers = UserTransformer.paginate([user1, user2, user3])
   * ```
   */
  static paginate<Self extends { new (...args: any[]): any }, MetaData extends Record<string, any>>(
    this: Self,
    data: ConstructorParameters<Self>[0][],
    metaData: MetaData
  ): Paginator<Collection<InstanceType<Self>, 1, 'toObject'>, 'data', MetaData> {
    return new Paginator(
      new Collection(data, this, 1, 'toObject', new RuntimeException()),
      'data',
      metaData
    )
  }

  /**
   * Create a new transformer instance with the provided resource data
   *
   * @param resource - The raw resource data to be transformed
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   constructor(user: User) {
   *     super(user)
   *   }
   * }
   * ```
   */
  constructor(protected resource: T) {}

  /**
   * Wrap the value into an optional to not fail when the
   * collection or item data is undefined
   *
   * @param value - The value to wrap in a Maybe container
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return {
   *       id: this.resource.id,
   *       profile: this.whenLoaded(this.resource.profile)
   *     }
   *   }
   * }
   * ```
   */
  whenLoaded<Value>(value: Value): Maybe<Value> {
    return new Maybe(value)
  }

  /**
   * Omits the given keys from the data-set. The return value is a
   * shallow copy of the original data-set.
   *
   * @param data - The source object to omit keys from
   * @param keys - Array of keys to omit from the data object
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return this.omit(this.resource, ['password', 'internalId'])
   *   }
   * }
   * ```
   */
  omit<
    Data extends Record<string, any>,
    Keys extends { [K in keyof Data]: Data[K] extends Function ? never : K }[keyof Data],
  >(data: Data, keys: Keys[] | readonly Keys[]): Exclude<Data, Keys> {
    const result = { ...data }
    for (const key of keys) {
      delete result[key]
    }
    return result as Exclude<Data, Keys>
  }

  /**
   * Picks the given keys from the data-set. The return value is a
   * shallow copy containing only the specified keys.
   *
   * @param data - The source object to pick keys from
   * @param keys - Array of keys to pick from the data object
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toSummary() {
   *     return this.pick(this.resource, ['id', 'name', 'email'])
   *   }
   * }
   * ```
   */
  pick<
    Data extends Record<string, any>,
    Keys extends { [K in keyof Data]: Data[K] extends Function ? never : K }[keyof Data],
  >(data: Data, keys: Keys[] | readonly Keys[]): Pick<Data, Keys> {
    const result = {} as Pick<Data, Keys>
    for (const key of keys) {
      result[key] = data[key]
    }
    return result
  }

  /**
   * Conditionally compute a value based on a boolean condition
   *
   * @param conditional - Boolean condition to evaluate
   * @param resolver - Function that returns the value when condition is true
   * @param fallback - Optional fallback value when condition is false
   *
   * @example
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return {
   *       id: this.resource.id,
   *       name: this.resource.name,
   *       isAdmin: this.when(this.resource.role === 'admin', () => true, false)
   *     }
   *   }
   * }
   * ```
   */
  when<Value, Fallback = undefined>(
    conditional: boolean,
    resolver: () => Value,
    fallback?: Fallback
  ): Value | Fallback {
    return conditional ? resolver() : (fallback ?? (undefined as Fallback))
  }
}
