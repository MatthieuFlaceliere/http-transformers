/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Prettify } from '@poppinss/types'
import { type ContainerResolver } from '@adonisjs/fold'

import type { Item } from './item.js'
import type { Collection } from './collection.js'

/**
 * Counter to increment the depth. At max we will allow fetching
 * resources upto 6 levels deep. Beyond that is madness for any
 * sort of application
 *
 * @example
 * ```typescript
 * type DepthCounter = Next[0] // 1
 * type NextDepth = Next[1]    // 2
 * ```
 */
export type Next = [1, 2, 3, 4, 5, 6]

/**
 * Values that are JSON.stringify friendly
 *
 * @example
 * ```typescript
 * const validValues: JSONValues[] = [
 *   "string",
 *   42,
 *   BigInt(123),
 *   true,
 *   new Date(),
 *   null,
 *   undefined,
 *   { toJSON: () => ({ key: "value" }) }
 * ]
 * ```
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
 * Representation of a value object that can be serialized to JSON
 *
 * @template T - The type that the toJSON method should return
 *
 * @example
 * ```typescript
 * class User implements CanBeSerialized<{ id: number; name: string }> {
 *   constructor(private id: number, private name: string) {}
 *
 *   toJSON() {
 *     return { id: this.id, name: this.name }
 *   }
 * }
 * ```
 */
export type CanBeSerialized<T extends JSONDataTypes> = {
  /**
   * Converts the object to a JSON-serializable representation
   */
  toJSON(): T
}

/**
 * Recursive JSON.stringify friendly values that can include arrays and nested objects
 *
 * @example
 * ```typescript
 * const simpleData: JSONDataTypes = "hello"
 * const arrayData: JSONDataTypes = [1, 2, 3]
 * const objectData: JSONDataTypes = {
 *   name: "John",
 *   age: 30,
 *   hobbies: ["reading", "coding"]
 * }
 * ```
 */
export type JSONDataTypes = JSONValues | JSONDataTypes[] | { [key: string]: JSONDataTypes }

/**
 * Extracts the variant methods of a resource. Any method that returns ResourceData
 * can be picked for serialization
 *
 * @template Resource - The resource class to extract variants from
 *
 * @example
 * ```typescript
 * class UserResource {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   invalidMethod() { return "not resource data" }
 * }
 *
 * type Variants = ExtractResourceVariants<UserResource> // "toObject" | "toSummary"
 * ```
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
 *
 * @example
 * ```typescript
 * const stringData: ResourceDataTypes = "hello"
 * const collectionData: ResourceDataTypes = new Collection(users, UserResource)
 * const itemData: ResourceDataTypes = new Item(user, UserResource)
 * ```
 */
export type ResourceDataTypes = JSONDataTypes | Collection<any, any, any> | Item<any, any, any, any>

/**
 * A record of resource data types. This is something every transformer
 * must return from their transformation methods.
 *
 * @example
 * ```typescript
 * class UserResource {
 *   toObject(): ResourceData {
 *     return {
 *       id: this.user.id,
 *       name: this.user.name,
 *       posts: new Collection(this.user.posts, PostResource)
 *     }
 *   }
 * }
 * ```
 */
export type ResourceData = Record<string, ResourceDataTypes>

/**
 * Unpacks the value of a key inside ResourceData. Collections and Items
 * are recursively processed with depth tracking.
 *
 * @template Value - The value type to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
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
 *
 * @template Key - The key to potentially limit
 * @template Value - The value associated with the key
 * @template MaxDepth - Maximum allowed depth
 * @template Depth - Current depth level
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
 *
 * @template Data - The data object to unpack optional values from
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type OptionalFields = UnpackOptionalValues<{
 *   name: string
 *   email?: string
 *   age: number | undefined
 * }, 3, 0>
 * // Result: { email?: string; age?: number }
 * ```
 */
export type UnpackOptionalValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? LimitDepth<K, Data[K], MaxDepth, Depth>
      : never
  }[keyof Data]]?: UnpackKeyValue<Data[O], MaxDepth, Depth>
}

