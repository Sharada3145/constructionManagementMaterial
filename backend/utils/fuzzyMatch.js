/**
 * Fuzzy Material Matching Utility
 *
 * Implements Levenshtein distance + synonym recognition to intelligently
 * match misspelled or alternate material names from contractor input.
 *
 * Examples:
 *   "cemnt"       → Cement (confidence 90%)
 *   "opc cemnt"   → Cement (confidence 85%)
 *   "briks"       → Bricks (confidence 80%)
 *   "5 ton steel" → Steel Rods, qty=5, unit=tonnes
 */

// Common synonyms and alternate names for construction materials
const MATERIAL_SYNONYMS = {
  cement: ['cemnt', 'cemant', 'ciment', 'sement', 'opc', 'opc cement', 'portland cement', 'ppc', 'ppc cement'],
  sand: ['sand', 'snd', 'river sand', 'msand', 'm-sand', 'manufactured sand', 'pit sand'],
  bricks: ['briks', 'brick', 'brik', 'red brick', 'fly ash brick', 'clay brick'],
  'steel rods': ['steel', 'stell', 'stel', 'tmt', 'tmt bar', 'tmt rod', 'rebar', 'reinforcement bar', 'iron rod', 'sariya'],
  tiles: ['tile', 'tils', 'ceramic tile', 'vitrified tile', 'floor tile', 'wall tile'],
  paint: ['pant', 'paints', 'primer', 'emulsion', 'distemper', 'wall paint', 'exterior paint'],
  pipes: ['pipe', 'pvc pipe', 'pvc', 'cpvc', 'upvc', 'gi pipe', 'plumbing pipe'],
  'electrical wire': ['wire', 'wires', 'electrical', 'cable', 'electrical cable', 'copper wire'],
  wood: ['wod', 'timber', 'timbr', 'plywood', 'plyboard', 'wooden plank', 'lumber'],
  concrete: ['concret', 'rmc', 'ready mix', 'ready mix concrete', 'rcc'],
  'plumbing materials': ['plumbing', 'plumbing fitting', 'tap', 'valve', 'faucet', 'fitting'],
  gravel: ['gravel', 'aggregate', 'coarse aggregate', 'gitti', 'stone chips'],
  waterproofing: ['waterproof', 'waterproofing chemical', 'sealant', 'membrane'],
};

// Unit aliases
const UNIT_ALIASES = {
  bags: ['bag', 'bags', 'bgs', 'bg'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo'],
  tonnes: ['ton', 'tons', 'tonne', 'tonnes', 'mt'],
  pieces: ['pc', 'pcs', 'piece', 'pieces', 'nos', 'numbers', 'units'],
  meters: ['m', 'mtr', 'meter', 'meters', 'metre', 'metres'],
  liters: ['l', 'ltr', 'ltrs', 'liter', 'liters', 'litre', 'litres'],
  cubic_meters: ['cum', 'cubic meter', 'cubic meters', 'cu.m'],
  sq_ft: ['sqft', 'sq ft', 'square feet', 'sft'],
  bundles: ['bundle', 'bundles', 'bdl'],
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Calculate similarity score (0–100) between two strings
 */
function similarity(a, b) {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 100;
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(aLower, bLower);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

/**
 * Check if input matches any synonym and return the canonical name
 */
function matchSynonym(input) {
  const lower = input.toLowerCase().trim();

  for (const [canonical, synonyms] of Object.entries(MATERIAL_SYNONYMS)) {
    // Direct synonym match
    if (synonyms.includes(lower) || canonical === lower) {
      return { name: canonical, confidence: 98 };
    }
    // Partial match — input contains a synonym
    for (const syn of synonyms) {
      if (lower.includes(syn) || syn.includes(lower)) {
        return { name: canonical, confidence: 90 };
      }
    }
  }
  return null;
}

/**
 * Parse quantity and unit from natural language input
 *
 * Examples:
 *   "20 bag"       → { quantity: 20, unit: 'bags' }
 *   "5 ton"        → { quantity: 5, unit: 'tonnes' }
 *   "500 pieces"   → { quantity: 500, unit: 'pieces' }
 */
function parseQuantityAndUnit(input) {
  const lower = input.toLowerCase().trim();

  // Match patterns like "20 bags", "5 ton", "500 pcs"
  const quantityMatch = lower.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?/);
  if (!quantityMatch) return { quantity: null, unit: null };

  const quantity = parseFloat(quantityMatch[1]);
  const rawUnit = quantityMatch[2] || '';

  // Resolve unit alias
  let resolvedUnit = null;
  for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
    if (aliases.includes(rawUnit)) {
      resolvedUnit = canonical;
      break;
    }
  }

  return { quantity, unit: resolvedUnit };
}

/**
 * Main fuzzy match function
 *
 * Takes raw contractor input and a list of material names from the database,
 * and returns the best match with confidence score.
 *
 * @param {string} input          – Raw text from contractor (e.g. "cemnt 20 bag")
 * @param {Array}  materialNames  – Array of { _id, name } from the Material collection
 * @returns {Object} { match, confidence, quantity, unit, suggestions }
 */
function fuzzyMatchMaterial(input, materialNames) {
  const lower = input.toLowerCase().trim();

  // Step 1: Strip numbers and units to isolate the material name portion
  const materialPart = lower.replace(/\d+(\.\d+)?/g, '').replace(/\s+/g, ' ').trim();
  const { quantity, unit } = parseQuantityAndUnit(lower);

  // Step 2: Try synonym match first (highest confidence)
  const synonymResult = matchSynonym(materialPart);

  // Step 3: Fuzzy-match against the actual DB material names
  let bestMatch = null;
  let bestScore = 0;

  for (const mat of materialNames) {
    const score = similarity(materialPart, mat.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mat;
    }
  }

  // Step 4: Combine results — prefer synonym if it's more confident
  let finalMatch = bestMatch;
  let finalConfidence = bestScore;

  if (synonymResult) {
    // Find the DB material that matches the synonym canonical name
    const synonymDbMatch = materialNames.find(
      (m) => m.name.toLowerCase() === synonymResult.name.toLowerCase()
    );
    if (synonymDbMatch && synonymResult.confidence > bestScore) {
      finalMatch = synonymDbMatch;
      finalConfidence = synonymResult.confidence;
    }
  }

  // Step 5: Gather top 3 suggestions
  const suggestions = materialNames
    .map((m) => ({
      ...m,
      score: similarity(materialPart, m.name),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({ _id: s._id, name: s.name, confidence: s.score }));

  return {
    originalInput: input,
    match: finalMatch
      ? { _id: finalMatch._id, name: finalMatch.name, confidence: finalConfidence, unit: finalMatch.unit }
      : null,
    quantity,
    unit,
    suggestions,
  };
}

module.exports = {
  fuzzyMatchMaterial,
  similarity,
  levenshteinDistance,
  parseQuantityAndUnit,
  matchSynonym,
  MATERIAL_SYNONYMS,
  UNIT_ALIASES,
};
