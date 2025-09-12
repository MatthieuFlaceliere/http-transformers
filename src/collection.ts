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

import { serialize } from './helpers.js'
import { type ExtractResourceVariants, type InferData, type Next } from './types.js'

/**
 * Represents a collection of transformers created for an
 * array of source data.
 */
export class Collection<
  Transformer extends Record<string, any>,
  Depth extends number,
  Variant extends string,
> {
  #debuggingError: RuntimeException
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
    protected transformerData: any[] | undefined,
    protected transformer: { new (...args: any[]): Transformer },
    protected maxDepth: Depth,
    protected variant: Variant,
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
  useVariant<V extends ExtractResourceVariants<Transformer>>(
    value: V
  ): Collection<Transformer, Depth, V> {
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
  serialize(
    container: ContainerResolver<any>,
    depth: number,
    maxDepth?: number
  ): Promise<InferData<Transformer, Variant>[]> {
    /**
     * If its undefined after unpacking, then throw an error
     */
    if (this.transformerData === undefined) {
      this.#debuggingError.message =
        'Cannot transform a collection with undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      throw this.#debuggingError
    }

    if (!Array.isArray(this.transformerData)) {
      this.#debuggingError.message = `Collection requires an array of values to transform. Instead received ${typeof this.transformerData}`
      throw this.#debuggingError
    }

    return Promise.all(
      this.transformerData.map(
        (row) =>
          serialize(
            container,
            new this.transformer(row),
            this.variant,
            depth,
            maxDepth ?? this.maxDepth
          ) as Promise<InferData<Transformer, Variant>>
      )
    )
  }
}
