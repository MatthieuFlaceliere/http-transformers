/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Container, type ContainerResolver } from '@adonisjs/fold'
import { RuntimeException } from '@poppinss/exception'

import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { isObject, resolveValues } from './helpers.ts'
import { Collection } from './resource/collection.ts'
import {
  type ItemContract,
  type PaginatorContract,
  type ResourceDataTypes,
  type CollectionContract,
  type UnpackTopLevelValues,
  type UnpackAsTopLevelItem,
  type UnpackAsTopLevelCollection,
  type UnpackAsTopLevelPaginator,
} from './types.ts'

/**
 * Base class for implementing custom serializers that control how transformed
 * data is serialized and wrapped for API responses.
 *
 * Serializers provide control over:
 * - How individual items and collections are wrapped (e.g., in a "data" key)
 * - How pagination metadata is structured and transformed
 *
 * @template Wrappers - Configuration object for wrapper keys and metadata transformation
 *
 * ```typescript
 * class ApiSerializer extends BaseSerializer<{
 *   Wrap: 'data'
 *   PaginationMetaData: { page: number; totalPages: number }
 * }> {
 *   wrap = 'data' as const
 *
 *   definePaginationMetaData(metaData: any) {
 *     return {
 *       page: metaData.currentPage,
 *       totalPages: metaData.lastPage
 *     }
 *   }
 * }
 *
 * const serializer = new ApiSerializer()
 * const result = await serializer.serialize(UserTransformer.transform(user))
 * // Result: { data: { id: 1, name: "John" } }
 * ```
 */
export abstract class BaseSerializer<
  Wrappers extends {
    Wrap?: string
    PaginationMetaData?: Record<string, any>
  } = {},
> {
  /**
   * The key name to wrap response data under. Set to undefined to disable wrapping.
   */
  abstract wrap: Wrappers['Wrap']

  /**
   * Transforms raw pagination metadata into the desired format for API responses.
   *
   * @param metaData - The raw pagination metadata from the paginator
   */
  abstract definePaginationMetaData(metaData: unknown): Wrappers['PaginationMetaData']

  /**
   * Internal method to wrap a value under a specified key.
   *
   * @param value - The value to wrap
   * @param wrapper - The key name to wrap the value under
   */
  #wrap(value: any, wrapper: string | undefined) {
    if (!wrapper) {
      return value
    }
    return { [wrapper]: value }
  }

  /**
   * Serializes a record of resource data types into plain JavaScript objects.
   *
   * @param data - The resource data record to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<Data extends Record<string, ResourceDataTypes | PaginatorContract<any>>>(
    data: Data,
    container?: ContainerResolver<any>
  ): Promise<UnpackTopLevelValues<Data>>

  /**
   * Serializes an Item resource into its plain JavaScript representation.
   *
   * @param resource - The Item resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourceItem extends ItemContract<any, any, any>>(
    resource: ResourceItem,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelItem<ResourceItem, Wrappers['Wrap']>>

  /**
   * Serializes a Collection resource into an array of plain JavaScript objects.
   *
   * @param collection - The Collection resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourceCollection extends CollectionContract<any, any, any>>(
    collection: ResourceCollection,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelCollection<ResourceCollection, Wrappers['Wrap']>>

  /**
   * Serializes a Paginator resource into paginated data with metadata.
   *
   * @param paginator - The Paginator resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourcePaginator extends PaginatorContract<any>>(
    paginator: ResourcePaginator,
    container?: ContainerResolver<any>
  ): Promise<
    UnpackAsTopLevelPaginator<
      ResourcePaginator,
      Wrappers['Wrap'] extends string ? Wrappers['Wrap'] : 'data',
      Wrappers['PaginationMetaData']
    >
  >

  /**
   * Serializes any other value by returning it as-is wrapped in a Promise.
   *
   * @param value - The value to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<Value>(value: Value, container?: ContainerResolver<any>): Promise<Value>
  serialize(
    data: Record<string, ResourceDataTypes> | Item<any, any, any> | Collection<any, any, any>,
    container?: ContainerResolver<any>
  ): Promise<any> {
    if (data === null) {
      throw new RuntimeException('Cannot serialize an item with null value')
    }

    const resolver = container ?? new Container().createResolver()
    if (data instanceof Item) {
      return data.resolve(resolver, 0, -1).then((value) => this.#wrap(value, this.wrap))
    }

    if (data instanceof Collection) {
      return data.resolve(resolver, 0, -1).then((value) => this.#wrap(value, this.wrap))
    }

    if (data instanceof Paginator) {
      const wrapperKey = this.wrap ?? 'data'
      return data.resolve(resolver, 0, -1).then((value) => {
        return {
          [wrapperKey]: value.data,
          metadata: this.definePaginationMetaData(value.metadata),
        }
      })
    }

    if (isObject(data)) {
      return resolveValues(resolver, data, 0, -1)
    }
    return data
  }
}
