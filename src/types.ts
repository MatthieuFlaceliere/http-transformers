/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Jsonify } from 'type-fest'
import { type Prettify } from '@poppinss/types'
import { type ContainerResolver } from '@adonisjs/fold'

import { type Paginator } from './paginator.ts'
import { type BaseTransformer } from './base_transformer.ts'
import { type Collection } from './resource/collection.ts'
import { type Item } from './resource/item.ts'

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

export type JSONPrimitives = string | number | bigint | boolean | null | undefined

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
export type JSONValues = JSONPrimitives | Date | CanBeSerialized<any>

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

export type GetOptional<T> = {
  [K in keyof T]: [undefined] extends [T[K]] ? K : never
}[keyof T]
export type GetRequired<T> = {
  [K in keyof T]: [undefined] extends [T[K]] ? never : K
}[keyof T]

export type SerializeJSONObject<T> = {
  [K in keyof T]: T[K]
}

type JsonifyList<T extends unknown[]> = T extends readonly []
  ? []
  : Array<SerializeJSONTypes<T[number]>>

export type UndefinedToOptional<T extends object> = {
  [Key in GetRequired<T>]: T[Key]
} & {
  [Key in GetOptional<T>]?: T[Key]
}

export type SerializeJSONTypes<T> =
  T extends CanBeSerialized<infer A>
    ? SerializeJSONTypes<A>
    : T extends JSONPrimitives
      ? T
      : T extends unknown[]
        ? JsonifyList<T>
        : T extends object
          ? Prettify<SerializeJSONObject<UndefinedToOptional<T>>>
          : string

/**
 * Extracts the variant methods of a transformer class. Any method that returns ResourceData
 * or Promise<ResourceData> can be picked for serialization.
 *
 * This utility type filters all methods of a transformer class to only include those
 * that return the correct data types for resource serialization.
 *
 * @template Transformer - The transformer class to extract variant methods from
 *
 * @example
 * ```typescript
 * class UserResource {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   invalidMethod() { return "not resource data" }
 * }
 *
 * type Variants = ExtractTransformerVariants<UserResource> // "toObject" | "toSummary"
 * ```
 */
export type ExtractTransformerVariants<Transformer> = {
  [K in keyof Transformer & string]: Transformer[K] extends (
    ...args: any[]
  ) => ResourceData | Promise<ResourceData>
    ? K
    : never
}[keyof Transformer & string]

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
export type ResourceDataTypes =
  | JSONDataTypes
  | Collection<any, any, any>
  | Item<any, any, any>
  | Paginator<any, any, any>

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
export type UnpackKeyValue<
  Value,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = [Item<any, any, any>] extends [Value]
  ? UnpackAsItem<Value, MaxDepth, Depth, AtTopLevel>
  : [Collection<any, any, any>] extends [Value]
    ? UnpackAsCollection<Value, MaxDepth, Depth, AtTopLevel>
    : [Paginator<any, any, any>] extends [Value]
      ? UnpackAsPaginator<Value, MaxDepth, Depth, AtTopLevel>
      : Jsonify<Value>

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
 *
 * @example
 * ```typescript
 * type LimitedKey = LimitDepth<"posts", Collection<Post, 2, "toObject">, 2, 2>
 * // Result: never (key is dropped because depth limit is reached)
 *
 * type AllowedKey = LimitDepth<"posts", Collection<Post, 2, "toObject">, 3, 2>
 * // Result: "posts" (key is allowed because depth limit is not reached)
 * ```
 */
export type LimitDepth<Key, Value, MaxDepth extends number, Depth extends number> = [
  Item<any, any, any>,
] extends [Value]
  ? MaxDepth extends Depth
    ? never
    : Key
  : [Collection<any, any, any>] extends [Value]
    ? MaxDepth extends Depth
      ? never
      : Key
    : [Paginator<any, any, any>] extends [Value]
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
export type UnpackOptionalValues<
  Data,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? LimitDepth<K, Data[K], MaxDepth, Depth>
      : never
  }[keyof Data]]?: UnpackKeyValue<Data[O], MaxDepth, Depth, AtTopLevel>
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
export type UnpackRequiredValues<
  Data,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? never
      : LimitDepth<K, Data[K], MaxDepth, Depth>
  }[keyof Data]]: UnpackKeyValue<Data[O], MaxDepth, Depth, AtTopLevel>
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
export type UnpackAsItem<
  T,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = AtTopLevel extends true
  ? T extends Item<infer Transformer, any, infer Variant>
    ? InferData<Transformer, Variant, -1, 0>
    : T
  : T extends Item<infer Transformer, infer LocalMaxDepth, infer Variant>
    ? InferData<Transformer, Variant, MaxDepth extends -1 ? LocalMaxDepth : MaxDepth, Next[Depth]>
    : T

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
export type UnpackAsCollection<
  T,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = AtTopLevel extends true
  ? T extends Collection<infer Transformer, any, infer Variant>
    ? InferData<Transformer, Variant, -1, 0>[]
    : T
  : T extends Collection<infer Transformer, infer LocalMaxDepth, infer Variant>
    ? InferData<
        Transformer,
        Variant,
        MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
        Depth extends -1 ? 0 : Next[Depth]
      >[]
    : T

