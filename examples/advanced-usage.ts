/**
 * Advanced Usage Example
 * 
 * This example demonstrates advanced features including:
 * - Direct service access
 * - Pagination handling
 * - Error handling patterns
 * - Combining multiple API calls
 */

import { hashnodeService } from '../service';
import type { BlogPost, BlogPostDetail } from '../types';

async function main() {
  console.log('🚀 Hashnode Client - Advanced Usage Examples\n');

  // Example 1: Direct Service Access
  console.log('1️⃣  Using direct service access for advanced control...');
  try {
    const posts = await hashnodeService.getBlogPosts(3);
    console.log(`   ✓ Fetched ${posts.length} posts directly from service`);
    
    // Service methods throw on error (unlike facade functions)
    const post = await hashnodeService.getBlogPostBySlug(posts[0].slug);
    console.log(`   ✓ Full content length: ${post?.content?.html?.length} chars\n`);
  } catch (error) {
    console.error('   ✗ Service error:', error);
  }

  // Example 2: Building a Blog Homepage
  console.log('2️⃣  Building complete blog homepage data...');
  const homepage = await buildHomepage();
  console.log(`   ✓ Homepage data collected:`);
  console.log(`      - ${homepage.posts.length} recent posts`);
  console.log(`      - ${homepage.series.length} series`);
  console.log(`      - ${homepage.recommended.length} recommended blogs`);
  console.log(`      - Publication: ${homepage.publication?.title}\n`);

  // Example 3: Search with Multiple Keywords
  console.log('3️⃣  Searching with multiple keywords...');
  const keywords = ['typescript', 'react', 'nextjs'];
  for (const keyword of keywords) {
    const results = await hashnodeService.searchPosts(keyword, 2);
    console.log(`   "${keyword}": ${results.length} results`);
  }
  console.log();

  // Example 4: Fetching All Series Posts
  console.log('4️⃣  Fetching complete series with all posts...');
  const seriesWithPosts = await fetchSeriesWithPosts();
  seriesWithPosts.forEach((series) => {
    console.log(`   📚 ${series.name}: ${series.posts.length} posts`);
  });
  console.log();

  // Example 5: Building Post Navigation
  console.log('5️⃣  Building post navigation (prev/next)...');
  const allPosts = await hashnodeService.getBlogPosts(20);
  if (allPosts.length >= 3) {
    const currentIndex = 5;
    const navigation = buildPostNavigation(allPosts, currentIndex);
    console.log(`   Current: ${navigation.current.title}`);
    console.log(`   Previous: ${navigation.previous?.title || 'None'}`);
    console.log(`   Next: ${navigation.next?.title || 'None'}\n`);
  }

  // Example 6: Fetching Post with Comments
  console.log('6️⃣  Fetching post with comments...');
  const posts = await hashnodeService.getBlogPosts(1);
  if (posts.length > 0) {
    const postWithComments = await fetchPostWithComments(posts[0].id);
    console.log(`   Post: ${postWithComments.post.title}`);
    console.log(`   Comments: ${postWithComments.comments.length}`);
    if (postWithComments.comments.length > 0) {
      console.log(`   First comment by: ${postWithComments.comments[0].author.name}`);
    }
  }
  console.log();

  // Example 7: Cache Warming Strategy
  console.log('7️⃣  Implementing cache warming strategy...');
  await warmCache();
  console.log('   ✓ Cache warmed successfully\n');

  console.log('✅ Advanced examples completed!');
}

/**
 * Build complete homepage data by combining multiple API calls
 */
async function buildHomepage() {
  const [publication, posts, series, recommended] = await Promise.all([
    hashnodeService.getPublication().catch(() => null),
    hashnodeService.getBlogPosts(10).catch(() => []),
    hashnodeService.getSeriesList(5).catch(() => []),
    hashnodeService.getRecommendedPublications().catch(() => []),
  ]);

  return { publication, posts, series, recommended };
}

/**
 * Fetch all series with their posts
 */
async function fetchSeriesWithPosts() {
  const seriesList = await hashnodeService.getSeriesList(10);
  
  const seriesWithPosts = await Promise.all(
    seriesList.map(async (series) => {
      const posts = await hashnodeService.getSeriesPosts(series.slug, 100);
      return { ...series, posts };
    })
  );

  return seriesWithPosts;
}

/**
 * Build post navigation (previous/next)
 */
interface PostNavigation {
  previous: BlogPost | null;
  current: BlogPost;
  next: BlogPost | null;
}

function buildPostNavigation(
  posts: BlogPost[],
  currentIndex: number
): PostNavigation {
  return {
    previous: posts[currentIndex - 1] || null,
    current: posts[currentIndex],
    next: posts[currentIndex + 1] || null,
  };
}

/**
 * Fetch post with comments
 */
async function fetchPostWithComments(postId: string) {
  const [post, comments] = await Promise.all([
    hashnodeService.getBlogPosts(1).then(posts => posts[0]),
    hashnodeService.getPostComments(postId, 20).catch(() => []),
  ]);

  return { post, comments };
}

/**
 * Cache warming strategy - pre-fetch commonly accessed data
 */
async function warmCache() {
  console.log('   → Warming publication metadata...');
  await hashnodeService.getPublication().catch(() => null);
  
  console.log('   → Warming recent posts...');
  await hashnodeService.getBlogPosts(20).catch(() => []);
  
  console.log('   → Warming series list...');
  await hashnodeService.getSeriesList(10).catch(() => []);
  
  console.log('   → Warming static pages...');
  await hashnodeService.getStaticPages(5).catch(() => []);
}

/**
 * Error handling patterns
 */
async function demonstrateErrorHandling() {
  // Pattern 1: Try-catch with service (throws errors)
  try {
    const post = await hashnodeService.getBlogPostBySlug('invalid-slug');
    console.log('Post:', post);
  } catch (error) {
    console.error('Service error:', error);
  }

  // Pattern 2: Facade functions (return safe defaults)
  // Import from index: import { getBlogPostBySlug } from '../index';
  // const post = await getBlogPostBySlug('invalid-slug'); // Returns null, no throw
  
  // Pattern 3: Promise.allSettled for multiple operations
  const results = await Promise.allSettled([
    hashnodeService.getBlogPosts(10),
    hashnodeService.getSeriesList(5),
    hashnodeService.getBlogPostBySlug('invalid-slug'),
  ]);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Operation ${index + 1}: Success`);
    } else {
      console.log(`Operation ${index + 1}: Failed -`, result.reason);
    }
  });
}

/**
 * Performance optimization example
 */
async function optimizedDataFetching() {
  // BAD: Sequential fetching (slow)
  const start1 = Date.now();
  const posts1 = await hashnodeService.getBlogPosts(10);
  const series1 = await hashnodeService.getSeriesList(5);
  const duration1 = Date.now() - start1;
  console.log(`Sequential: ${duration1}ms`);

  // GOOD: Parallel fetching (fast)
  const start2 = Date.now();
  const [posts2, series2] = await Promise.all([
    hashnodeService.getBlogPosts(10),
    hashnodeService.getSeriesList(5),
  ]);
  const duration2 = Date.now() - start2;
  console.log(`Parallel: ${duration2}ms (${Math.round((duration1 - duration2) / duration1 * 100)}% faster)`);
}

// Run examples
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
