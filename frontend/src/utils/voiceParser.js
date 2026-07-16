import Fuse from 'fuse.js';

/**
 * Parses a voice command to extract quantity, material name, and contractor name.
 * @param {string} transcript - The spoken text
 * @param {Array} contractors - The list of available contractors for matching
 * @returns {Object} { action, quantity, unit, materialText, contractorText, matchedContractor }
 */
export const parseCommand = (transcript, contractors = []) => {
  let text = transcript.toLowerCase();
  
  // 1. Action
  let action = null;
  const actionWords = ['issue', 'add', 'return', 'transfer', 'give', 'send'];
  for (const word of actionWords) {
    const actionRegex = new RegExp(`^\\s*${word}\\s+`, 'i');
    if (actionRegex.test(text)) {
      action = 'issue'; // Normalize
      text = text.replace(actionRegex, '').trim();
      break;
    }
  }
  if (!action) {
    for (const word of actionWords) {
      if (text.includes(word)) {
        action = 'issue';
        text = text.replace(new RegExp(`\\b${word}\\b`, 'i'), '').trim();
        break;
      }
    }
  }

  // 2. Quantity
  let quantity = null;
  let unit = null;
  const qtyUnits = ['pieces', 'piece', 'bags', 'bag', 'kg', 'kgs', 'tons', 'ton', 'rods', 'rod', 'boxes', 'box', 'meters', 'meter', 'metres', 'metre', 'liters', 'liter', 'litres', 'litre', 'rolls', 'roll', 'units', 'unit'];
  const qtyRegex = new RegExp(`\\b(\\d+)\\s*(${qtyUnits.join('|')})\\b`, 'gi');
  
  const matches = [...text.matchAll(qtyRegex)];
  if (matches.length > 0) {
    // Take the last match to avoid picking up units that are part of the material name (e.g. "50 kg cement 10 bags")
    const lastMatch = matches[matches.length - 1];
    quantity = parseInt(lastMatch[1], 10);
    unit = lastMatch[2];
    text = text.substring(0, lastMatch.index) + text.substring(lastMatch.index + lastMatch[0].length);
    text = text.trim();
  } else {
    // Fallback: standalone number
    const startNumMatch = text.match(/^\b(\d+)\b/);
    if (startNumMatch) {
      quantity = parseInt(startNumMatch[1], 10);
      text = text.replace(/^\b\d+\b/, '').trim();
    } else {
      const endNumMatch = text.match(/\b(\d+)\b$/);
      if (endNumMatch) {
        quantity = parseInt(endNumMatch[1], 10);
        text = text.replace(/\b\d+\b$/, '').trim();
      }
    }
  }

  // 3. Contractor
  let contractorText = null;
  let matchedContractor = null;
  
  if (contractors && contractors.length > 0) {
    const sortedContractors = [...contractors].sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedContractors) {
      const name = c.name.toLowerCase();
      if (text.includes(name)) {
        matchedContractor = c;
        contractorText = c.name;
        // Remove contractor name, optionally preceded by "to"
        const regexTo = new RegExp(`\\bto\\s+${name}\\b`, 'i');
        if (regexTo.test(text)) {
          text = text.replace(regexTo, '').trim();
        } else {
          text = text.replace(new RegExp(`\\b${name}\\b`, 'i'), '').trim();
        }
        break;
      }
    }
  }

  if (!contractorText) {
    const toMatch = text.match(/\bto\s+([a-z\s]+)$/i);
    if (toMatch) {
      contractorText = toMatch[1].trim();
      text = text.replace(/\bto\s+[a-z\s]+$/i, '').trim();
    }
  }

  // 4. Material
  let materialText = text.trim();
  // Remove filler words if they were left over
  materialText = materialText.replace(/^(of)\s+/i, '').trim();

  return {
    action,
    quantity,
    unit,
    materialText,
    contractorText,
    matchedContractor
  };
};

/**
 * Fuzzy matches a text against a list of objects.
 * @param {string} text - The search term
 * @param {Array} list - Array of objects to search in
 * @param {Array<string>} keys - Keys in the objects to search against
 * @returns {Object|null} The best match object, or null
 */
export const matchEntity = (text, list, keys) => {
  if (!text || !list || list.length === 0) return null;
  
  const options = {
    includeScore: true,
    keys: keys,
    threshold: 0.6, // increased threshold for looser matching (e.g. 'electric wires' -> 'Electrical Cable 2.5 sq.mm')
    ignoreLocation: true,
  };
  
  const fuse = new Fuse(list, options);
  const results = fuse.search(text);
  
  if (results.length > 0) {
    return results[0].item;
  }
  return null;
};
