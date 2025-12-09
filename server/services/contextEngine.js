// Rule-based context engine to parse user messages into structured intent.
// Free, no API keys required; ideal for demos/hackathons.
// Uses pattern matching with regex to extract intent from user messages.

/**
 * Main function to parse user message and extract intent
 * @param {string} message - User's text message
 * @param {Array} conversationHistory - Previous messages array
 * @returns {Object} { intent, tags, summary, confidence }
 */
function parseUserMessage(message, conversationHistory = []) {
  const text = (message || '').toLowerCase();
  
  // Extract previous context from conversation history
  const previousContext = extractPreviousContext(conversationHistory);
  
  // Combine current message with previous context for better extraction
  const combinedText = previousContext.text ? `${previousContext.text} ${text}` : text;

  const intent = {
    occasion: extractOccasion(combinedText, previousContext.occasion),
    style: extractStyle(combinedText, previousContext.style),
    season: extractSeason(combinedText, previousContext.season),
    budget: extractBudget(combinedText, previousContext.budget),
    urgency: extractUrgency(combinedText, previousContext.urgency),
    preferences: extractPreferences(combinedText, previousContext.preferences),
  };

  const tags = generateTags(intent);
  const summary = generateSummary(intent);
  const confidence = calculateConfidence(intent);

  return {
    intent,
    tags,
    summary,
    confidence,
  };
}

/**
 * Extract previous context from conversation history
 * Looks for text in both old format (text, sender) and new format (content, role)
 */
function extractPreviousContext(conversationHistory = []) {
  const context = {
    text: '',
    occasion: null,
    style: null,
    season: null,
    budget: null,
    urgency: null,
    preferences: [],
  };

  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return context;
  }

  // Collect all previous user messages
  const previousMessages = conversationHistory
    .filter(msg => {
      // Handle both formats: { text, sender } or { content, role }
      const sender = msg.sender || msg.role || '';
      return sender.toLowerCase() === 'user';
    })
    .map(msg => {
      // Handle both formats
      return (msg.text || msg.content || '').toLowerCase();
    })
    .filter(text => text.length > 0);

  context.text = previousMessages.join(' ');

  // Extract previous intent values from conversation
  const combinedPreviousText = context.text;
  
  // Only extract if not already found in current message (to avoid overriding)
  if (combinedPreviousText) {
    context.occasion = extractOccasion(combinedPreviousText);
    context.style = extractStyle(combinedPreviousText);
    context.season = extractSeason(combinedPreviousText);
    context.budget = extractBudget(combinedPreviousText);
    context.urgency = extractUrgency(combinedPreviousText);
    context.preferences = extractPreferences(combinedPreviousText);
  }

  return context;
}

/**
 * Extract occasion from text
 * Keywords: wedding/marriage → "wedding"
 * work/office/business/meeting/interview → "work"
 * party/celebration/event → "party"
 * date/romantic/dinner → "date"
 * casual/everyday/weekend → "casual"
 * Default: "other"
 */
function extractOccasion(text, previousValue = null) {
  if (!text) return previousValue || 'other';

  // Case-insensitive regex matching
  if (/\b(wedding|marriage|ceremony|bridal|groom)\b/i.test(text)) return 'wedding';
  if (/\b(work|office|business|meeting|interview|professional|corporate)\b/i.test(text)) return 'work';
  if (/\b(party|celebration|event|gala|festival|gathering)\b/i.test(text)) return 'party';
  if (/\b(date|romantic|dinner|evening\s+out|night\s+out)\b/i.test(text)) return 'date';
  if (/\b(casual|everyday|weekend|daily|regular)\b/i.test(text)) return 'casual';
  
  return previousValue || 'other';
}

/**
 * Extract style from text
 * Keywords: formal/suit/blazer → "formal"
 * business/professional/corporate → "business"
 * casual/relaxed/comfortable → "casual"
 * trendy/fashionable/stylish → "trendy"
 * classic/traditional/timeless → "classic"
 * sport/athletic/active → "sporty"
 * Default: "casual"
 */
