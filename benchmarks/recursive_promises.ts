// @ts-ignore
import Benchmark from 'benchmark'
import { type ResourceDataTypes } from '../src/types.ts'
const suite = new Benchmark.Suite()

function lazy<T>(resolver: T): T {
  return resolver
}

const data = {
  id: 1,
  name: 'virk',
  posts: lazy(() => {
    return [
      {
        id: 1,
        md: lazy(() => {
          return 'Hello world'
        }),
      },
      {
        id: 2,
        md: lazy(() => {
          return 'Hi world'
        }),
      },
    ]
  }),
  address: lazy(() => {
    return {
      id: 1,
      attributes: lazy(() => {
        return {
          state: 'HR',
          country: 'IN',
          pincode: 121001,
        }
      }),
    }
  }),
}

async function getData() {
  return {
    id: 1,
    name: 'virk',
    posts: await lazy(async () => {
      return [
        {
          id: 1,
          md: await lazy(async () => {
            return 'Hello world'
          })(),
        },
        {
          id: 2,
          md: await lazy(async () => {
            return 'Hi world'
          })(),
        },
      ]
    })(),
    address: await lazy(async () => {
      return {
        id: 1,
        attributes: await lazy(async () => {
          return {
            state: 'HR',
            country: 'IN',
            pincode: 121001,
          }
        })(),
      }
    })(),
  }
}

const topLevelAsyncData = {
  id: 1,
  name: 'virk',
  posts: lazy(async () => {
    return [
      {
        id: 1,
        md: 'Hello world',
      },
      {
        id: 2,
        md: 'Hi world',
      },
    ]
  }),
  address: lazy(async () => {
    return {
      id: 1,
      attributes: {
        state: 'HR',
        country: 'IN',
        pincode: 121001,
      },
    }
  }),
}

async function promiseAllResolve(input: ResourceDataTypes): Promise<ResourceDataTypes> {
  const typeOf = typeof input
  if (typeOf === 'bigint') {
    return input
  }

  if (typeOf === 'function') {
    let output = (input as any)()
    if (output instanceof Promise) {
      output = await output
    }
    return promiseAllResolve(output)
  }

  if (Array.isArray(input)) {
    const output = [...input]
    const promises = []
    for (const key in output) {
      promises.push(
        promiseAllResolve(output[key]).then((resolved) => ((output as any)[key] = resolved))
      )
    }

    await Promise.all(promises)
    return output
  }

  if (typeOf === 'object' && input !== null) {
    const output = { ...(input as Record<string, any>) }
    const promises = []
    for (const key in output) {
      promises.push(promiseAllResolve(output[key]).then((resolved) => (output[key] = resolved)))
    }

    await Promise.all(promises)
    return output
  }

  return input
}

async function awaitAll(input: ResourceDataTypes): Promise<ResourceDataTypes> {
  let output = input
  if (typeof input === 'function') {
    const result = (input as any)()
    if (result instanceof Promise) {
      output = await awaitAll(await result)
    } else {
      output = await awaitAll(result)
    }
  } else if (typeof input === 'object' && input !== null) {
    output = Array.isArray(input) ? [] : {}
    for (const [key, value] of Object.entries(input)) {
      ;(output as any)[key] = await awaitAll(value)
    }
  }

  return output
}

function recursiveSync(input: ResourceDataTypes): ResourceDataTypes {
  let output = input
  if (typeof input === 'function') {
    output = recursiveSync((input as any)())
  } else if (typeof input === 'object' && input !== null) {
    output = Array.isArray(input) ? [] : {}
    for (const [key, value] of Object.entries(input)) {
      ;(output as any)[key] = recursiveSync(value)
    }
  }
  return output
}

async function topLevelAwait(input: ResourceDataTypes): Promise<ResourceDataTypes> {
  let output = input
  if (typeof input === 'function') {
    output = recursiveSync((input as any)())
  } else if (typeof input === 'object' && input !== null) {
    output = Array.isArray(input) ? [] : {}
    for (const [key, value] of Object.entries(input)) {
      ;(output as any)[key] = recursiveSync(typeof value === 'function' ? await value() : value)
    }
  }
  return output
}

console.log('Promise.all', await promiseAllResolve(data as any))
console.log('Await', await awaitAll(data as any))
console.log('Sync', recursiveSync(await getData()))
console.log('Top-level await', await topLevelAwait(topLevelAsyncData as any))

/**
 * Based on this benchmarks, having async items within the
 * object will be brutal. Therefore we should not allow
 * floating promises as object values.
 */

suite
  .add('Promise.all', {
    defer: true,
    fn: function (deferred: any) {
      promiseAllResolve(data as any).then(() => deferred.resolve())
    },
  })
  .add('Await', {
    defer: true,
    fn: function (deferred: any) {
      awaitAll(data as any).then(() => deferred.resolve())
    },
  })
  .add('Sync', {
    defer: true,
    fn: function (deferred: any) {
      getData().then((d) => {
        recursiveSync(d)
        deferred.resolve()
      })
    },
  })
  .add('Top-level await', {
    defer: true,
    fn: function (deferred: any) {
      topLevelAwait(topLevelAsyncData as any).then(() => {
        deferred.resolve()
      })
    },
  })
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({ async: true })
