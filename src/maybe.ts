/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * A wrapper class that allows optional values to be passed to transformers
 * without causing errors when the value is undefined
 *
 * @example
 * ```ts
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return {
 *       id: this.resource.id,
 *       profile: this.whenLoaded(this.resource.profile) // Returns Maybe<Profile>
 *     }
 *   }
 * }
 * ```
 */
export class Maybe<T> {
  /**
   * Creates a new Maybe wrapper for a value
   *
   * @param value - The value to wrap, which may be undefined
   *
   * @example
   * ```ts
   * const maybeUser = new Maybe(userData)
   * const maybeUndefined = new Maybe(undefined)
   * ```
   */
  constructor(
    /**
     * The wrapped value, which may be undefined
     */
    public value: T
  ) {}
}
