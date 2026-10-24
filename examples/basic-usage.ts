/**
 * Basic usage from a Node.js script.
 *
 * Run: HASHNODE_PUBLICATION_HOST=blog.example.com node --experimental-strip-types examples/basic-usage.ts
 */

import { HashnodeClient, isHashnodeError } from '@jowinjohnchemban/hashnode-client';

const hashnode = new HashnodeClient(); // reads HASHNODE_PUBLICATION_HOST

try {
  const publication = await hashnode.getPublication();
  console.log(`Publication: ${publication?.title ?? '(not found)'}`);

  const { items: posts, pageInfo } = await hashnode.getPosts({ first: 5 });
  for (const post of posts) {
    const tags = post.tags?.map((tag) => tag.name).join(', ') ?? '';
    console.log(`- ${post.title} (${post.readTimeInMinutes} min) ${tags}`);
  }

  if (pageInfo.hasNextPage) {
    const next = await hashnode.getPosts({ first: 5, after: pageInfo.endCursor });
    console.log(`Next page has ${next.items.length} posts`);
  }

  const first = posts[0];
  if (first) {
    const post = await hashnode.getPost(first.slug);
    console.log(`\n${post?.title}\n${post?.content.text.slice(0, 200)}...`);
  }
} catch (error) {
  if (isHashnodeError(error) && error.code === 'FORBIDDEN') {
    console.error('Hashnode API access requires the publication to be on a Pro plan.');
  } else {
    throw error;
  }
}
