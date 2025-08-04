/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Item } from './item.js'
import type { Collection } from './collection.js'

/**
 * Counter to increment the depth. At max we will allow fetching
 * resources upto 6 levels deep. Beyond that is madness for any
 * sort of application
 */
export type Next = [1, 2, 3, 4, 5, 6]

/**
 * Values that are JSON.stringify friendly
 */
type JSONValues =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | undefined
  | CanBeSerialized<any>

/**
 * Helper to make sense of auto-generated types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * Representation of a value object
 */
export type CanBeSerialized<T extends JSONDataTypes> = {
  toJSON(): T
}

/**
 * Recursive JSON.stringify friendly values
 */
export type JSONDataTypes = JSONValues | JSONDataTypes[] | { [key: string]: JSONDataTypes }

/**
 * Extracts the variant methods of a resource. Any other that returns ResourceData
 * can be picked for serialization
 */
export type ExtractResourceVariants<Resource> = {
  [K in keyof Resource & string]: Resource[K] extends () => ResourceData | Promise<ResourceData>
    ? K
    : never
}[keyof Resource & string]

/**
 * Supported resource datatypes. The collections and items are supported only
 * at the top-level, since relationships in nested properties will lead
 * to a recursive "async" serialization which is 100x slower than
 * sync serialization.
 *
 * Never allow "ResourceDataTypes" recursively as that will make us resolve
 * collections and items recursively as well.
 */
export type ResourceDataTypes = JSONDataTypes | Collection<any, any, any> | Item<any, any, any, any>

/**
 * A record of resource data types. This is something every transformer
 * must return.
 */
export type ResourceData = Record<string, ResourceDataTypes>

/**
 * Unpacks the value of a key inside ResourceData. Collections and Items
 * are recursively processed.
 */
type UnpackKeyValue<Value, MaxDepth extends number, Depth extends number> = [
  Item<any, any, any, any>,
] extends [Value]
  ?
      | UnpackAsItem<Extract<Value, Item<any, any, any, any>>, MaxDepth, Depth>
      | Exclude<Value, Item<any, any, any, any>>
  : [Collection<any, any, any>] extends [Value]
    ?
        | UnpackAsCollection<Extract<Value, Collection<any, any, any>>, MaxDepth, Depth>
        | Exclude<Value, Collection<any, any, any>>
    : Value extends CanBeSerialized<infer B>
      ? B
      : Value extends JSONDataTypes
        ? Value
        : string

/**
 * Validates the Depth property against the MaxDepth and drops the key
 * when both are the same.
 *
 * Since there is no arithmetic checks in TypeScript, we cannot check of Depth >= MaxDepth.
 * We have to rely on Depth === MaxDepth and be careful about not incrementing the
 * depth unnecessarily as that might make the entire check fail
 */
type LimitDepth<Key, Value, MaxDepth extends number, Depth extends number> = [
  Item<any, any, any, any>,
] extends [Value]
  ? MaxDepth extends Depth
    ? never
    : Key
  : [Collection<any, any, any>] extends [Value]
    ? MaxDepth extends Depth
      ? never
      : Key
    : Key

/**
 * Only unpacks values that can be undefined and mark them as optional.
 */
export type UnpackOptionalValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? LimitDepth<K, Data[K], MaxDepth, Depth>
      : never
  }[keyof Data]]?: UnpackKeyValue<Data[O], MaxDepth, Depth>
}

/**
 * Only unpacks defined (including null) values.
 */
export type UnpackRequiredValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? never
      : LimitDepth<K, Data[K], MaxDepth, Depth>
  }[keyof Data]]: UnpackKeyValue<Data[O], MaxDepth, Depth>
}

/**
 * Unpacks an unknown value when it is an instance of "Item" class and
 * also increments the depth counter
 */
export type UnpackAsItem<T, MaxDepth extends number, Depth extends number> =
  T extends Item<infer Resource, infer LocalMaxDepth, infer Variant, infer Fallback>
    ? unknown extends Fallback
      ? InferData<Resource, Variant, MaxDepth extends -1 ? LocalMaxDepth : MaxDepth, Next[Depth]>
      :
          | InferData<
              Resource,
              Variant,
              MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
              Next[Depth]
            >
          | Fallback
    : never

/**
 * Unpacks an unknown value when it is an instance of "Collection" class and
 * also increments the depth counter
 */
export type UnpackAsCollection<T, MaxDepth extends number, Depth extends number> =
  T extends Collection<infer Resource, infer LocalMaxDepth, infer Variant>
    ? InferData<Resource, Variant, MaxDepth extends -1 ? LocalMaxDepth : MaxDepth, Next[Depth]>[]
    : never

/**
 * Unpack values as two set of optional and required values
 */
export type UnpackValues<Data, MaxDepth extends number, Depth extends number> = Prettify<
  UnpackRequiredValues<Data, MaxDepth, Depth> & UnpackOptionalValues<Data, MaxDepth, Depth>
>

/**
 * Infers data of a resource.
 */
export type InferData<
  Resource,
  Variant extends string = 'toObject',
  MaxDepth extends number = -1,
  Depth extends number = 0,
> = Resource extends { [K in Variant]: (...args: any[]) => unknown }
  ? UnpackValues<Awaited<ReturnType<Resource[Variant]>>, MaxDepth, Depth>
  : never