/**
 * Only unpacks defined (including null) values as required properties.
 *
 * @template Data - The data object to unpack required values from
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type RequiredFields = UnpackRequiredValues<{
 *   name: string
 *   email?: string
 *   age: number | null
 * }, 3, 0>
 * // Result: { name: string; age: number | null }
 * ```
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
 * also increments the depth counter for nested resource resolution.
 *
 * @template T - The Item type to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type UnpackedItem = UnpackAsItem<Item<User, 3, "toObject", never>, 3, 0>
 * // Result: inferred data structure from User.toObject()
 * ```
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
 * also increments the depth counter for nested resource resolution.
 *
 * @template T - The Collection type to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type UnpackedCollection = UnpackAsCollection<Collection<User[], 3, "toObject">, 3, 0>
 * // Result: Array of inferred data structures from User.toObject()
 * ```
 */
export type UnpackAsCollection<T, MaxDepth extends number, Depth extends number> =
  T extends Collection<infer Resource, infer LocalMaxDepth, infer Variant>
    ? InferData<Resource, Variant, MaxDepth extends -1 ? LocalMaxDepth : MaxDepth, Next[Depth]>[]
    : never

/**
 * Unpack values as two sets of optional and required values, then merge them
 * into a single prettified type.
 *
 * @template Data - The data object to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type UnpackedData = UnpackValues<{
 *   name: string
 *   email?: string
 *   posts: Collection<Post[], 3, "toObject">
 * }, 3, 0>
 * // Result: { name: string; email?: string; posts: PostData[] }
 * ```
 */
export type UnpackValues<Data, MaxDepth extends number, Depth extends number> = Prettify<
  UnpackRequiredValues<Data, MaxDepth, Depth> & UnpackOptionalValues<Data, MaxDepth, Depth>
>

/**
 * Infers the serialized data structure of a resource by extracting the return type
 * of a specific variant method and unpacking it recursively.
 *
 * @template Resource - The resource class to infer data from
 * @template Variant - The variant method name to use (defaults to 'toObject')
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * @example
 * ```typescript
 * class UserResource {
 *   toObject() {
 *     return {
 *       id: this.user.id,
 *       name: this.user.name,
 *       posts: new Collection(this.user.posts, PostResource)
 *     }
 *   }
 * }
 *
 * type UserData = InferData<UserResource> // { id: number; name: string; posts: PostData[] }
 * ```
 */
export type InferData<
  Resource,
  Variant extends string = 'toObject',
  MaxDepth extends number = -1,
  Depth extends number = 0,
> = Resource extends { [K in Variant]: (...args: any[]) => unknown }
  ? UnpackValues<Awaited<ReturnType<Resource[Variant]>>, MaxDepth, Depth>
  : never

/**
 * Transform function type that handles both single items and arrays of data.
 * Provides overloaded signatures for transforming data using resource transformers.
 *
 * @example
 * ```typescript
 * const transform: TransformFn = async (data, transformer, variant, container) => {
 *   // Implementation handles both single items and arrays
 *   // Returns properly typed results based on input
 * }
 *
 * // Usage examples:
 * const singleUser = await transform(userData, UserResource, "toObject")
 * const userList = await transform([userData1, userData2], UserResource, "toSummary")
 * ```
 */
export type TransformFn = {
  /**
   * Transforms a single data item using the specified transformer and variant
   *
   * @param data - The data item to transform
   * @param transformer - The transformer class constructor
   * @param variant - The variant method to use for transformation
   * @param container - Optional container resolver for dependency injection
   */
  <
    Data extends ConstructorParameters<Transformer>[0],
    Transformer extends { new (...args: any[]): any },
    Variant extends string = 'toObject',
  >(
    data: Data,
    transformer: Transformer,
    variant?: Variant | ExtractResourceVariants<InstanceType<Transformer>>,
    container?: ContainerResolver<any>
  ): Promise<InferData<InstanceType<Transformer>, Variant>>
  /**
   * Transforms an array of data items using the specified transformer and variant
   *
   * @param data - The array of data items to transform
   * @param transformer - The transformer class constructor
   * @param variant - The variant method to use for transformation
   * @param container - Optional container resolver for dependency injection
   */
  <
    Data extends ConstructorParameters<Transformer>[0],
    Transformer extends { new (...args: any[]): any },
    Variant extends string = 'toObject',
  >(
    data: Data[],
    transformer: Transformer,
    variant?: Variant | ExtractResourceVariants<InstanceType<Transformer>>,
    container?: ContainerResolver<any>
  ): Promise<InferData<InstanceType<Transformer>, Variant>[]>
}
