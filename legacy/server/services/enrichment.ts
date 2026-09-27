import {
  Lead,
  LeadEnrichmentData,
  FieldValidation,
  DomainValidationResult,
  EmailValidationResult,
  LeadStatus,
  OpportunityPriority
} from '../../src/types.ts';
import { logger } from './logging.ts';

/**
 * Disposable email domain database for safe offline email verification
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'yopmail.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'dispostable.com',
  'getairmail.com',
  'throwawaymail.com',
  'temp-mail.org',
  'sharklasers.com',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.org',
  'anonymbox.com'
]);

/**
 * Country standardization map
 */
const COUNTRY_STANDARDIZATION_MAP: Record<string, string> = {
  'us': 'United States',
  'usa': 'United States',
  'united states of america': 'United States',
  'uk': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'gb': 'United Kingdom',
  'england': 'United Kingdom',
  'fr': 'France',
  'france': 'France',
  'de': 'Germany',
  'germany': 'Germany',
  'deutschland': 'Germany',
  'ca': 'Canada',
  'canada': 'Canada',
  'au': 'Australia',
  'australia': 'Australia',
  'nz': 'New Zealand',
  'nl': 'Netherlands',
  'netherlands': 'Netherlands',
  'holland': 'Netherlands',
  'es': 'Spain',
  'spain': 'Spain',
  'it': 'Italy',
  'italy': 'Italy',
  'br': 'Brazil',
  'brazil': 'Brazil',
  'in': 'India',
  'india': 'India',
  'jp': 'Japan',
  'japan': 'Japan',
  'ch': 'Switzerland',
  'switzerland': 'Switzerland'
};

/**
 * Normalizes email address by trimming and lowercasing
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalizes URLs by lowercasing hostnames, adding protocol, and stripping tracking parameters
 */
export function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned) return '';

  // Add protocol if missing
  if (!/^https?:\/\//i.test(cleaned) && !/^\/\//.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Remove UTM and standard marketing tracking queries
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi'
    ];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    
    // Construct the normalized string
    let result = parsed.origin + parsed.pathname;
    if (parsed.search) {
      result += parsed.search;
    }
    
    // Strip trailing slashes for standard root matching
    if (result.endsWith('/') && parsed.pathname === '/') {
      result = result.slice(0, -1);
    }
    
    return result;
  } catch (e) {
    // Return original cleaned if parser fails
    return cleaned.replace(/\/+$/, '');
  }
}

/**
 * Normalize social media profile URLs
 */
export function normalizeSocialUrl(url: string, platform: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'youtube'): string {
  let cleaned = url.trim();
  if (!cleaned) return '';

  // Ensure it has protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Clean hostname typos/variations
    if (platform === 'linkedin' && !parsed.hostname.includes('linkedin.com')) {
      parsed.hostname = 'linkedin.com';
    } else if (platform === 'facebook' && !parsed.hostname.includes('facebook.com')) {
      parsed.hostname = 'facebook.com';
    } else if (platform === 'instagram' && !parsed.hostname.includes('instagram.com')) {
      parsed.hostname = 'instagram.com';
    } else if (platform === 'x' && !parsed.hostname.includes('x.com') && !parsed.hostname.includes('twitter.com')) {
      parsed.hostname = 'x.com';
    } else if (platform === 'youtube' && !parsed.hostname.includes('youtube.com') && !parsed.hostname.includes('youtu.be')) {
      parsed.hostname = 'youtube.com';
    }

    // Clean tracking query arguments
    parsed.search = '';
    
    let result = parsed.origin + parsed.pathname;
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch (e) {
    return cleaned;
  }
}

/**
 * Standardize phone numbers by stripping whitespace, brackets, hyphens but retaining leading plus
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.trim();
  if (!cleaned) return '';
  const startsWithPlus = cleaned.startsWith('+');
  const digitsOnly = cleaned.replace(/\D/g, '');
  return (startsWithPlus ? '+' : '') + digitsOnly;
}

/**
 * Standardize country names to standard country forms
 */