function extractStyle(text, previousValue = null) {
  if (!text) return previousValue || 'casual';

  // Check in priority order
  if (/\b(formal|suit|blazer|dress\s+shirt|tuxedo|tie)\b/i.test(text)) return 'formal';
  if (/\b(business|professional|corporate|executive)\b/i.test(text)) return 'business';
  if (/\b(trendy|fashionable|stylish|modern|contemporary|hip)\b/i.test(text)) return 'trendy';
  if (/\b(classic|traditional|timeless|vintage|conservative)\b/i.test(text)) return 'classic';
  if (/\b(sport|athletic|active|gym|workout|athleisure)\b/i.test(text)) return 'sporty';
  if (/\b(casual|relaxed|comfortable|easygoing|laid\s+back)\b/i.test(text)) return 'casual';
  
  return previousValue || 'casual';
}

/**
 * Extract season from text
 * Keywords: summer/hot/lightweight/breathable → "summer"
 * winter/cold/warm/layer → "winter"
 * spring → "spring"
 * fall/autumn → "fall"
 * Default: "all-season"
 */
function extractSeason(text, previousValue = null) {
  if (!text) return previousValue || 'all-season';

  if (/\b(summer|hot|lightweight|breathable|beach|sunny|warm\s+weather)\b/i.test(text)) return 'summer';
  if (/\b(winter|cold|warm|layer|layering|snow|freezing|insulated|wool|fleece)\b/i.test(text)) return 'winter';
  if (/\b(spring|bloom|mild)\b/i.test(text)) return 'spring';
  if (/\b(fall|autumn|cooler|crisp)\b/i.test(text)) return 'fall';
  
  return previousValue || 'all-season';
}

/**
 * Extract budget from text
 * Look for: $XXX or "XXX dollars" or "budget of XXX"
 * If keywords like "cheap/affordable/budget" → return 100
 * If keywords like "expensive/luxury/premium" → return 500
 * Default: "flexible"
 */
function extractBudget(text, previousValue = null) {
  if (!text) {
    return previousValue || 'flexible';
  }

  // Try to extract exact number
  // Match $XXX, XXX dollars, budget of XXX, around XXX, up to XXX
  const numberPatterns = [
    /\$(\d+)/i,                                           // $150
    /(\d+)\s*dollars?/i,                                  // 150 dollars
    /budget\s*(?:of|is)?\s*(\d+)/i,                      // budget of 150
    /around\s*(\d+)/i,                                    // around 150
    /up\s+to\s*(\d+)/i,                                   // up to 150
    /(\d+)\s*(?:bucks?|usd)/i,                           // 150 bucks
    /approximately\s*(\d+)/i,                            // approximately 150
  ];

  for (const pattern of numberPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseInt(match[1], 10);
      if (amount > 0) {
        return amount;
      }
    }
  }

  // Check for budget keywords
  if (/\b(cheap|affordable|budget|inexpensive|economical|low\s+price)\b/i.test(text)) {
    return 100;
  }
  if (/\b(expensive|luxury|premium|high\s+end|designer|upscale)\b/i.test(text)) {
    return 500;
  }
  if (/\b(mid\s*range|moderate|medium)\b/i.test(text)) {
    return 200;
  }

  return previousValue || 'flexible';
}

/**
 * Extract urgency from text
 * Keywords: today/right now/asap/immediately → "today"
 * this week/soon/urgent → "this-week"
 * Default: "flexible"
 */
function extractUrgency(text, previousValue = null) {
  if (!text) return previousValue || 'flexible';

  if (/\b(today|right\s+now|asap|as\s+soon\s+as\s+possible|immediately|urgently|right\s+away|this\s+evening)\b/i.test(text)) {
    return 'today';
  }
  if (/\b(this\s+week|soon|urgent|quickly|fast|needed\s+soon|asap|hurry)\b/i.test(text)) {
    return 'this-week';
  }
  
  return previousValue || 'flexible';
}

/**
 * Extract preferences from text
 * Looks for color, material, fit preferences
 */
function extractPreferences(text, previousPreferences = []) {
  const preferences = previousPreferences || [];
  const newPreferences = [];

  // Color preferences
  const colors = ['black', 'white', 'blue', 'red', 'green', 'grey', 'gray', 'brown', 'navy', 'beige', 'tan', 'burgundy'];
  colors.forEach(color => {
    if (new RegExp(`\\b${color}\\b`, 'i').test(text) && !preferences.includes(color)) {
      newPreferences.push(color);
    }
  });

  // Material preferences
  if (/\b(cotton|wool|linen|silk|polyester|denim|leather|suede)\b/i.test(text)) {
    const materials = text.match(/\b(cotton|wool|linen|silk|polyester|denim|leather|suede)\b/gi);
    if (materials) {
      materials.forEach(mat => {
        const normalized = mat.toLowerCase();
        if (!preferences.includes(normalized) && !newPreferences.includes(normalized)) {
          newPreferences.push(normalized);
        }
      });
    }
  }

  // Fit preferences
  if (/\b(slim|loose|fitted|relaxed|tailored|baggy|skinny)\b/i.test(text)) {
    const fits = text.match(/\b(slim|loose|fitted|relaxed|tailored|baggy|skinny)\b/gi);
    if (fits) {
      fits.forEach(fit => {
        const normalized = fit.toLowerCase();
        if (!preferences.includes(normalized) && !newPreferences.includes(normalized)) {
          newPreferences.push(normalized);
        }
      });
    }
  }

  return [...preferences, ...newPreferences];
}

