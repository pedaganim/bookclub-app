process.env.IS_OFFLINE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const LocalStorage = require('../src/lib/local-storage');
const sampleData = require('./sample-data.json');

const minutesAgo = (minutes = 0) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const withTimestamps = (record, fallbackOffset = 0) => {
  const { createdAtOffsetMinutes, updatedAtOffsetMinutes, joinedAtOffsetMinutes, ...rest } = record;
  const createdAt = rest.createdAt || minutesAgo(createdAtOffsetMinutes ?? fallbackOffset);
  const updatedAt = rest.updatedAt || minutesAgo(updatedAtOffsetMinutes ?? createdAtOffsetMinutes ?? fallbackOffset);
  const joinedAt = rest.joinedAt || (joinedAtOffsetMinutes !== undefined ? minutesAgo(joinedAtOffsetMinutes) : rest.joinedAt);
  return joinedAt === undefined
    ? { ...rest, createdAt, updatedAt }
    : { ...rest, joinedAt, createdAt, updatedAt };
};

const preparePost = (record, index) => {
  const post = withTimestamps(record, index * 15);
  return {
    ...post,
    images: Array.isArray(post.images) ? post.images : [],
    createdAt_postId: post.createdAt_postId || `${new Date(post.createdAt).getTime()}#${post.postId}`,
  };
};

const prepareComment = (record, index) => {
  const comment = withTimestamps(record, index * 10);
  return {
    ...comment,
    images: Array.isArray(comment.images) ? comment.images : [],
    createdAt_commentId: comment.createdAt_commentId || `${new Date(comment.createdAt).getTime()}#${comment.commentId}`,
  };
};

async function seedData() {
  console.log('[seed] Seeding local JSON data...');

  for (const user of sampleData.users || []) {
    await LocalStorage.createUser(withTimestamps(user));
  }

  for (const club of sampleData.clubs || []) {
    await LocalStorage.createClub(withTimestamps(club));
  }

  for (const membership of sampleData.clubMembers || []) {
    await LocalStorage.createClubMember(withTimestamps(membership));
  }

  for (const book of sampleData.books || []) {
    await LocalStorage.createBook(withTimestamps(book));
  }

  for (const [index, post] of (sampleData.posts || []).entries()) {
    await LocalStorage.createPost(preparePost(post, index));
  }

  for (const [index, comment] of (sampleData.comments || []).entries()) {
    await LocalStorage.createComment(prepareComment(comment, index));
  }

  console.log('[seed] Local sample data ready.');
  console.log('[seed] Storage: backend/.local-storage/*.json');
  console.log('[seed] Local UI user: local@dev / token local-token-local-user');
  console.log(`[seed] Clubs: ${(sampleData.clubs || []).map(club => club.name).join(', ')}`);
}

if (require.main === module) {
  seedData().catch((error) => {
    console.error('[seed] Error seeding local data:', error);
    process.exit(1);
  });
}

module.exports = { seedData };
