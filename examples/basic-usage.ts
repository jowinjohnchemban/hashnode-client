/**
 * Basic Usage Example
 * 
 * This example demonstrates the most common use cases for the Hashnode client.
 * Run this file with: node --loader ts-node/esm examples/basic-usage.ts
 */

import {
  getBlogPosts,
  getBlogPostBySlug,
  getPublication,
  searchPosts,
  getSeries,
  getSeriesList,
  getStaticPage,
} from '../index';

async function main() {
  console.log('🚀 Hashnode Client - Basic Usage Examples\n');

  // Example 1: Fetch Publication Details
  console.log('1️⃣  Fetching publication details...');
  const publication = await getPublication();
  if (publication) {
    console.log(`   ✓ Publication: ${publication.title}`);
    console.log(`   ✓ URL: ${publication.url}`);
    console.log(`   ✓ Description: ${publication.descriptionSEO || 'N/A'}\n`);
  } else {
    console.log('   ✗ Failed to fetch publication\n');
  }

  // Example 2: Fetch Recent Posts
  console.log('2️⃣  Fetching recent blog posts...');
  const posts = await getBlogPosts(5);
  console.log(`   ✓ Found ${posts.length} posts:`);
  posts.forEach((post, index) => {
    console.log(`   ${index + 1}. ${post.title}`);
    console.log(`      Slug: ${post.slug}`);
    console.log(`      Published: ${new Date(post.publishedAt).toLocaleDateString()}`);
    console.log(`      Read time: ${post.readTimeInMinutes} min\n`);
  });

  // Example 3: Fetch Single Post by Slug
  if (posts.length > 0) {
    const firstPostSlug = posts[0].slug;
    console.log(`3️⃣  Fetching full post content for: "${firstPostSlug}"...`);
    const fullPost = await getBlogPostBySlug(firstPostSlug);
    
    if (fullPost) {
      console.log(`   ✓ Title: ${fullPost.title}`);
      console.log(`   ✓ Author: ${fullPost.author.name}`);
      console.log(`   ✓ Tags: ${fullPost.tags?.map(t => t.name).join(', ') || 'None'}`);
      console.log(`   ✓ Content length: ${fullPost.content?.html?.length || 0} characters`);
      console.log(`   ✓ Has cover image: ${fullPost.coverImage?.url ? 'Yes' : 'No'}\n`);
    } else {
      console.log('   ✗ Failed to fetch post\n');
    }
  }

  // Example 4: Search Posts
  console.log('4️⃣  Searching for posts with keyword "API"...');
  const searchResults = await searchPosts('API', 3);
  console.log(`   ✓ Found ${searchResults.length} matching posts:`);
  searchResults.forEach((post, index) => {
    console.log(`   ${index + 1}. ${post.title} (${post.slug})`);
  });
  console.log();

  // Example 5: Fetch Series List
  console.log('5️⃣  Fetching series list...');
  const seriesList = await getSeriesList(3);
  console.log(`   ✓ Found ${seriesList.length} series:`);
  seriesList.forEach((series, index) => {
    console.log(`   ${index + 1}. ${series.name}`);
    console.log(`      Slug: ${series.slug}`);
    console.log(`      Sort: ${series.sortOrder}\n`);
  });

  // Example 6: Fetch Single Series
  if (seriesList.length > 0) {
    const firstSeriesSlug = seriesList[0].slug;
    console.log(`6️⃣  Fetching series details for: "${firstSeriesSlug}"...`);
    const series = await getSeries(firstSeriesSlug);
    
    if (series) {
      console.log(`   ✓ Name: ${series.name}`);
      console.log(`   ✓ Author: ${series.author.name}`);
      console.log(`   ✓ Created: ${new Date(series.createdAt).toLocaleDateString()}\n`);
    }
  }

  // Example 7: Fetch Static Page
  console.log('7️⃣  Fetching static page "about"...');
  const aboutPage = await getStaticPage('about');
  if (aboutPage) {
    console.log(`   ✓ Title: ${aboutPage.title}`);
    console.log(`   ✓ Slug: ${aboutPage.slug}`);
    console.log(`   ✓ Content length: ${aboutPage.content?.html?.length || 0} characters`);
    console.log(`   ✓ Hidden: ${aboutPage.hidden ? 'Yes' : 'No'}\n`);
  } else {
    console.log('   ℹ️  No "about" page found (this is normal if not created)\n');
  }

  // Example 8: Error Handling
  console.log('8️⃣  Testing error handling with invalid slug...');
  const invalidPost = await getBlogPostBySlug('this-post-definitely-does-not-exist-12345');
  console.log(`   ✓ Invalid post returned: ${invalidPost === null ? 'null (as expected)' : 'unexpected value'}`);
  console.log('   ✓ No exceptions thrown - safe error handling confirmed!\n');

  console.log('✅ All examples completed successfully!');
}

// Run the examples
main().catch((error) => {
  console.error('❌ Error running examples:', error);
  process.exit(1);
});