/**
 * Generate tags from intent
 * Convert intent fields to hashtags
 * Add #Urgent if urgency is "today"
 * Add #Premium if budget > 300
 * Add #Budget if budget < 100
 */
function generateTags(intent) {
  const tags = [];

  // Occasion tags
  if (intent.occasion && intent.occasion !== 'other') {
    tags.push(`#${capitalize(intent.occasion)}`);
    // Special case for wedding
    if (intent.occasion === 'wedding') {
      tags.push('#Wedding');
    }
  }

  // Style tags
  if (intent.style) {
    tags.push(`#${capitalize(intent.style)}`);
  }

  // Season tags
  if (intent.season && intent.season !== 'all-season') {
    const seasonTag = intent.season === 'summer' ? '#SummerWear' :
                     intent.season === 'winter' ? '#WinterWear' :
                     `#${capitalize(intent.season)}Wear`;
    tags.push(seasonTag);
  }

  // Urgency tags
  if (intent.urgency === 'today') {
    tags.push('#Urgent');
  }

  // Budget tags
  if (typeof intent.budget === 'number') {
    if (intent.budget > 300) {
      tags.push('#Premium');
    } else if (intent.budget < 100) {
      tags.push('#Budget');
    }
  }

  return tags;
}

/**
 * Generate natural language summary from intent
 * Example: "Looking for formal style, suitable for summer, within $200 budget"
 */
function generateSummary(intent) {
  const parts = [];

  if (intent.occasion && intent.occasion !== 'other') {
    parts.push(`for ${intent.occasion}`);
  }

  if (intent.style) {
    parts.push(`${intent.style} style`);
  }

  if (intent.season && intent.season !== 'all-season') {
    parts.push(`suitable for ${intent.season}`);
  }

  if (typeof intent.budget === 'number') {
    parts.push(`within $${intent.budget} budget`);
  } else if (intent.budget === 'flexible') {
    parts.push(`flexible budget`);
  }

  if (intent.urgency && intent.urgency !== 'flexible') {
    if (intent.urgency === 'today') {
      parts.push(`needed today`);
    } else if (intent.urgency === 'this-week') {
      parts.push(`needed this week`);
    }
  }

  if (intent.preferences && intent.preferences.length > 0) {
    parts.push(`preferences: ${intent.preferences.slice(0, 3).join(', ')}`);
  }

  if (parts.length === 0) {
    return 'Looking for clothing items';
  }

  return `Looking ${parts.join(', ')}`;
}

/**
 * Calculate confidence score (0-1)
 * Higher score if more fields are extracted
 * 0.8 if all fields extracted, lower if some missing
 */
function calculateConfidence(intent) {
  let score = 0;
  let maxScore = 0;

  // Each field contributes to score
  const fields = ['occasion', 'style', 'season', 'budget', 'urgency'];
  
  fields.forEach(field => {
    maxScore += 1;
    const value = intent[field];
    
    // Check if field has a meaningful value (not default/empty)
    if (value && 
        value !== 'other' && 
        value !== 'flexible' && 
        value !== 'all-season' && 
        value !== 'casual') {
      score += 1;
    } else if (field === 'style' && value === 'casual') {
      // Casual is a valid style, not just default
      score += 0.5;
    }
  });

  // Preferences add bonus
  if (intent.preferences && intent.preferences.length > 0) {
    score += 0.2;
    maxScore += 0.2;
  }

  // Normalize to 0-1 range, with max around 0.8-0.9 for all fields
  const normalizedScore = score / maxScore;
  
  // Cap at 0.95 to leave room for improvement
  return Math.min(0.95, Math.max(0.1, normalizedScore));
}

/**
 * Helper function to capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { parseUserMessage };
