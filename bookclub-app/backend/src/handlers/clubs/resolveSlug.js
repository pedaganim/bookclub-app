const BookClub = require('../../models/bookclub');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { slug } = event.pathParameters;

    if (!slug) {
      return error('Slug is required', 400);
    }

    const club = await BookClub.getBySlug(slug);
    
    if (!club) {
      // Return 200 with null instead of 404 to avoid console noise for invalid subdomains
      return success({ club: null });
    }

    // Return minimal set of public data for branding
    const result = {
      clubId: club.clubId,
      name: club.name,
      slug: club.slug,
      description: club.description,
      location: club.location,
      isPrivate: club.isPrivate || false,
    };

    return success({ club: result });
  } catch (err) {
    console.error('Error resolving club slug:', err);
    return error(err.message || 'Failed to resolve club', 500);
  }
};
