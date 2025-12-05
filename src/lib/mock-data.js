/**
 * Mock Intention Data - Practical, First-Person Examples
 * Based on PRACTICAL_INTENTIONS_GUIDE.md principles
 */

export const mockIntentions = [
  {
    intentionId: 'int_001',
    title: 'I need help moving furniture this weekend',
    description:
      'Looking for 2-3 people to help move. Will provide lunch and gas money. Saturday 10am-2pm, need strong backs and a truck if possible.',
    location: 'Oakland, CA',
    geo: [37.8044, -122.2712],
    keywords: ['help', 'moving', 'furniture', 'weekend', 'labor'],
    tags: ['help-needed', 'moving', 'community-support'],
    category: 'request',
    status: 'active',
    createdAt: Date.now() - 86400000, // 1 day ago
    createdBy: 'did:webauthn:example1'
  },
  {
    intentionId: 'int_002',
    title: 'I can teach basic home repair skills',
    description:
      'Free workshops on weekends. Learn plumbing, electrical basics, drywall repair, painting techniques. All skill levels welcome!',
    location: 'Berkeley, CA',
    geo: [37.8715, -122.273],
    keywords: ['teaching', 'skills', 'repair', 'workshop', 'free'],
    tags: ['skill-sharing', 'teaching', 'home-improvement'],
    category: 'offer',
    status: 'active',
    createdAt: Date.now() - 172800000, // 2 days ago
    createdBy: 'did:webauthn:example2'
  },
  {
    intentionId: 'int_003',
    title: 'Looking for carpool partners to SF',
    description:
      'Daily commute to Financial District, 8am-6pm weekdays. Can share gas and tolls, have room for 2 passengers.',
    location: 'Oakland, CA',
    geo: [37.8044, -122.2712],
    keywords: ['carpool', 'transportation', 'sharing', 'commute'],
    tags: ['transportation', 'carpool', 'resource-sharing'],
    category: 'request',
    status: 'active',
    createdAt: Date.now() - 259200000, // 3 days ago
    createdBy: 'did:webauthn:example3'
  },
  {
    intentionId: 'int_004',
    title: 'I have extra vegetables from my garden',
    description:
      'Weekly surplus of tomatoes, zucchini, peppers. Free for anyone who wants them. Come pick them up or I can drop off locally.',
    location: 'Albany, CA',
    geo: [37.8869, -122.2977],
    keywords: ['food', 'garden', 'sharing', 'vegetables', 'free'],
    tags: ['food-sharing', 'garden', 'surplus'],
    category: 'offer',
    status: 'active',
    createdAt: Date.now() - 345600000, // 4 days ago
    createdBy: 'did:webauthn:example4'
  },
  {
    intentionId: 'int_005',
    title: 'I can help with tech support for seniors',
    description:
      'Patient tech help for older adults. Phones, tablets, computers, email, video calls. Sunday afternoons, no charge.',
    location: 'El Cerrito, CA',
    geo: [37.9161, -122.3108],
    keywords: ['tech', 'help', 'seniors', 'teaching', 'support'],
    tags: ['tech-support', 'elder-care', 'teaching'],
    category: 'offer',
    status: 'active',
    createdAt: Date.now() - 432000000, // 5 days ago
    createdBy: 'did:webauthn:example5'
  },
  {
    intentionId: 'int_006',
    title: 'We want to start a weekly meal share',
    description:
      'Rotating potluck dinners, Thursday evenings. Looking for 5-10 people interested in cooking and community. Everyone brings a dish to share.',
    location: 'Berkeley, CA',
    geo: [37.8715, -122.273],
    keywords: ['food', 'community', 'gathering', 'cooking', 'meal'],
    tags: ['meal-share', 'community-building', 'food'],
    category: 'collective',
    status: 'active',
    createdAt: Date.now() - 518400000, // 6 days ago
    createdBy: 'did:webauthn:example6'
  },
  {
    intentionId: 'int_007',
    title: 'We need childcare help on Tuesday afternoons',
    description:
      'Two families looking for someone to watch 3 kids (ages 4-8) on Tuesdays 2-6pm. Can pay $20/hour or trade for services.',
    location: 'Oakland, CA',
    geo: [37.8044, -122.2712],
    keywords: ['childcare', 'kids', 'help', 'tuesday', 'afternoon'],
    tags: ['childcare', 'family-support', 'help-needed'],
    category: 'request',
    status: 'active',
    createdAt: Date.now() - 604800000, // 7 days ago
    createdBy: 'did:webauthn:example7'
  },
  {
    intentionId: 'int_008',
    title: "We're building a tool library for our block",
    description:
      '$20/year membership gets you access to power tools, ladders, gardening equipment. Looking for more members and tool donations.',
    location: 'Berkeley, CA',
    geo: [37.8715, -122.273],
    keywords: ['tools', 'sharing', 'community', 'library', 'equipment'],
    tags: ['tool-sharing', 'resource-pooling', 'community-project'],
    category: 'collective',
    status: 'active',
    createdAt: Date.now() - 691200000, // 8 days ago
    createdBy: 'did:webauthn:example8'
  },
  {
    intentionId: 'int_009',
    title: 'Looking for a bike repair mentor',
    description:
      'Want to learn basic bike maintenance and repair. Happy to help with your projects in exchange for teaching me the ropes.',
    location: 'Emeryville, CA',
    geo: [37.8314, -122.2859],
    keywords: ['learning', 'bike', 'repair', 'mentor', 'skills'],
    tags: ['skill-learning', 'mentorship', 'cycling'],
    category: 'request',
    status: 'active',
    createdAt: Date.now() - 777600000, // 9 days ago
    createdBy: 'did:webauthn:example9'
  },
  {
    intentionId: 'int_010',
    title: 'I can provide free haircuts for people in need',
    description:
      'Licensed cosmetologist offering free haircuts for folks who cannot afford them. Available Saturday mornings at my home studio.',
    location: 'Oakland, CA',
    geo: [37.8044, -122.2712],
    keywords: ['haircuts', 'service', 'free', 'help', 'styling'],
    tags: ['service-offering', 'community-support', 'beauty'],
    category: 'offer',
    status: 'active',
    createdAt: Date.now() - 864000000, // 10 days ago
    createdBy: 'did:webauthn:example10'
  }
];

/**
 * Get mock intentions for testing (without requiring database)
 * @returns {Array} Array of mock intention objects
 */
export function getMockIntentions() {
  return mockIntentions;
}

/**
 * Search mock intentions by keyword (simple search for demo)
 * @param {string} query - Search query
 * @returns {Array} Filtered intentions
 */
export function searchMockIntentions(query) {
  const lowerQuery = query.toLowerCase();
  return mockIntentions.filter(
    (intention) =>
      intention.title.toLowerCase().includes(lowerQuery) ||
      intention.description.toLowerCase().includes(lowerQuery) ||
      intention.keywords.some((keyword) => keyword.includes(lowerQuery)) ||
      intention.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
