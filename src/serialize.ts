/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'
import { Container, type ContainerResolver } from '@adonisjs/fold'

import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { isObject, serializeValues } from './utils.ts'
import { Collection } from './resource/collection.ts'
import type { ResourceDataTypes, SerializeFn } from './types.ts'

/**
 * Main serialization function that converts transformer data into plain JavaScript objects.
 * Handles Items, Collections, Paginators, and plain resource data objects.
 *
 * This function recursively processes the data structure, resolving all transformers
 * and nested relationships to produce a plain JavaScript object suitable for JSON serialization.
 *
 * @param data - The data to serialize (can be Item, Collection, Paginator, or resource data)
 * @param container - Optional AdonisJS container resolver for dependency injection. If not provided,
 *                     a new container will be created automatically
 *
 * ```ts
 * // Serialize a single item
 * const userItem = UserTransformer.transform(userData)
 * const serializedUser = await serialize(userItem)
 *
 * // Serialize a collection
 * const usersCollection = UserTransformer.transform(usersArray)
 * const serializedUsers = await serialize(usersCollection)
 *
 * // Serialize a paginator
 * const paginated = UserTransformer.paginate(usersArray, { page: 1, perPage: 10 })
 * const serializedPaginated = await serialize(paginated)
 *
 * // Serialize with custom container
 * const container = app.container.createResolver()
 * const serialized = await serialize(userItem, container)
 * ```
 */
export const serialize: SerializeFn = (
  data: Record<string, ResourceDataTypes> | Item<any, any, any> | Collection<any, any, any>,
  container?: ContainerResolver<any>
): any => {
  if (data === null) {
    throw new RuntimeException('Cannot serialize an item with null value')
  }

  const resolver = container ?? new Container().createResolver()
  if (data instanceof Item || data instanceof Collection || data instanceof Paginator) {
    return data.serialize(resolver, 0, -1)
  }

  if (isObject(data)) {
    return serializeValues(resolver, data, 0, -1)
  }
  return data
}