export function normalizeCountry(country: string): string {
  const cleaned = country.trim().toLowerCase();
  if (!cleaned) return '';
  if (COUNTRY_STANDARDIZATION_MAP[cleaned]) {
    return COUNTRY_STANDARDIZATION_MAP[cleaned];
  }
  // Title case by default
  return country
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Standardize language codes
 */
export function normalizeLanguageCode(code: string): string {
  const cleaned = code.trim().toLowerCase().substring(0, 2);
  if (!cleaned) return 'en';
  return cleaned;
}

/**
 * Basic Jaro-Winkler/Levenshtein string distance helper for similarity matching
 */
export function calculateStringSimilarity(s1: string, s2: string): number {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  // Simple bigram similarity
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersection = 0;
  
  bigramsA.forEach(bigram => {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  });

  const total = bigramsA.size + bigramsB.size;
  if (total === 0) return 0;
  return (2.0 * intersection) / total;
}

/**
 * Validates business name formatting and provides suggestions
 */
export function validateBusinessName(name: string): FieldValidation {
  const cleaned = name.trim();
  if (!cleaned) {
    return { valid: false, error: 'Business name is required' };
  }
  if (cleaned.length < 2) {
    return { valid: false, error: 'Business name is too short (min 2 characters)' };
  }

  // Suggest trimming double spaces or capitalisation correction
  let suggestion: string | null = null;
  const regexDoubleSpace = /\s{2,}/g;
  let formatted = cleaned.replace(regexDoubleSpace, ' ');
  
  // Suggest proper capitalization if it is all caps or all lowercase
  if (formatted === formatted.toUpperCase() && formatted.length > 3) {
    formatted = formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    suggestion = formatted;
  } else if (formatted === formatted.toLowerCase()) {
    formatted = formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    suggestion = formatted;
  } else if (cleaned !== formatted) {
    suggestion = formatted;
  }

  return {
    valid: true,
    error: null,
    suggestion
  };
}

/**
 * Validates email structure and detects disposable domains
 */
export function validateEmail(email: string): FieldValidation & { emailDetails?: EmailValidationResult } {
  const cleaned = email.trim();
  if (!cleaned) {
    return { valid: false, error: 'Email address is missing', emailDetails: { validFormat: false, isDisposable: false, domainExists: false } };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validFormat = emailRegex.test(cleaned);

  if (!validFormat) {
    return {
      valid: false,
      error: 'Invalid email syntax format',
      emailDetails: { validFormat: false, isDisposable: false, domainExists: false }
    };
  }

  const domain = cleaned.split('@')[1]?.toLowerCase() || '';
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);
  
  if (isDisposable) {
    return {
      valid: false,
      error: 'Disposable email addresses are not accepted',
      emailDetails: { validFormat: true, isDisposable: true, domainExists: true }
    };
  }

  return {
    valid: true,
    error: null,
    emailDetails: {
      validFormat: true,
      isDisposable: false,
      domainExists: true // Assumed true because of valid format
    }
  };
}

/**
 * Validates phone numbers format
 */
export function validatePhone(phone: string): FieldValidation {
  const cleaned = phone.trim();
  if (!cleaned) {
    return { valid: false, error: 'Phone number is missing' };
  }

  // Basic syntax: can start with optional plus, then 7 to 15 digits (standard E.164)
  // Let's support formatting marks like dashes, spaces, and brackets for initial check
  const phoneStrip = cleaned.replace(/[\s\-\(\)\+]/g, '');
  const digitsOnly = /^\d+$/;

  if (!digitsOnly.test(phoneStrip)) {
    return { valid: false, error: 'Phone number contains invalid non-numeric characters' };
  }

  if (phoneStrip.length < 7) {
    return { valid: false, error: 'Phone number is too short (min 7 digits)' };
  }

  if (phoneStrip.length > 15) {
    return { valid: false, error: 'Phone number is too long (max 15 digits for E.164)' };
  }

  // Suggest formatting as E.164 standard
  let normalized = normalizePhone(cleaned);
  let suggestion: string | null = null;
  if (cleaned !== normalized) {
    suggestion = normalized;
  }

  return {
    valid: true,
    error: null,
    suggestion
  };
}

/**
 * Validates domain structure and runs formatting tests
 */
export function validateDomain(website: string): FieldValidation & { domainDetails?: DomainValidationResult } {
  const cleaned = website.trim();
  if (!cleaned) {
    return {
      valid: false,
      error: 'Website URL is missing',
      domainDetails: {
        validFormat: false,
        isHttps: false,
        redirectsOk: false,
        dnsResolved: false,
        reachability: 'unknown'
      }
    };
  }

  // URL Syntax regex
  let urlToTest = cleaned;
  if (!/^https?:\/\//i.test(cleaned)) {
    urlToTest = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(urlToTest);
    const domainParts = parsed.hostname.split('.');
    
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
      throw new Error('Invalid TLD');
    }

    const isHttps = parsed.protocol === 'https:';

    return {
      valid: true,
      error: null,
      domainDetails: {
        validFormat: true,
        isHttps,
        redirectsOk: true,
        dnsResolved: true,
        reachability: 'reachable', // Local offline assumption / success resolution
        statusCode: 200
      }
    };
  } catch (e) {
    return {
      valid: false,
      error: 'Invalid website domain format',
      domainDetails: {
        validFormat: false,
        isHttps: false,
        redirectsOk: false,
        dnsResolved: false,
        reachability: 'unreachable'
      }
    };
  }
}

