import { bench } from '@ark/attest'
import { serialize } from '../src/serialize.ts'
import { User } from '../tests/fixtures/models/user.ts'
import { Post } from '../tests/fixtures/models/posts.ts'
import { PostTransformer } from '../tests/fixtures/transformers/post.ts'
import { UserTransformer } from '../tests/fixtures/transformers/user.ts'

await serialize(UserTransformer.transform(new User()))

bench('serialize', async () => {
  const post = new Post()
  const postDataObject1 = await serialize({
    posts: PostTransformer.transform([post]),
  })
  // const postDataObject = await PostTransformer.transform(post).serialize({} as any, 1)
  return { postDataObject1 }
}).types([1, 'instantiations'])
