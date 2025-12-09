const Product = require('../models/Product');

/**
 * Get product recommendations based on parsed user intent
 * 
 * @param {Object} parsedIntent - User intent with { occasion, style, season, budget, urgency }
 * @param {number} limit - Maximum number of products to return (default: 5)
 * @returns {Promise<Object>} { products, explanations, confidence }
 */
async function getRecommendations(parsedIntent, limit = 5) {
  try {
    // Validate parsedIntent
    if (!parsedIntent || typeof parsedIntent !== 'object') {
      return {
        products: [],
        explanations: [],
        confidence: 0,
      };
    }

    // Generate tags from intent for matching
    // Check if parsedIntent has tags array directly, otherwise generate from intent fields
    const intentTags = parsedIntent.tags 
      ? parsedIntent.tags.map(tag => tag.toString().replace(/^#/, '')) // Remove # prefix if present
      : generateTagsFromIntent(parsedIntent);

    // Fetch all in-stock products from database
    let products = await Product.find({
      inStock: true,
      stockCount: { $gt: 0 },
    }).lean();

    if (products.length === 0) {
      return {
        products: [],
        explanations: [],
        confidence: 0,
      };
    }

    // Calculate scores for each product
    const scoredProducts = products.map((product) => {
      const score = calculateProductScore(product, parsedIntent, intentTags);
      return {
        ...product,
        score,
      };
    });

    // Filter out products with score < 20
    let filteredProducts = scoredProducts.filter((p) => p.score >= 20);

    // Sort by score (highest first), then by stockCount as tiebreaker
    filteredProducts.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.stockCount || 0) - (a.stockCount || 0);
    });

    // If fewer than 3 products, broaden search (remove budget filter)
    if (filteredProducts.length < 3 && typeof parsedIntent.budget === 'number') {
      // Recalculate scores without budget filtering
      const broadScoredProducts = products.map((product) => {
        const scoreWithoutBudget = calculateProductScore(product, parsedIntent, intentTags, true);
        return {
          ...product,
          score: scoreWithoutBudget,
        };
      });

      filteredProducts = broadScoredProducts
        .filter((p) => p.score >= 20)
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return (b.stockCount || 0) - (a.stockCount || 0);
        });
    }

    // Apply category diversity bonus
    const diverseProducts = applyCategoryDiversity(filteredProducts, limit);

    // Take top 'limit' products
    const topProducts = diverseProducts.slice(0, limit);

    // Generate explanations for each product
    const explanations = topProducts.map((product) =>
      generateExplanation(product, parsedIntent)
    );

    // Calculate confidence based on average score (normalize to 0-1)
    const avgScore = topProducts.length > 0
      ? topProducts.reduce((sum, p) => sum + p.score, 0) / topProducts.length
      : 0;
    const confidence = Math.min(1, avgScore / 100); // Normalize to 0-1

    return {
      products: topProducts,
      explanations,
      confidence,
    };
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return {
      products: [],
      explanations: [],
      confidence: 0,
    };
  }
}

/**
 * Generate tags array from parsed intent for matching
 * @param {Object} parsedIntent - User intent object
 * @returns {Array<string>} Array of tag strings (without # prefix)
 */
function generateTagsFromIntent(parsedIntent) {
  const tags = [];

  if (parsedIntent.occasion && parsedIntent.occasion !== 'other') {
    tags.push(parsedIntent.occasion.charAt(0).toUpperCase() + parsedIntent.occasion.slice(1));
    if (parsedIntent.occasion === 'wedding') {
      tags.push('Wedding');
    }
  }

  if (parsedIntent.style) {
    const styleTag = parsedIntent.style.charAt(0).toUpperCase() + parsedIntent.style.slice(1);
    tags.push(styleTag);
  }

  if (parsedIntent.season && parsedIntent.season !== 'all-season') {
    if (parsedIntent.season === 'summer') {
      tags.push('SummerWear');
    } else if (parsedIntent.season === 'winter') {
      tags.push('WinterWear');
    } else {
      const seasonTag = parsedIntent.season.charAt(0).toUpperCase() + parsedIntent.season.slice(1) + 'Wear';
      tags.push(seasonTag);
    }
  }

  if (parsedIntent.urgency === 'today') {
    tags.push('Urgent');
  }

  if (typeof parsedIntent.budget === 'number') {
    if (parsedIntent.budget > 300) {
      tags.push('Premium');
    } else if (parsedIntent.budget < 100) {
      tags.push('Budget');
    }
  }

  return tags;
}

/**
 * Calculate match score for a product (0-100)
 * 
 * Scoring breakdown:
 * - Tag matching: 40 points max (10 per matching tag)
 * - Price matching: 30 points max
 * - Stock availability: 20 points max
 * - Category diversity: 10 points max (applied later)
 * 
 * @param {Object} product - Product object from database
 * @param {Object} parsedIntent - User intent object
 * @param {Array<string>} intentTags - Tags generated from intent
 * @param {boolean} ignoreBudget - If true, skip budget scoring (for broad search)
 * @returns {number} Score from 0-100
 */
