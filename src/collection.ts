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

import { transformData } from './helpers.js'
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
   * Transforms the resources collection to plain JSON
   * objects. The maxDepth and depth properties can
   * be specified when transforming the collection
   * as a relationship.
   */
  transform(
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
          transformData(
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
