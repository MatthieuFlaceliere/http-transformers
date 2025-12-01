/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type ContainerResolver } from '@adonisjs/fold'
import { type Prettify, type ExtractUndefined, type ExtractDefined } from '@poppinss/types'
import { type BaseTransformer } from './base_transformer.ts'

/**
 * Counter to increment the depth. At max we will allow fetching
 * resources up to 6 levels deep. Beyond that is madness for any
 * sort of application.
 *
 * ```typescript
 * type DepthCounter = Next[0] // 1
 * type NextDepth = Next[1]    // 2
 * ```
 */
export type Next = [1, 2, 3, 4, 5, 6]

/**
 * Represents primitive types that can be safely serialized to JSON.
 */
export type JSONPrimitives = string | number | bigint | boolean | null | undefined

/**
 * Values that are JSON.stringify friendly, including primitives and objects
 * that can be serialized via a toJSON method.
 *
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
export type JSONValues = JSONPrimitives | CanBeSerialized<any>

/**
 * Representation of a value object that can be serialized to JSON via a toJSON method.
 *
 * @template T - The type that the toJSON method should return
 *
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
 * Recursive JSON.stringify friendly values that can include arrays and nested objects.
 *
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
 * Helper type to serialize object types while preserving required and optional properties.
 */
export type SerializeJSONObject<T> = {
  [K in ExtractDefined<T>]: SerializeJSONTypes<T[K]>
} & {
  [K in ExtractUndefined<T>]?: SerializeJSONTypes<T[K]>
}

export interface ExtendJSONTypes {}
export type NonAllowedJSTypes = Map<any, any> | Set<any>
export type ForcefullyAllowedTypes = {
  [K in keyof ExtendJSONTypes]: ExtendJSONTypes[K]
}[keyof ExtendJSONTypes]

/**
 * Helper type to recursively serialize types, handling primitives, arrays, and objects.
 */
export type SerializeJSONOwnTypes<T> = T extends JSONPrimitives
  ? T
  : T extends ForcefullyAllowedTypes
    ? T
    : T extends NonAllowedJSTypes
      ? never
      : T extends Array<infer item>
        ? Array<SerializeJSONTypes<item>>
        : T extends object
          ? Prettify<SerializeJSONObject<T>>
          : never

/**
 * Main serialization type that handles objects with toJSON methods.
 */
export type SerializeJSONTypes<T> =
  T extends CanBeSerialized<infer A> ? SerializeJSONOwnTypes<A> : SerializeJSONOwnTypes<T>

/**
 * Contract interface for Item instances used in type inference.
 */
export interface ItemContract<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  $type: 'item'
  transformer: { new (...args: any[]): Transformer }
  maxDepth: MaxDepth
  variant: Variant
}

/**
 * Contract interface for Collection instances used in type inference.
 */
export interface CollectionContract<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  $type: 'collection'
  transformer: { new (...args: any[]): Transformer }
  maxDepth: MaxDepth
  variant: Variant
}

/**
 * Contract interface for Paginator instances used in type inference.
 */
export interface PaginatorContract<
  PaginatorCollection extends CollectionContract<any, any, any>,
  MetaData extends Record<string, any>,
> {
  $type: 'paginator'
  collection: PaginatorCollection
  metaData: MetaData
}

/**
 * Extracts the variant methods of a transformer class. Any method that returns ResourceData
 * or Promise<ResourceData> can be picked for serialization.
 *
 * This utility type filters all methods of a transformer class to only include those
 * that return the correct data types for resource serialization.
 *
 * @template Transformer - The transformer class to extract variant methods from
 *
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
 * Supported resource data types. Collections and Items are supported only
 * at the top-level, since relationships in nested properties will lead
 * to recursive async serialization which is significantly slower.
 *
 * Never allow "ResourceDataTypes" recursively as that will make us resolve
 * collections and items recursively as well.
 *
 * ```typescript
 * const stringData: ResourceDataTypes = "hello"
 * const collectionData: ResourceDataTypes = new Collection(users, UserResource)
 * const itemData: ResourceDataTypes = new Item(user, UserResource)
 * ```
 */
export type ResourceDataTypes =
  | JSONDataTypes
  | CollectionContract<any, any, any>
  | ItemContract<any, any, any>

