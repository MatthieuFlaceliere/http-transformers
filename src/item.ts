/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { RuntimeException } from '@poppinss/exception'
import type { ContainerResolver } from '@adonisjs/fold'

import { serialize } from './helpers.js'
import type { ExtractResourceVariants, InferData, Next } from './types.js'

/**
 * Represents a transformer created for a source item.
 */
export class Item<
  Transformer extends Record<string, any>,
  Depth extends number,
  Variant extends string,
  Fallback extends any = {},
> {
  #debuggingError: RuntimeException
  $type: 'item' = 'item'

  /**
   * Creates a new Item instance
   *
   * @param transformerData - The data item to be transformed
   * @param transformer - Constructor for the transformer class
   * @param maxDepth - Maximum depth for nested transformations
   * @param variant - Variant method name to use for transformation
   * @param debuggingError - Runtime exception for debugging purposes
   * @param allowNullable - Whether null values are allowed
   *
   * @example
   * ```ts
   * const item = new Item(
   *   userData,
   *   UserTransformer,
   *   1,
   *   'toObject',
   *   new RuntimeException(),
   *   true
   * )
   * ```
   */
  constructor(
    protected transformerData: any,
    protected transformer: { new (...args: any[]): Transformer },
    protected maxDepth: Depth,
    protected variant: Variant,
    debuggingError: RuntimeException,
    protected allowNullable: boolean = true
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
   * const user = UserTransformer.item(userData)
   *   .depth(3) // Allow 3 levels of nested relationships
   * ```
   */
  depth<T extends Next[number]>(value: T): Item<Transformer, T, Variant, Fallback> {
    return new Item(
      this.transformerData,
      this.transformer,
      value,
      this.variant,
      this.#debuggingError,
      this.allowNullable
    )
  }

  /**
   * Specify the variant to use for the relationship
   *
   * @param value - Name of the transformer variant method to use
   *
   * @example
   * ```ts
   * const user = UserTransformer.item(userData)
   *   .useVariant('toSummary') // Use toSummary() instead of toObject()
   * ```
   */
  useVariant<V extends ExtractResourceVariants<Transformer>>(
    value: V
  ): Item<Transformer, Depth, V, Fallback> {
    return new Item(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      value,
      this.#debuggingError,
      this.allowNullable
    )
  }

  /**
   * Instruct item to disallow nullable values. An error will be
   * thrown if the value is null.
   *
   * @example
   * ```ts
   * const user = UserTransformer.item(userData)
   *   .notNullable() // Throw error if userData is null
   * ```
   */
  notNullable(): Item<Transformer, Depth, Variant, unknown> {
    return new Item(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      this.variant,
      this.#debuggingError,
      false
    )
  }

  /**
   * Serializes the item data using the transformer
   *
   * @param container - Container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override
   *
   * @example
   * ```ts
   * const user = UserTransformer.item(userData)
   * const serialized = await user.serialize(container, 0, 2)
   * ```
   */
  serialize(
    container: ContainerResolver<any>,
    depth: number,
    maxDepth?: number
  ): Promise<InferData<Transformer, Variant>> | Fallback {
    /**
     * If its undefined after unpacking, then throw an error
     */
    if (this.transformerData === undefined) {
      this.#debuggingError.message =
        'Cannot transform an item with undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      throw this.#debuggingError
    }

    /**
     * Allow null value when "allowNullable" flag is on.
     */
    if (this.allowNullable && this.transformerData === null) {
      return null as Fallback
    }

    /**
     * Allow null value when "allowNullable" flag is on.
     */
    if (this.transformerData === null) {
      this.#debuggingError.message =
        'Cannot transform an item with null value. Remove "notNullable" modifier to allow null values'
      throw this.#debuggingError
    }

    return serialize(
      container,
      new this.transformer(this.transformerData),
      this.variant,
      depth,
      maxDepth ?? this.maxDepth
    ) as Promise<InferData<Transformer, Variant>>
  }
}
