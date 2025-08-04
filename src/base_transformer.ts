/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'

import { Item } from './item.js'
import { Maybe } from './maybe.js'
import { Collection } from './collection.js'

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
   * Specify a one-to-one relationship with a given transformer.
   */
  static item<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0] | null>
  ): Item<InstanceType<Self>, 1, 'toObject', null> | undefined

  static item<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0] | null
  ): Item<InstanceType<Self>, 1, 'toObject', null>

  static item<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0] | null | Maybe<ConstructorParameters<Self>[0] | null>
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

    return new Item(unwrappedValue, this, 1, 'toObject', new RuntimeException(), true)
  }

  /**
   * Specify a many relationship with a given transformer.
   */
  static collection<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0][]>
  ): Collection<InstanceType<Self>, 1, 'toObject'> | undefined

  static collection<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0][]
  ): Collection<InstanceType<Self>, 1, 'toObject'>

  static collection<Self extends { new (...args: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0][] | Maybe<ConstructorParameters<Self>[0][]>
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

    return new Collection(unwrappedValue, this, 1, 'toObject', new RuntimeException())
  }

  constructor(protected resource: T) {}

  /**
   * Wrap the value into an optional to not fail when the
   * collection or item data is undefined
   */
  whenLoaded<Value>(value: Value): Maybe<Value> {
    return new Maybe(value)
  }

  /**
   * Omits the given keys from the data-set. The return value is a
   * shallow copy of the original data-set.
   */
  omit<Data extends Record<string, any>, Keys extends keyof Data>(
    data: Data,
    keys: Keys[] | readonly Keys[]
  ): Exclude<Data, Keys> {
    const result = { ...data }
    for (const key of keys) {
      delete result[key]
    }
    return result as Exclude<Data, Keys>
  }

  /**
   * Given the given keys from the data-set. The return value is a
   * shallow copy of the original data-set.
   */
  pick<Data extends Record<string, any>, Keys extends keyof Data>(
    data: Data,
    keys: Keys[] | readonly Keys[]
  ): Pick<Data, Keys> {
    const result = {} as Pick<Data, Keys>
    for (const key of keys) {
      result[key] = data[key]
    }
    return result
  }

  /**
   * Conditionally compute a value
   */
  when<Value, Fallback = undefined>(
    conditional: boolean,
    resolver: () => Value,
    fallback?: Fallback
  ): Value | Fallback {
    return conditional ? resolver() : (fallback ?? (undefined as Fallback))
  }
}