/**
 * Validates social URL profile consistency
 */
export function validateSocialUrl(url: string, platform: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'youtube'): FieldValidation {
  const cleaned = url.trim();
  if (!cleaned) {
    return { valid: false, error: 'Link is empty' };
  }

  try {
    let testUrl = cleaned;
    if (!/^https?:\/\//i.test(cleaned)) {
      testUrl = 'https://' + cleaned;
    }
    const parsed = new URL(testUrl);
    const hostname = parsed.hostname.toLowerCase();
    
    if (!hostname.includes(platform + '.com') && !hostname.includes(platform + '.co') && !hostname.includes('youtu.be') && !hostname.includes('twitter.com')) {
      return { valid: false, error: `URL domain does not match ${platform}` };
    }

    let suggestion: string | null = null;
    const normalized = normalizeSocialUrl(cleaned, platform);
    if (cleaned !== normalized) {
      suggestion = normalized;
    }

    return {
      valid: true,
      error: null,
      suggestion
    };
  } catch (e) {
    return { valid: false, error: 'Invalid URL syntax' };
  }
}

/**
 * Calculates a Lead Completeness Score (0-100) based on fields present and valid
 */
export function calculateCompleteness(lead: Lead): { score: number; missingFields: string[] } {
  let score = 0;
  const missingFields: string[] = [];

  // 1. Email check (15%)
  if (lead.email && lead.email.trim() && validateEmail(lead.email).valid) {
    score += 15;
  } else {
    missingFields.push('email');
  }

  // 2. Phone check (15%)
  if (lead.phone && lead.phone.trim() && validatePhone(lead.phone).valid) {
    score += 15;
  } else {
    missingFields.push('phone');
  }

  // 3. WhatsApp (10%)
  if (lead.whatsapp && lead.whatsapp.trim()) {
    score += 10;
  } else {
    missingFields.push('whatsapp');
  }

  // 4. Website URL (15%)
  if (lead.website && lead.website.trim() && validateDomain(lead.website).valid) {
    score += 15;
  } else {
    missingFields.push('website');
  }

  // 5. Industry (10%)
  if (lead.industry && lead.industry.trim()) {
    score += 10;
  } else {
    missingFields.push('industry');
  }

  // 6. City (10%)
  if (lead.city && lead.city.trim()) {
    score += 10;
  } else {
    missingFields.push('city');
  }

  // 7. Country (10%)
  if (lead.country && lead.country.trim()) {
    score += 10;
  } else {
    missingFields.push('country');
  }

  // 8. Social profile check (LinkedIn, FB, IG) (10%)
  if (
    (lead.linkedinUrl && lead.linkedinUrl.trim()) ||
    (lead.facebookUrl && lead.facebookUrl.trim()) ||
    (lead.instagramUrl && lead.instagramUrl.trim())
  ) {
    score += 10;
  } else {
    missingFields.push('socialProfile');
  }

  // 9. Notes or tag coverage (5%)
  if ((lead.notes && lead.notes.trim()) || (lead.tags && lead.tags.length > 0)) {
    score += 5;
  } else {
    missingFields.push('notesOrTags');
  }

  return {
    score,
    missingFields
  };
}

/**
 * Heuristics-based Industry Classifier (Rules Engine)
 */
