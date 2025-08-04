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

import { transformData } from './helpers.js'
import type { ExtractResourceVariants, InferData, Next } from './types.js'

/**
 * Represents a transformer created for a source item.
 */
export class Item<
  Transformer extends Record<string, any>,
  Depth extends number,
  Variant extends string,
  Fallback,
> {
  #debuggingError: RuntimeException
  $type: 'item' = 'item'

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
   * Transforms the resources to plain a JSON object. The maxDepth and
   * depth properties can be specified when transforming the collection
   * as a relationship.
   */
  transform(
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

    return transformData(
      container,
      new this.transformer(this.transformerData),
      this.variant,
      depth,
      maxDepth ?? this.maxDepth
    ) as Promise<InferData<Transformer, Variant>>
  }
}
