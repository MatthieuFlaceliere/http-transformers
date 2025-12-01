/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import { type Collection } from './resource/collection.ts'
import { type UnpackAsTopLevelPaginator } from './types.ts'

/**
 * Represents paginated data that combines a collection of transformed items
 * with pagination metadata. This class is typically created using the
 * `BaseTransformer.paginate()` method.
 *
 * @template PaginatorCollection - The collection type containing the data items
 * @template MetaData - The pagination metadata type
 *
 * ```ts
 * const paginator = UserTransformer.paginate(
 *   users,
 *   { page: 1, perPage: 10, total: 100 }
 * )
 *
 * const result = await serialize(paginator)
 * // Result: { data: [...], meta: { page: 1, perPage: 10, total: 100 } }
 * ```
 */
export class Paginator<
  PaginatorCollection extends Collection<any, any, any>,
  MetaData extends Record<string, any>,
> {
  /**
   * Type identifier for the paginator
   */
  $type: 'paginator' = 'paginator'

  /**
   * Creates a new Paginator instance. This constructor is typically not called directly.
   * Use `BaseTransformer.paginate()` instead.
   *
   * @param collection - The collection of data to paginate
   * @param metaData - Pagination metadata (page, perPage, total, etc.)
   */
  constructor(
    public collection: PaginatorCollection,
    public metaData: MetaData
  ) {}

  /**
   * Updates the pagination metadata with new values. Returns a new Paginator instance
   * with the updated metadata.
   *
   * @param metaData - New metadata object or a function that receives current metadata and returns new metadata
   *
   * ```ts
   * const paginator = UserTransformer.paginate(users, { page: 1, total: 100 })
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
  ): Paginator<PaginatorCollection, Value> {
    return new Paginator(
      this.collection,
      typeof metaData === 'function' ? metaData(this.metaData) : metaData
    )
  }

  /**
   * Serializes the paginated data by combining the serialized collection
   * with pagination metadata. This method is typically called internally by
   * the `serialize()` function.
   *
   * @param container - Container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override
   */
  async serialize(
    container: ContainerResolver<any>,
    depth: number,
    maxDepth?: number
  ): Promise<UnpackAsTopLevelPaginator<this>> {
    return {
      data: await this.collection.serialize(container, depth, maxDepth),
      meta: this.metaData,
    } as unknown as Promise<UnpackAsTopLevelPaginator<this>>
  }
}
