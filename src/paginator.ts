/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import { type UnpackAsCollection } from './types.ts'
import { type Collection } from './resource/collection.ts'

/**
 * Represents paginated data that combines a collection of transformed items
 * with pagination metadata.
 *
 * @template PaginatorCollection - The collection type containing the data items
 * @template DataProp - The property name where data items will be stored
 * @template MetaData - The pagination metadata type
 *
 * @example
 * ```ts
 * const paginator = new Paginator(
 *   UserTransformer.collection(users),
 *   'data',
 *   { page: 1, perPage: 10, total: 100 }
 * )
 *
 * const result = await paginator.serialize(container, 0)
 * // Result: { data: [...], page: 1, perPage: 10, total: 100 }
 * ```
 */
export class Paginator<
  PaginatorCollection extends Collection<any, any, any>,
  DataProp extends string,
  MetaData extends Record<string, any>,
> {
  /**
   * Type identifier for the paginator
   */
  $type: 'paginator' = 'paginator'

  /**
   * Creates a new Paginator instance
   *
   * @param collection - The collection of data to paginate
   * @param dataProp - The property name for the data array in the result
   * @param metaData - Pagination metadata (page, perPage, total, etc.)
   *
   * @example
   * ```ts
   * const paginator = new Paginator(
   *   UserTransformer.collection(users),
   *   'data',
   *   { page: 1, perPage: 10, total: 100, lastPage: 10 }
   * )
   * ```
   */
  constructor(
    protected collection: PaginatorCollection,
    protected dataProp: DataProp,
    protected metaData: MetaData
  ) {}

  /**
   * Sets a new data property name for the paginated result
   *
   * @param dataProp - The new property name for the data array
   *
   * @example
   * ```ts
   * const paginator = new Paginator(collection, 'data', { page: 1 })
   * const newPaginator = paginator.setDataProp('users')
   * // Result will have 'users' instead of 'data' as the key
   * ```
   */
  setDataProp<Value extends string>(
    dataProp: Value
  ): Paginator<PaginatorCollection, Value, MetaData> {
    return new Paginator(this.collection, dataProp, this.metaData)
  }

  /**
   * Updates the pagination metadata with new values
   *
   * @param metaData - New metadata object or a function that receives current metadata and returns new metadata
   *
   * @example
   * ```ts
   * const paginator = new Paginator(collection, 'data', { page: 1, total: 100 })
   *
   * // Set new metadata
   * const updated = paginator.setMetaData({ page: 2, total: 150, hasMore: true })
   *
   * // Update existing metadata
   * const incremented = paginator.setMetaData(meta => ({ ...meta, page: meta.page + 1 }))
   * ```
   */
  setMetaData<Value extends Record<string, any>>(
    metaData: Value | ((data: MetaData) => Value)
  ): Paginator<PaginatorCollection, DataProp, Value> {
    return new Paginator(
      this.collection,
      this.dataProp,
      typeof metaData === 'function' ? metaData(this.metaData) : metaData
    )
  }

  /**
   * Serializes the paginated data by combining the serialized collection
   * with pagination metadata
   *
   * @param container - Container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override
   *
   * @example
   * ```ts
   * const paginator = new Paginator(collection, 'users', { page: 1, total: 50 })
   * const result = await paginator.serialize(container, 0, 2)
   * // Result: { users: [...serialized items...], page: 1, total: 50 }
   * ```
   */
  async serialize(
    container: ContainerResolver<any>,
    depth: number,
    maxDepth?: number
  ): Promise<
    {
      [M in DataProp]: UnpackAsCollection<PaginatorCollection, -1, 0, true>
    } & MetaData
  > {
    return {
      [this.dataProp]: await this.collection.serialize(container, depth, maxDepth),
      ...this.metaData,
    }
  }
}
