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

import { debug } from './debug.ts'
import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { Collection } from './resource/collection.ts'
import type { JSONDataTypes, ResourceData } from './types.ts'

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
 * Transforms data using a transformer instance and then serializes the result.
 * Calls the specified variant method on the transformer and validates the output.
 *
 * @param container - Container resolver for dependency injection
 * @param transformer - The transformer instance to use
 * @param variant - The transformer method name to call
 * @param depth - Current depth level in the transformation tree
 * @param maxDepth - Optional maximum depth limit
 *
 * @example
 * ```ts
 * const userTransformer = new UserTransformer(userData)
 * const result = await transformAndSerialize(
 *   container,
 *   userTransformer,
 *   'toObject',
 *   0,
 *   3
 * )
 * ```
 */
export async function transformAndSerialize(
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
  const promises: Promise<[string, any]>[] = []
  const output: JSONDataTypes = {}

  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Item || value instanceof Collection || value instanceof Paginator) {
      debug('resolving key "%s" with maxDepth="%s" and depth="%s"', key, maxDepth, depth)
      if (maxDepth && maxDepth !== -1 && depth >= maxDepth) {
        continue
      } else {
        promises.push(
          value
            .serialize(container, maxDepth === -1 ? depth : depth + 1, maxDepth)
            .then((result: any) => [key, result])
        )
      }
    } else {
      output[key] = value
    }
  }

  const resolvedPromises = await Promise.all(promises)
  for (const [key, value] of resolvedPromises) {
    output[key] = value
  }

  return output
}
