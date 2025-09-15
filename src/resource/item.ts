/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import type { RuntimeException } from '@poppinss/exception'

import { transformAndSerialize } from '../utils.ts'
import type { ExtractTransformerVariants, InferData, Next } from '../types.ts'

/**
 * Represents a transformer created for a single source item.
 * Provides functionality to transform individual data items into a consistent format.
 *
 * @template Transformer - The transformer class used to transform the item
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
 * const item = UserTransformer.item(userData)
 * const serialized = await item.serialize(container, 0, 2)
 * ```
 */
export class Item<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Private debugging error instance for troubleshooting
   */
  #debuggingError: RuntimeException

  /**
   * Type identifier for the item resource
   */
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
    protected maxDepth: MaxDepth,
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
   * const user = UserTransformer.item(userData)
   *   .depth(3) // Allow 3 levels of nested relationships
   * ```
   */
  depth<T extends Next[number]>(value: T): Item<Transformer, T, Variant> {
    return new Item(
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
   * const user = UserTransformer.item(userData)
   *   .useVariant('toSummary') // Use toSummary() instead of toObject()
   * ```
   */
  useVariant<V extends ExtractTransformerVariants<Transformer>>(
    value: V
  ): Item<Transformer, MaxDepth, V> {
    return new Item(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      value,
      this.#debuggingError
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
  ): Promise<InferData<Transformer, Variant>> {
    /**
     * If its undefined after unpacking, then throw an error
     */
    if (this.transformerData === undefined) {
      this.#debuggingError.message =
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      throw this.#debuggingError
    }

    return transformAndSerialize(
      container,
      new this.transformer(this.transformerData),
      this.variant,
      depth,
      maxDepth === -1 ? undefined : (maxDepth ?? this.maxDepth)
    ) as Promise<InferData<Transformer, Variant>>
  }
}