/**
 * Unpacks a Paginator type with depth tracking for nested relationships.
 * Combines the unpacked collection data with pagination metadata.
 *
 * @template T - The Paginator type to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking
 * @template Depth - Current depth level
 *
 * @example
 * ```typescript
 * type UserPaginator = Paginator<Collection<UserTransformer, 2, "toObject">, "data", { page: number }>
 * type UnpackedPaginator = UnpackAsPaginator<UserPaginator, 3, 0>
 * // Result: { data: UserData[]; page: number }
 * ```
 */
export type UnpackAsPaginator<
  T,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> =
  T extends Paginator<infer PaginatorCollection, infer DataProp, infer MetaData>
    ? Prettify<
        {
          [M in DataProp]: UnpackAsCollection<PaginatorCollection, MaxDepth, Depth, AtTopLevel>
        } & MetaData
      >
    : T

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
export type UnpackValues<
  Data,
  MaxDepth extends number,
  Depth extends number,
  AtTopLevel extends boolean,
> = Prettify<
  UnpackRequiredValues<Data, MaxDepth, Depth, AtTopLevel> &
    UnpackOptionalValues<Data, MaxDepth, Depth, AtTopLevel>
>

/**
 * Infers the serialized data structure of a resource by extracting the return type
 * of a specific variant method and unpacking it recursively.
 *
 * @template Transformer - The resource class to infer data from
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
  Transformer,
  Variant extends string = 'toObject',
  MaxDepth extends number = -1,
  Depth extends number = 0,
> = Transformer extends { [K in Variant]: (...args: any[]) => unknown }
  ? UnpackValues<Awaited<ReturnType<Transformer[Variant]>>, MaxDepth, Depth, false>
  : never

/**
 * Infers the data structure for all variant methods of a transformer class, excluding
 * the default 'toObject' method and base transformer methods.
 *
 * @template Transformer - The resource class to infer variant data from
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * @example
 * ```typescript
 * class UserResource {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   toProfile() { return { id: 1, name: "John", email: "john@example.com" } }
 * }
 *
 * type UserVariants = InferVariants<UserResource>
 * // Result: {
 * //   toSummary: { id: number }
 * //   toProfile: { id: number; name: string; email: string }
 * // }
 * ```
 */
export type InferVariants<Transformer, MaxDepth extends number = -1, Depth extends number = 0> = {
  [O in {
    [K in keyof Transformer]: 'toObject' extends K
      ? never
      : K extends keyof BaseTransformer<any>
        ? never
        : Transformer[K] extends (...args: any[]) => unknown
          ? K
          : never
  }[keyof Transformer] &
    string]: InferData<Transformer, O, MaxDepth, Depth>
}

/**
 * Function interface for the main serialize function that handles different data types.
 * Provides overloads for serializing Items, Collections, Paginators, and resource data.
 *
 * @example
 * ```typescript
 * const serialize: SerializeFn = (data, container) => {
 *   // Implementation handles different data types
 *   return Promise.resolve(serializedData)
 * }
 *
 * // Usage examples:
 * const userItem = UserTransformer.item(userData)
 * const serializedUser = await serialize(userItem)
 *
 * const usersCollection = UserTransformer.collection(usersData)
 * const serializedUsers = await serialize(usersCollection)
 * ```
 */
export type SerializeFn = {
  /**
   * Serializes a record of resource data types into plain JavaScript objects.
   *
   * @template Data - Record type containing resource data
   * @param data - The resource data record to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to unpacked and serialized data
   */
  <Data extends Record<string, ResourceDataTypes>>(
    data: Data,
    container?: ContainerResolver<any>
  ): Promise<UnpackValues<Data, -1, 0, true>>

  /**
   * Serializes an Item resource into its plain JavaScript representation.
   *
   * @template ResourceItem - Item type to serialize
   * @param resource - The Item resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to the serialized Item data
   */
  <ResourceItem extends Item<any, any, any>>(
    resource: ResourceItem,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsItem<ResourceItem, -1, 0, true>>

  /**
   * Serializes a Collection resource into an array of plain JavaScript objects.
   *
   * @template ResourceCollection - Collection type to serialize
   * @param collection - The Collection resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to an array of serialized data
   */
  <ResourceCollection extends Collection<any, any, any>>(
    collection: ResourceCollection,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsCollection<ResourceCollection, -1, 0, true>>

  /**
   * Serializes a Paginator resource into paginated data with metadata.
   *
   * @template ResourcePaginator - Paginator type to serialize
   * @param paginator - The Paginator resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to paginated data with metadata
   */
  <ResourcePaginator extends Paginator<any, any, any>>(
    paginator: ResourcePaginator,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsPaginator<ResourcePaginator, -1, 0, true>>

  /**
   * Serializes any other value by returning it as-is wrapped in a Promise.
   * This fallback overload handles values that don't match the specific resource types.
   *
   * @template Value - The value type to serialize
   * @param value - The value to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to the original value unchanged
   */
  <Value>(value: Value, container?: ContainerResolver<any>): Promise<Value>
}
