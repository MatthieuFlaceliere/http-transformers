/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Container } from '@adonisjs/fold'
import { RuntimeException } from '@poppinss/exception'

import { serialize } from './helpers.js'
import type { TransformFn } from './types.js'

/**
 * Transform the input value using the transformer. The transform method
 * returns different values based upon the input.
 *
 * An array of values are converted to a collection and returned back as
 * an array.
 *
 * All other values are treat as resource items and transformed using the
 * transformer.
 *
 * @param data - The data to transform (single item or array)
 * @param transformer - Constructor for the transformer class
 * @param variant - Optional variant method name (defaults to 'toObject')
 * @param container - Optional container resolver for dependency injection
 *
 * @example
 * ```ts
 * // Transform single item
 * const user = await transform(userData, UserTransformer, 'toObject')
 *
 * // Transform array of items
 * const users = await transform([userData1, userData2], UserTransformer)
 *
 * // Using custom variant
 * const userSummary = await transform(userData, UserTransformer, 'toSummary')
 * ```
 */
export const transform: TransformFn = (data, transformer, variant, container) => {
  if (Array.isArray(data)) {
    return Promise.all(
      data.map((row) => {
        return serialize(
          container ?? new Container().createResolver(),
          new transformer(row),
          variant ?? 'toObject',
          0
        )
      })
    ) as ReturnType<TransformFn>
  }

  if (data === undefined || data === null) {
    throw new RuntimeException('Cannot transform null or undefined values')
  }

  return serialize(
    container ?? new Container().createResolver(),
    new transformer(data),
    variant ?? 'toObject',
    0
  ) as any
}