export function suggestIndustry(businessName: string, domain: string, currentIndustry?: string | null): string[] {
  const suggestions: string[] = [];
  const text = (businessName + ' ' + domain).toLowerCase();

  const rules: { keywords: string[]; industry: string }[] = [
    { keywords: ['dental', 'clinic', 'medical', 'dentist', 'physio', 'doctor', 'hospital', 'therapist', 'care', 'ortho', 'chiropractic', 'teeth', 'health'], industry: 'Healthcare & Medical' },
    { keywords: ['law', 'legal', 'attorney', 'solicitor', 'advocate', 'counsel', 'juris', 'notary'], industry: 'Legal Services' },
    { keywords: ['gym', 'fitness', 'crossfit', 'yoga', 'trainer', 'studio', 'athletics', 'workout', 'wellness', 'pilates'], industry: 'Health & Fitness' },
    { keywords: ['software', 'tech', 'saas', 'app', 'code', 'cloud', 'digital', 'systems', 'cyber', 'network', 'analytics', 'data'], industry: 'Software & IT' },
    { keywords: ['restaurant', 'cafe', 'food', 'bistro', 'kitchen', 'diner', 'grill', 'bakery', 'pub', 'bar', 'eats', 'brewing'], industry: 'Food & Beverage' },
    { keywords: ['agency', 'marketing', 'seo', 'design', 'ad', 'creative', 'media', 'branding', 'pr', 'social', 'studio'], industry: 'Marketing & Advertising' },
    { keywords: ['consulting', 'finance', 'advisory', 'tax', 'accounting', 'auditing', 'capital', 'wealth', 'management'], industry: 'Consulting & Professional Services' },
    { keywords: ['real estate', 'realty', 'properties', 'broker', 'homes', 'housing', 'estate', 'realtor', 'rentals'], industry: 'Real Estate' },
    { keywords: ['school', 'academy', 'learn', 'college', 'university', 'tutoring', 'education', 'institute', 'class', 'training'], industry: 'Education' },
    { keywords: ['store', 'shop', 'retail', 'boutique', 'commerce', 'apparel', 'fashion', 'sales', 'outlet', 'supermarket'], industry: 'Retail & E-commerce' },
    { keywords: ['builder', 'construction', 'homes', 'remodel', 'contractor', 'plumbing', 'electric', 'roofing', 'hvac'], industry: 'Construction & Trades' }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      suggestions.push(rule.industry);
    }
  }

  // Ensure current industry is included or prioritized
  if (currentIndustry && !suggestions.includes(currentIndustry)) {
    suggestions.unshift(currentIndustry);
  }

  // Fallback to general B2B if none matched
  if (suggestions.length === 0) {
    suggestions.push('Professional Services', 'Local Business');
  }

  return [...new Set(suggestions)];
}

/**
 * Tag Intelligence Engine - Generates dynamic tag suggestions
 */
export function suggestTags(industry: string | null, location: string | null, source: string | null): string[] {
  const tags: string[] = [];
  const ind = (industry || '').toLowerCase();
  
  if (ind.includes('healthcare') || ind.includes('dental') || ind.includes('medical')) {
    tags.push('#medical-clinic', '#appointment-funnel', '#patient-acquisition');
  } else if (ind.includes('legal') || ind.includes('law')) {
    tags.push('#legal-services', '#attorney-funnel', '#client-lead-gen');
  } else if (ind.includes('gym') || ind.includes('fitness') || ind.includes('health')) {
    tags.push('#fitness-leads', '#gym-membership', '#local-marketing');
  } else if (ind.includes('software') || ind.includes('tech') || ind.includes('saas') || ind.includes('it')) {
    tags.push('#saas-demo', '#it-services', '#b2b-outreach');
  } else if (ind.includes('restaurant') || ind.includes('food') || ind.includes('beverage')) {
    tags.push('#local-dining', '#delivery-promo', '#restaurant-marketing');
  } else if (ind.includes('marketing') || ind.includes('agency') || ind.includes('ad')) {
    tags.push('#agency-collab', '#seo-audit', '#design-proposal');
  } else if (ind.includes('retail') || ind.includes('commerce') || ind.includes('shop')) {
    tags.push('#ecommerce-sales', '#retail-foot-traffic', '#brand-awareness');
  } else if (ind.includes('construction') || ind.includes('builder') || ind.includes('trades')) {
    tags.push('#contractor-marketing', '#local-leads', '#renovation-proposals');
  }

  // Location tag
  if (location && location.trim()) {
    const formattedLoc = location.trim().toLowerCase().replace(/\s+/g, '-');
    tags.push(`#local-${formattedLoc}`);
  }

  // Lead Source tag
  if (source && source.trim()) {
    const formattedSrc = source.trim().toLowerCase().replace(/\s+/g, '-');
    tags.push(`#src-${formattedSrc}`);
  }

  // General fallback indicators
  tags.push('#cold-outreach', '#needs-qualification');

  return [...new Set(tags)];
}

/**
 * Prepares and updates enrichment object for a Lead
 */
