/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger instance for AdonisJS data transformation operations.
 * Uses Node.js built-in util.debuglog for conditional logging based on NODE_DEBUG environment variable.
 *
 * @example
 * ```ts
 * debug('Transforming user data: %o', userData)
 * debug('Collection processing started with %d items', items.length)
 * ```
 */
export const debug = debuglog('adonisjs:data')