/**
 * A record of resource data types. This is what every transformer
 * must return from their transformation methods.
 *
 * ```typescript
 * class UserResource {
 *   toObject(): ResourceData {
 *     return {
 *       id: this.user.id,
 *       name: this.user.name,
 *       posts: PostTransformer.transform(this.user.posts)
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
 * @internal
 */
export type UnpackKeyValue<
  Value extends [any, any],
  MaxDepth extends number,
  Depth extends number,
> = [Value[0]] extends [never]
  ? SerializeJSONTypes<Value[1]>
  : Value[0] extends ItemContract<infer Transformer, infer LocalMaxDepth, infer Variant>
    ?
        | InferData<
            Transformer,
            Variant,
            MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
            Next[Depth]
          >
        | SerializeJSONTypes<Value[1]>
    : Value[0] extends CollectionContract<infer Transformer, infer LocalMaxDepth, infer Variant>
      ?
          | InferData<
              Transformer,
              Variant,
              MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
              Next[Depth]
            >[]
          | SerializeJSONTypes<Value[1]>
      : SerializeJSONTypes<Value[1]>

/**
 * Validates the Depth property against the MaxDepth and drops the key
 * when both are the same.
 *
 * Since there are no arithmetic checks in TypeScript, we cannot check if Depth >= MaxDepth.
 * We have to rely on Depth === MaxDepth and be careful about not incrementing the
 * depth unnecessarily as that might make the entire check fail.
 *
 * @internal
 */
export type LimitDepth<Key, Value, MaxDepth extends number, Depth extends number> = [
  Value,
] extends [never]
  ? Key
  : Value extends ItemContract<any, any, any>
    ? MaxDepth extends Depth
      ? never
      : Key
    : Value extends CollectionContract<any, any, any>
      ? MaxDepth extends Depth
        ? never
        : Key
      : Key

/**
 * Only unpacks values that can be undefined and marks them as optional.
 *
 * @internal
 */
export type UnpackOptionalValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? LimitDepth<K, SplitItm<Data[K]>[0], MaxDepth, Depth>
      : never
  }[keyof Data]]?: UnpackKeyValue<SplitItm<Data[O]>, MaxDepth, Depth>
}

/**
 * Only unpacks defined (including null) values as required properties.
 *
 * @internal
 */
export type UnpackRequiredValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? never
      : LimitDepth<K, SplitItm<Data[K]>[0], MaxDepth, Depth>
  }[keyof Data]]: UnpackKeyValue<SplitItm<Data[O]>, MaxDepth, Depth>
}

/**
 * Internal helper type to split Item/Collection types from other types.
 *
 * @internal
 */
export type SplitItm<T> = [
  Extract<T, ItemContract<any, any, any> | CollectionContract<any, any, any>>,
  Exclude<T, ItemContract<any, any, any> | CollectionContract<any, any, any>>,
]

/**
 * Unpacks an Item instance at the top level of serialization.
 *
 * @internal
 */
export type UnpackAsTopLevelItem<T> =
  T extends ItemContract<infer Transformer, any, infer Variant>
    ? InferData<Transformer, Variant, -1, 0>
    : never

/**
 * Unpacks a Collection instance at the top level of serialization.
 *
 * @internal
 */
export type UnpackAsTopLevelCollection<T> =
  T extends CollectionContract<infer Transformer, any, infer Variant>
    ? InferData<Transformer, Variant, -1, 0>[]
    : never

/**
 * Unpacks a Paginator instance at the top level of serialization.
 *
 * @internal
 */
export type UnpackAsTopLevelPaginator<T> =
  T extends PaginatorContract<infer Collection, infer MetaData>
    ? {
        data: UnpackAsTopLevelCollection<Collection>
        meta: MetaData
      }
    : never

/**
 * Unpacks values as two sets of optional and required values, then merges them
 * into a single prettified type.
 *
 * @internal
 */
export type UnpackValues<Data, MaxDepth extends number, Depth extends number> = Prettify<
  UnpackRequiredValues<Data, MaxDepth, Depth> & UnpackOptionalValues<Data, MaxDepth, Depth>
>

/**
 * Unpack as top-level data object
 */