export function enrichLead(lead: Lead, allLeadsInWorkspace: Lead[] = []): LeadEnrichmentData {
  // 1. Normalizations (We don't mutate the core lead yet; we provide suggested formats and validations)
  const nameVal = validateBusinessName(lead.businessName);
  const webVal = validateDomain(lead.website || '');
  const emailVal = validateEmail(lead.email || '');
  const phoneVal = validatePhone(lead.phone || '');
  
  // Clean social URL states
  const lnVal = validateSocialUrl(lead.linkedinUrl || '', 'linkedin');
  const fbVal = validateSocialUrl(lead.facebookUrl || '', 'facebook');
  const igVal = validateSocialUrl(lead.instagramUrl || '', 'instagram');
  const xVal = validateSocialUrl(lead.googleBusinessUrl || '', 'facebook'); // simple proxy check
  
  // Country & City validations
  const countryVal: FieldValidation = lead.country 
    ? { valid: true, error: null, suggestion: normalizeCountry(lead.country) }
    : { valid: false, error: 'Country is unassigned' };

  const cityVal: FieldValidation = lead.city
    ? { valid: true, error: null, suggestion: lead.city.trim() }
    : { valid: false, error: 'City is unassigned' };

  // 2. Score calculations
  const { score: completenessScore, missingFields } = calculateCompleteness(lead);

  // 3. Language & Location Preps
  const preferredLanguage = lead.languageCode || 'en';
  
  // Deduce Region / timezone if possible
  let timezone: string | null = null;
  const ctry = (lead.country || '').trim().toLowerCase();
  if (ctry === 'united states' || ctry === 'usa' || ctry === 'ca' || ctry === 'canada') {
    timezone = 'America/New_York'; // Default Eastern Standard approximation
  } else if (ctry === 'united kingdom' || ctry === 'uk' || ctry === 'gb') {
    timezone = 'Europe/London';
  } else if (ctry === 'france' || ctry === 'germany' || ctry === 'it' || ctry === 'es') {
    timezone = 'Europe/Paris';
  } else if (ctry === 'australia' || ctry === 'au') {
    timezone = 'Australia/Sydney';
  } else {
    timezone = 'UTC';
  }

  // 4. Industry Classifier & Tag recommendation
  const industrySuggestions = suggestIndustry(lead.businessName, lead.website || '', lead.industry);
  const tagRecommendations = suggestTags(lead.industry, lead.city, lead.leadSource);

  // 5. Duplicate Detection Scanner
  const duplicateGroupIds: string[] = [];
  const normalizedWeb = lead.website ? normalizeUrl(lead.website) : '';
  const normalizedEmail = lead.email ? normalizeEmail(lead.email) : '';
  const normalizedPhone = lead.phone ? normalizePhone(lead.phone) : '';

  allLeadsInWorkspace.forEach(other => {
    if (other.id === lead.id) return;

    let isMatch = false;

    // A. Website match
    if (normalizedWeb && other.website) {
      if (normalizeUrl(other.website) === normalizedWeb) {
        isMatch = true;
      }
    }

    // B. Email match
    if (normalizedEmail && other.email) {
      if (normalizeEmail(other.email) === normalizedEmail) {
        isMatch = true;
      }
    }

    // C. Phone match
    if (normalizedPhone && other.phone) {
      const otherPhoneClean = normalizePhone(other.phone);
      if (otherPhoneClean && otherPhoneClean === normalizedPhone) {
        isMatch = true;
      }
    }

    // D. Business name similarity
    if (calculateStringSimilarity(lead.businessName, other.businessName) > 0.85) {
      isMatch = true;
    }

    if (isMatch) {
      duplicateGroupIds.push(other.id);
    }
  });

  const existingIgnored = lead.enrichment?.ignoredDuplicateIds || [];

  return {
    completenessScore,
    missingFields,
    validations: {
      businessName: nameVal,
      website: webVal,
      email: emailVal,
      phone: phoneVal,
      country: countryVal,
      city: cityVal,
      socials: {
        linkedin: lnVal,
        facebook: fbVal,
        instagram: igVal,
        x: { valid: true, error: null },
        youtube: { valid: true, error: null }
      }
    },
    languagePrep: {
      preferredLanguage,
      secondaryLanguage: null,
      confidence: 90
    },
    locationPrep: {
      country: lead.country || null,
      region: lead.city ? 'State/Region' : null,
      city: lead.city || null,
      timezone
    },
    industrySuggestions,
    tagRecommendations,
    duplicateGroupIds: duplicateGroupIds.filter(id => !existingIgnored.includes(id)),
    ignoredDuplicateIds: existingIgnored
  };
}
