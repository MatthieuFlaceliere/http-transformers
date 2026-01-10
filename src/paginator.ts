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
 *
 * ```typescript
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return {
 *       id: this.resource.id,
 *       name: this.resource.name
 *     }
 *   }
 * }
 *
 * const paginator = UserTransformer.paginate(
 *   users,
 *   { page: 1, perPage: 10, total: 100 }
 * )
 *
 * const result = await serializer.serialize(paginator)
 * // Result: { data: [...], metadata: { page: 1, perPage: 10, total: 100 } }
 * ```
 */
export class Paginator<PaginatorCollection extends Collection<any, any, any>> {
  /**
   * Type identifier for the paginator instance, used for runtime type discrimination.
   */
  $type: 'paginator' = 'paginator'

  /**
   * Creates a new Paginator instance. This constructor is typically not called directly.
   * Use `BaseTransformer.paginate()` instead.
   *
   * @param collection - The collection of transformed data to paginate
   * @param metaData - Pagination metadata (page, perPage, total, etc.)
   */
  constructor(
    public collection: PaginatorCollection,
    public metaData: any
  ) {}

  /**
   * Resolves the paginated data by combining the serialized collection
   * with pagination metadata. This method is typically called internally by
   * the serializer function.
   *
   * @param container - Container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override
   */
  async resolve(
    container: ContainerResolver<any>,
    depth: number,
    maxDepth?: number
  ): Promise<UnpackAsTopLevelPaginator<this, 'data', undefined>> {
    return {
      data: await this.collection.resolve(container, depth, maxDepth),
      metadata: this.metaData,
    } as unknown as Promise<UnpackAsTopLevelPaginator<this, 'data', undefined>>
  }
}