export type UnpackTopLevelValues<Data> = Prettify<
  {
    [K in ExtractDefined<Data>]: Data[K] extends PaginatorContract<infer Collection, infer MetaData>
      ? {
          data: UnpackAsTopLevelCollection<Collection>
          meta: MetaData
        }
      : UnpackKeyValue<SplitItm<Data[K]>, -1, 0>
  } & {
    [K in ExtractUndefined<Data>]?: Data[K] extends PaginatorContract<
      infer Collection,
      infer MetaData
    >
      ? {
          data: UnpackAsTopLevelCollection<Collection>
          meta: MetaData
        }
      : UnpackKeyValue<SplitItm<Data[K]>, -1, 0>
  }
>

/**
 * Infers the serialized data structure of a transformer by extracting the return type
 * of a specific variant method and unpacking it recursively.
 *
 * This is the primary type used to extract the TypeScript type of a transformer's output.
 *
 * @template Transformer - The transformer class to infer data from
 * @template Variant - The variant method name to use (defaults to 'toObject')
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * ```typescript
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return {
 *       id: this.resource.id,
 *       name: this.resource.name,
 *       posts: PostTransformer.transform(this.resource.posts)
 *     }
 *   }
 * }
 *
 * type UserData = InferData<UserTransformer>
 * // Result: { id: number; name: string; posts: PostData[] }
 * ```
 */
export type InferData<
  Transformer,
  Variant extends string = 'toObject',
  MaxDepth extends number = -1,
  Depth extends number = 0,
> = Transformer extends { [K in Variant]: (...args: any[]) => unknown }
  ? UnpackValues<Awaited<ReturnType<Transformer[Variant]>>, MaxDepth, Depth>
  : never

/**
 * Infers the data structure for all variant methods of a transformer class, excluding
 * the default 'toObject' method and base transformer methods.
 *
 * Use this type to extract types for all custom variant methods defined on a transformer.
 *
 * @template Transformer - The transformer class to infer variant data from
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * ```typescript
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   toProfile() { return { id: 1, name: "John", email: "john@example.com" } }
 * }
 *
 * type UserVariants = InferVariants<UserTransformer>
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
 * ```typescript
 * const serialize: SerializeFn = (data, container) => {
 *   // Implementation handles different data types
 *   return Promise.resolve(serializedData)
 * }
 *
 * // Usage examples:
 * const userItem = UserTransformer.transform(userData)
 * const serializedUser = await serialize(userItem)
 *
 * const usersCollection = UserTransformer.transform(usersData)
 * const serializedUsers = await serialize(usersCollection)
 * ```
 */
export type SerializeFn = {
  /**
   * Serializes a record of resource data types into plain JavaScript objects. The
   * top-level object passed to the serialize function could contain paginator
   * objects as well.
   *
   * @template Data - Record type containing resource data
   * @param data - The resource data record to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to unpacked and serialized data
   */
  <Data extends Record<string, ResourceDataTypes | PaginatorContract<any, any>>>(
    data: Data,
    container?: ContainerResolver<any>
  ): Promise<UnpackTopLevelValues<Data>>

  /**
   * Serializes an Item resource into its plain JavaScript representation.
   *
   * @template ResourceItem - Item type to serialize
   * @param resource - The Item resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to the serialized Item data
   */
  <ResourceItem extends ItemContract<any, any, any>>(
    resource: ResourceItem,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelItem<ResourceItem>>

  /**
   * Serializes a Collection resource into an array of plain JavaScript objects.
   *
   * @template ResourceCollection - Collection type to serialize
   * @param collection - The Collection resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to an array of serialized data
   */
  <ResourceCollection extends CollectionContract<any, any, any>>(
    collection: ResourceCollection,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelCollection<ResourceCollection>>

  /**
   * Serializes a Paginator resource into paginated data with metadata.
   *
   * @template ResourcePaginator - Paginator type to serialize
   * @param paginator - The Paginator resource to serialize
   * @param container - Optional container resolver for dependency injection
   * @returns Promise resolving to paginated data with metadata
   */
  <ResourcePaginator extends PaginatorContract<any, any>>(
    paginator: ResourcePaginator,
    container?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelPaginator<ResourcePaginator>>

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
