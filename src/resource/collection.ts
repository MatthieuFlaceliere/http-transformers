/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import { type RuntimeException } from '@poppinss/exception'

import { transformAndSerialize } from '../utils.ts'
import { type Next, type ExtractTransformerVariants, type InferData } from '../types.ts'

/**
 * Represents a collection of transformers created for an array of source data.
 * Provides functionality to transform multiple data items into a consistent format.
 *
 * @template Transformer - The transformer class used to transform individual items
 * @template MaxDepth - Maximum depth for nested transformations
 * @template Variant - The transformer method variant to use for serialization
 *
 * @example
 * ```ts
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return { id: this.resource.id, name: this.resource.name }
 *   }
 * }
 *
 * const users = [user1, user2, user3]
 * const collection = UserTransformer.collection(users)
 * const serialized = await collection.serialize(container, 0, 2)
 * ```
 */
export class Collection<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Private debugging error instance for troubleshooting
   */
  #debuggingError: RuntimeException

  /**
   * Type identifier for the collection resource
   */
  $type: 'collection' = 'collection'

  /**
   * Creates a new Collection instance
   *
   * @param transformerData - Array of data to be transformed
   * @param transformer - Constructor for the transformer class
   * @param maxDepth - Maximum depth for nested transformations
   * @param variant - Variant method name to use for transformation
   * @param debuggingError - Runtime exception for debugging purposes
   *
   * @example
   * ```ts
   * const collection = new Collection(
   *   [user1, user2],
   *   UserTransformer,
   *   1,
   *   'toObject',
   *   new RuntimeException()
   * )
   * ```
   */
  constructor(
    protected transformerData: any[],
    public transformer: { new (...args: any[]): Transformer },
    public maxDepth: MaxDepth,
    public variant: Variant,
    debuggingError: RuntimeException
  ) {
    this.#debuggingError = debuggingError
  }

  /**
   * Specify the depth of relationships to be resolved when creating
   * the object tree.
   *
   * @param value - Maximum depth level for nested transformations
   *
   * @example
   * ```ts
   * const posts = PostTransformer.collection(userData.posts)
   *   .depth(2) // Allow 2 levels of nested relationships
   * ```
   */
  depth<T extends Next[number]>(value: T): Collection<Transformer, T, Variant> {
    return new Collection(
      this.transformerData,
      this.transformer,
      value,
      this.variant,
      this.#debuggingError
    )
  }

  /**
   * Specify the variant to use for the relationship
   *
   * @param value - Name of the transformer variant method to use
   *
   * @example
   * ```ts
   * const users = UserTransformer.collection(userData)
   *   .useVariant('toSummary') // Use toSummary() instead of toObject()
   * ```
   */
  useVariant<V extends ExtractTransformerVariants<Transformer>>(
    value: V
  ): Collection<Transformer, MaxDepth, V> {
    return new Collection(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      value,
      this.#debuggingError
    )
  }

  /**
   * Serializes the collection data using the transformer
   *
   * @param container - Container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override
   *
   * @example
   * ```ts
   * const posts = PostTransformer.collection(userData.posts)
   * const serialized = await posts.serialize(container, 0, 2)
   * ```
   */
  serialize(container: ContainerResolver<any>, depth: number, maxDepth?: number) {
    return Promise.all(
      this.transformerData.map((row) =>
        transformAndSerialize(
          container,
          new this.transformer(row),
          this.variant,
          depth,
          maxDepth === -1 ? undefined : (maxDepth ?? this.maxDepth)
        )
      )
    ) as unknown as Promise<InferData<Transformer, Variant, -1, 0>[]>
  }
}
