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

import { transformData } from './helpers.js'
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
 */
export const transform: TransformFn = (data, transformer, variant, container) => {
  if (Array.isArray(data)) {
    return Promise.all(
      data.map((row) => {
        return transformData(
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

  return transformData(
    container ?? new Container().createResolver(),
    new transformer(data),
    variant ?? 'toObject',
    0
  ) as any
}
