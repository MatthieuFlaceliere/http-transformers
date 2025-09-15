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
import { serializeValues } from './utils.ts'
import { Collection } from './resource/collection.ts'
import type { ResourceDataTypes, SerializeFn } from './types.ts'

/**
 * Main serialization function that converts transformer data into plain JavaScript objects.
 * Handles Items, Collections, Paginators, and plain resource data objects.
 *
 * @param data - The data to serialize (can be Item, Collection, Paginator, or resource data)
 * @param container - Optional container resolver for dependency injection
 *
 * @example
 * ```ts
 * // Serialize a single item
 * const userItem = UserTransformer.item(userData)
 * const serializedUser = await serialize(userItem)
 *
 * // Serialize a collection
 * const usersCollection = UserTransformer.collection(usersData)
 * const serializedUsers = await serialize(usersCollection)
 *
 * // Serialize resource data
 * const resourceData = { id: 1, name: "John" }
 * const serialized = await serialize(resourceData)
 * ```
 */
export const serialize: SerializeFn = (
  data:
    | Record<string, ResourceDataTypes>
    | Item<any, any, any>
    | Collection<any, any, any>
    | Paginator<any, any, any>,
  container?: ContainerResolver<any>
): any => {
  if (data === null) {
    throw new RuntimeException('Cannot serialize an item with null value')
  }

  const resolver = container ?? new Container().createResolver()
  if (data instanceof Item || data instanceof Collection || data instanceof Paginator) {
    return data.serialize(resolver, 0, -1)
  }

  return serializeValues(resolver, data, 0, -1)
}