function calculateProductScore(product, parsedIntent, intentTags, ignoreBudget = false) {
  let score = 0;

  // a) Tag matching (40 points max)
  // Normalize tags to lowercase for case-insensitive comparison
  const productTags = (product.tags || []).map((tag) => tag.toString().toLowerCase());
  const normalizedIntentTags = intentTags.map((tag) => tag.toLowerCase());
  const matchingTags = normalizedIntentTags.filter((tag) => productTags.includes(tag));
  const tagScore = Math.min(40, matchingTags.length * 10);
  score += tagScore;

  // b) Price matching (30 points max)
  if (!ignoreBudget) {
    const priceScore = calculatePriceScore(product.price, parsedIntent.budget);
    score += priceScore;
  }

  // c) Stock availability (20 points max)
  const stockCount = product.stockCount || 0;
  let stockScore = 0;
  if (stockCount > 5) {
    stockScore = 20;
  } else if (stockCount >= 3) {
    stockScore = 15;
  } else if (stockCount >= 1) {
    stockScore = 10;
  }
  score += stockScore;

  return score;
}

/**
 * Calculate price matching score (0-30 points)
 * 
 * @param {number} productPrice - Product price
 * @param {number|string} budget - User budget (number or "flexible")
 * @returns {number} Score from 0-30
 */
function calculatePriceScore(productPrice, budget) {
  if (typeof budget === 'number' && budget > 0) {
    const priceDiff = productPrice - budget;
    const percentOver = (priceDiff / budget) * 100;

    if (priceDiff <= 0) {
      // Within budget
      return 30;
    } else if (percentOver <= 10) {
      // 10% over budget
      return 20;
    } else if (percentOver <= 20) {
      // 20% over budget
      return 10;
    } else {
      // More than 20% over budget
      return 0;
    }
  } else if (budget === 'flexible') {
    // Flexible budget: give moderate points to all
    return 15;
  }

  return 0;
}

/**
 * Apply category diversity bonus (10 points max)
 * Tracks categories already selected and gives bonus to products from new categories
 * 
 * @param {Array<Object>} products - Scored products array
 * @param {number} limit - Maximum number of products
 * @returns {Array<Object>} Products with diversity bonus applied
 */
function applyCategoryDiversity(products, limit) {
  const selectedCategories = new Set();
  const result = [];

  for (const product of products) {
    const category = product.category || 'Unknown';
    
    // Check if this category is already selected
    const isNewCategory = !selectedCategories.has(category);
    
    // Apply diversity bonus (10 points) if category not yet included
    if (isNewCategory && result.length < limit) {
      product.score = (product.score || 0) + 10;
      selectedCategories.add(category);
    }

    result.push(product);
  }

  // Re-sort after applying diversity bonus
  result.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (b.stockCount || 0) - (a.stockCount || 0);
  });

  return result.slice(0, limit);
}

/**
 * Generate explanation for why a product was recommended
 * 
 * @param {Object} product - Product object with score
 * @param {Object} parsedIntent - User intent object
 * @returns {string} Explanation string
 */
function generateExplanation(product, parsedIntent) {
  const reasons = [];

  // Add style match
  if (parsedIntent.style) {
    reasons.push(`${parsedIntent.style} style`);
  }

  // Add occasion match
  if (parsedIntent.occasion && parsedIntent.occasion !== 'other') {
    reasons.push(`suitable for ${parsedIntent.occasion} occasions`);
  }

  // Add season match
  if (parsedIntent.season && parsedIntent.season !== 'all-season') {
    reasons.push(`perfect for ${parsedIntent.season}`);
  }

  // Add budget match
  if (typeof parsedIntent.budget === 'number') {
    const priceDiff = product.price - parsedIntent.budget;
    if (priceDiff <= 0) {
      reasons.push(`within your $${parsedIntent.budget} budget`);
    } else if (priceDiff <= parsedIntent.budget * 0.1) {
      reasons.push(`slightly over budget but great value`);
    }
  }

  // Add stock availability
  if (product.stockCount > 5) {
    reasons.push(`in stock and ready`);
  }

  // Construct explanation
  let explanation = `This ${product.name}`;
  
  if (reasons.length > 0) {
    if (reasons.length === 1) {
      explanation += ` matches your ${reasons[0]}`;
    } else if (reasons.length === 2) {
      explanation += ` matches your ${reasons[0]} and is ${reasons[1]}`;
    } else {
      explanation += ` matches your ${reasons[0]} and is ${reasons.slice(1).join(', ')}`;
    }
    explanation += '.';
  } else {
    explanation += ' is a great option for you.';
  }

  return explanation;
}

module.exports = {
  getRecommendations,
};

