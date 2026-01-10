import { bench } from '@ark/attest'
import { apiSerializer, container } from '../tests/helpers.ts'
import { User } from '../tests/fixtures/models/user.ts'
import { Post } from '../tests/fixtures/models/posts.ts'
import { PostTransformer } from '../tests/fixtures/transformers/post.ts'
import { UserTransformer } from '../tests/fixtures/transformers/user.ts'

await apiSerializer.serialize(UserTransformer.transform(new User()), container.createResolver())

bench('serialize', async () => {
  const post = new Post()
  const postDataObject1 = await apiSerializer.serialize(
    PostTransformer.transform([post]),
    container.createResolver()
  )
  return { postDataObject1 }
}).types([1, 'instantiations'])
