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

import { transformData } from './helpers.js'
import type { ExtractResourceVariants, InferData } from './types.js'

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
export function transform<
  Data extends ConstructorParameters<Transformer>[0],
  Transformer extends { new (...args: any[]): any },
  Variant extends string = 'toObject',
>(
  data: Data,
  transformer: Transformer,
  variant?: Variant | ExtractResourceVariants<InstanceType<Transformer>>,
  container?: ContainerResolver<any>
): Promise<InferData<InstanceType<Transformer>, Variant>>
export function transform<
  Data extends ConstructorParameters<Transformer>[0],
  Transformer extends { new (...args: any[]): any },
  Variant extends string = 'toObject',
>(
  data: Data[],
  transformer: Transformer,
  variant?: Variant | ExtractResourceVariants<InstanceType<Transformer>>,
  container?: ContainerResolver<any>
): Promise<InferData<InstanceType<Transformer>, Variant>[]>
export function transform<
  Data extends ConstructorParameters<Transformer>[0],
  Transformer extends { new (...args: any[]): any },
  Variant extends string = 'toObject',
>(
  data: Data | Data[],
  transformer: Transformer,
  variant?: Variant,
  container?: ContainerResolver<any>
):
  | Promise<InferData<InstanceType<Transformer>, Variant>>
  | Promise<InferData<InstanceType<Transformer>, Variant>[]> {
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
    ) as Promise<InferData<InstanceType<Transformer>, Variant>[]>
  }

  if (data === undefined || data === null) {
    throw new RuntimeException('Cannot transform null or undefined values')
  }

  return transformData(
    container ?? new Container().createResolver(),
    new transformer(data),
    variant ?? 'toObject',
    0
  ) as Promise<InferData<InstanceType<Transformer>, Variant>>
}
