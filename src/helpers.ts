/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'
import type { ContainerResolver } from '@adonisjs/fold'

import { Item } from './item.js'
import { debug } from './debug.js'
import { Collection } from './collection.js'
import type { JSONDataTypes, ResourceData } from './types.js'

/**
 * Checks if value is an object excluding Arrays and null values
 *
 * @param value - The value to check
 *
 * @example
 * ```ts
 * isObject({}) // true
 * isObject([]) // false
 * isObject(null) // false
 * isObject("string") // false
 * ```
 */
export function isObject<T extends Record<string, any>>(value: unknown): value is T {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Serializes a transformer instance using the specified variant method
 *
 * @param container - Container resolver for dependency injection
 * @param transformer - The transformer instance to serialize
 * @param variant - Name of the variant method to call
 * @param depth - Current depth level in the transformation tree
 * @param maxDepth - Optional maximum depth limit
 *
 * @example
 * ```ts
 * const user = new UserTransformer(userData)
 * const result = await serialize(container, user, 'toObject', 0, 3)
 * ```
 */
export async function serialize(
  container: ContainerResolver<any>,
  transformer: Record<string, any>,
  variant: string,
  depth: number,
  maxDepth?: number
) {
  const input = await container.call(transformer, variant)
  if (!isObject(input)) {
    throw new RuntimeException(
      `Invalid value returned by ${transformer.constructor.name}.${variant}. The returned value must be an object`
    )
  }

  if (debug.enabled) {
    debug('serializing "%s" output %O', `${transformer.constructor.name}.${variant}`, input)
  }
  return serializeValues(container, input, depth, maxDepth)
}

/**
 * Serializes JSON data-types recursively by creating a new copy
 * of objects and arrays.
 * Will use if we decide to create a fresh copy of returned values. For
 * now we keep the references
 */
// export function serializeJSON(input: JSONDataTypes): JSONDataTypes {
//   let output = input
//   if (typeof input === 'object' && input !== null) {
//     output = Array.isArray(input) ? [] : {}
//     for (const [key, value] of Object.entries(input)) {
//       ;(output as any)[key] = serializeJSON(value)
//     }
//   }
//   return output
// }

/**
 * Recursively serializes values from a resource data object, handling nested
 * Items and Collections appropriately
 *
 * @param container - Container resolver for dependency injection
 * @param input - The resource data object containing values to serialize
 * @param depth - Current depth level in the transformation tree
 * @param maxDepth - Optional maximum depth limit
 *
 * @example
 * ```ts
 * const resourceData = {
 *   id: 1,
 *   user: UserTransformer.item(userData),
 *   posts: PostTransformer.collection(postsData)
 * }
 * const result = await serializeValues(container, resourceData, 0, 2)
 * ```
 */
export async function serializeValues(
  container: ContainerResolver<any>,
  input: ResourceData,
  depth: number,
  maxDepth?: number
) {
  let output: JSONDataTypes = {}
  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Item || value instanceof Collection) {
      debug('resolving key "%s" with maxDepth="%s" and depth="%s"', key, maxDepth, depth)
      if (maxDepth && depth >= maxDepth) {
        continue
      } else {
        output[key] = await value.serialize(container, depth + 1, maxDepth)
      }
    } else {
      /**
       * Call serializeJSON if we want to create a new copy for every
       * value. Maybe we should avoid that for performance?
       */
      //serializeJSON(value)
      output[key] = value
    }
  }

  return output
}
