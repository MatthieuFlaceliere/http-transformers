import { bench } from '@ark/attest'
import { serialize } from '../src/serialize.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import { Post } from './fixtures/models/posts.ts'
import { PostTransformer } from './fixtures/transformers/post.ts'

bench('serialize', async () => {
  const post = new Post()
  const postTransformer = new PostTransformer(post)
  const postDataObject1 = await serialize(PostTransformer.transform(post))
  const postDataObject = await PostTransformer.transform(post).serialize({} as any, 1)
  return { postDataObject, postDataObject1 }
}).types([1, 'instantiations'])
