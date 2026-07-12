import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { logger } from './logging.ts';

export interface CrawlResult {
  url: string;
  success: boolean;
  error?: string;
  rawHtmlSize: number;
  cleanedHtmlSize: number;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogUrl: string | null;
    twitterCard: string | null;
    canonicalUrl: string | null;
    language: string | null;
    charset: string | null;
    viewport: string | null;
    favicons: string[];
    structuredData: any[];
  };
  technologies: {
    cms: string | null;
    frameworks: string[];
    css: string[];
    analytics: string[];
    security: string[];
    techStack: string[]; // Flat list of all detected technologies
  };
  structure: {
    hasHeader: boolean;
    hasFooter: boolean;
    hasHero: boolean;
    hasCta: boolean;
    ctaCount: number;
    hasNavigation: boolean;
    hasContactForm: boolean;
    hasBookingWidget: boolean;
    bookingProvider: string | null;
    hasPricing: boolean;
    hasPortfolio: boolean;
    hasTestimonials: boolean;
    hasFaq: boolean;
    hasBlog: boolean;
    hasGallery: boolean;
    hasServices: boolean;
    emails: string[];
    phones: string[];
    socialLinks: {
      linkedin?: string;
      facebook?: string;
      instagram?: string;
      x?: string;
      youtube?: string;
    };
  };
  heuristics: {
    seoScore: number;
    seoIssues: string[];
    uxScore: number;
    uxIssues: string[];
    mobileScore: number;
    mobileIssues: string[];
    accessibilityScore: number;
    accessibilityIssues: string[];
    performanceScore: number;
    performanceIssues: string[];
    brandingScore: number;
    brandingIssues: string[];
    contentScore: number;
    contentIssues: string[];
    securityScore: number;
    securityIssues: string[];
    trustScore: number;
    trustIssues: string[];
  };
  cleanedText: string;
}

const USER_AGENT = 'AI-Outreach-Bot/1.1';

/**
 * Normalizes URL before crawling
 */
function prepareUrl(url: string): string {
  let cleaned = url.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

/**
 * Checks if the crawler is allowed to access the URL based on robots.txt
 */
async function isAllowedByRobotsTxt(targetUrl: string): Promise<boolean> {
  try {
    const urlObj = new URL(targetUrl);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });
    
    if (response.ok) {
      const robotsTxt = await response.text();
      const robots = robotsParser(robotsUrl, robotsTxt);
      const isAllowed = robots.isAllowed(targetUrl, USER_AGENT);
      
      const crawlDelay = robots.getCrawlDelay(USER_AGENT);
      if (crawlDelay) {
        logger.info('Crawler', `Crawl delay requested: ${crawlDelay}s`);
        await new Promise(resolve => setTimeout(resolve, crawlDelay * 1000));
      }
      
      return isAllowed ?? true; // Default to true if unspecified
    }
  } catch (error) {
    logger.warn('Crawler', `Failed to fetch or parse robots.txt for ${targetUrl}. Proceeding with crawl.`);
  }
  return true;
}

/**
 * Crawls and extracts rich features from the target business homepage
 */
export async function crawlHomepage(targetUrl: string): Promise<CrawlResult> {
  const url = prepareUrl(targetUrl);
  logger.info('Crawler', `Starting single-page crawl of: ${url}`);

  try {
    const isAllowed = await isAllowedByRobotsTxt(url);
    if (!isAllowed) {
      throw new Error(`Crawling disallowed by robots.txt for ${url}`);
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ${USER_AGENT}`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP fetch failed with status: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`Invalid content type received: ${contentType}. Expected HTML.`);
    }

    const rawHtml = await response.text();
    const rawHtmlSize = Buffer.byteLength(rawHtml, 'utf8');
    
    // Parse using Cheerio
    const $ = cheerio.load(rawHtml);

    // 1. EXTRACT METADATA
    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
    const description = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || '';
    const keywordsRaw = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim()).filter(Boolean) : [];
    
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || null;
    const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;
    const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() || null;
    
    const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || null;
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || null;
    const language = $('html').attr('lang')?.trim() || $('meta[name="language"]').attr('content')?.trim() || null;
    const charset = $('meta[charset]').attr('charset')?.trim() || $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([\w\-]+)/i)?.[1] || null;
    const viewport = $('meta[name="viewport"]').attr('content')?.trim() || null;

    const favicons: string[] = [];
    $('link[rel*="icon"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) favicons.push(href);
    });

    const structuredData: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text().trim();
        if (text) structuredData.push(JSON.parse(text));
      } catch (e) {
        // Ignored parse error in structured data
      }
    });

    // 2. SOCIAL LINKS & CONTACT DETAILS
    const emailsSet = new Set<string>();
    const phonesSet = new Set<string>();
    const socialLinks: Record<string, string> = {};

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim() || '';
      
      // Mailto links
      if (href.startsWith('mailto:')) {
        const email = href.substring(7).split('?')[0].trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailsSet.add(email.toLowerCase());
        }
      }

      // Tel links
      if (href.startsWith('tel:')) {
        const phone = href.substring(4).split('?')[0].trim();
        if (phone) phonesSet.add(phone);
      }

      // Social networks
      if (href.includes('linkedin.com')) {
        socialLinks.linkedin = href;
      } else if (href.includes('facebook.com')) {
        socialLinks.facebook = href;
      } else if (href.includes('instagram.com')) {
        socialLinks.instagram = href;
      } else if (href.includes('twitter.com') || href.includes('x.com')) {
        socialLinks.x = href;
      } else if (href.includes('youtube.com') || href.includes('youtu.be')) {
        socialLinks.youtube = href;
      }
    });

    // Parse plain text emails and phones as fallbacks if none found
    if (emailsSet.size === 0) {
      const textBody = $('body').text();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = textBody.match(emailRegex);
      if (matches) {
        matches.forEach(email => {
          if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.endsWith('.gif')) {
            emailsSet.add(email.toLowerCase());
          }
        });
      }
    }

    if (phonesSet.size === 0) {
      const textBody = $('body').text();
      // Simple US/Int phone regex match
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const matches = textBody.match(phoneRegex);
      if (matches) {
        matches.slice(0, 5).forEach(p => phonesSet.add(p.trim()));
      }
    }

    // 3. TECHNOLOGY DETECTION
    const htmlLower = rawHtml.toLowerCase();
    const cmsList: { name: string; pattern: string | RegExp }[] = [
      { name: 'WordPress', pattern: /wp-content|wp-includes|wp-json/i },
      { name: 'Shopify', pattern: /shopify\.com|Shopify\.theme|shopify-assets/i },
      { name: 'Webflow', pattern: /data-wf-page|webflow\.com/i },
      { name: 'Squarespace', pattern: /squarespace\.com|squarespace-headers/i },
      { name: 'Wix', pattern: /wix\.com|wix-code/i },
      { name: 'HubSpot', pattern: /hubspot\.com|hs-script/i },
    ];

    let cmsDetected: string | null = null;
    for (const cms of cmsList) {
      if (cms.pattern instanceof RegExp ? cms.pattern.test(rawHtml) : htmlLower.includes(cms.pattern)) {
        cmsDetected = cms.name;
        break;
      }
    }

    const frameworks: string[] = [];
    if (htmlLower.includes('_next') || htmlLower.includes('__next_data__')) frameworks.push('Next.js');
    if (htmlLower.includes('react') || htmlLower.includes('data-reactroot')) frameworks.push('React');
    if (htmlLower.includes('vue') || htmlLower.includes('data-v-')) frameworks.push('Vue.js');
    if (htmlLower.includes('nuxt')) frameworks.push('Nuxt.js');
    if (htmlLower.includes('angular') || htmlLower.includes('ng-version')) frameworks.push('Angular');
    if (htmlLower.includes('gatsby')) frameworks.push('Gatsby');
    if (htmlLower.includes('jquery')) frameworks.push('jQuery');

    const css: string[] = [];
    if (htmlLower.includes('tailwind') || htmlLower.includes('un-unocss') || rawHtml.includes('tw-')) css.push('Tailwind CSS');
    if (htmlLower.includes('bootstrap')) css.push('Bootstrap');
    if (htmlLower.includes('mui-') || htmlLower.includes('material-ui')) css.push('Material-UI');
    if (htmlLower.includes('font-awesome') || htmlLower.includes('fa-')) css.push('FontAwesome');

    const analytics: string[] = [];
    if (htmlLower.includes('googletagmanager.com') || htmlLower.includes('gtag(')) analytics.push('Google Analytics');
    if (htmlLower.includes('connect.facebook.net/en_us/fbevents.js') || htmlLower.includes('fbq(')) analytics.push('Facebook Pixel');
    if (htmlLower.includes('hotjar')) analytics.push('Hotjar');
    if (htmlLower.includes('mixpanel')) analytics.push('Mixpanel');

    const security: string[] = [];
    if (url.startsWith('https://')) security.push('SSL/HTTPS');
    if (htmlLower.includes('cloudflare') || htmlLower.includes('/cdn-cgi/')) security.push('Cloudflare CDN');

    // Combine into flat list
    const techStack = [
      ...(cmsDetected ? [cmsDetected] : []),
      ...frameworks,
      ...css,
      ...analytics,
      ...security
    ];

    // 4. STRUCTURE ANALYSIS
    const hasHeader = $('header, .header, #header, nav, .navbar').length > 0;
    const hasFooter = $('footer, .footer, #footer, .copyright').length > 0;
    const hasHero = $('section[class*="hero"], div[class*="hero"], .hero-section, #hero, .hero').length > 0;
    
    const ctaButtons = $('a[href*="contact"], a[href*="book"], a[href*="get-started"], a[href*="pricing"], button:contains("Book"), button:contains("Start"), button:contains("Quote"), button:contains("Contact")');
    const hasCta = ctaButtons.length > 0;
    const ctaCount = ctaButtons.length;
    
    const hasNavigation = $('nav, [role="navigation"], .nav-menu, .navigation').length > 0;
    const hasContactForm = $('form[action*="contact"], form:has(input[type="email"]):has(textarea)').length > 0;
    
    const pageText = $('body').text().toLowerCase();
    const hasBookingWidget = pageText.includes('calendly.com') || pageText.includes('acuityscheduling') || pageText.includes('bookingbug') || pageText.includes('oncehub') || pageText.includes('scheduleonce') || pageText.includes('bookeo') || pageText.includes('book now');
    let bookingProvider: string | null = null;
    if (pageText.includes('calendly.com')) bookingProvider = 'Calendly';
    else if (pageText.includes('acuityscheduling')) bookingProvider = 'Acuity';
    else if (hasBookingWidget) bookingProvider = 'Generic / Custom';

    const hasPricing = $('[class*="pricing"], [id*="pricing"], :contains("Pricing"), :contains("Plans")').length > 0;
    const hasPortfolio = $('[class*="portfolio"], [id*="portfolio"], [class*="gallery"], :contains("Portfolio"), :contains("Case Studies")').length > 0;
    const hasTestimonials = $('[class*="testimonial"], [class*="review"], :contains("Testimonials"), :contains("What our clients say"), :contains("Reviews")').length > 0;
    const hasFaq = $('[class*="faq"], [id*="faq"], :contains("FAQ"), :contains("Frequently Asked Questions")').length > 0;
    const hasBlog = $('[class*="blog"], [id*="blog"], :contains("Blog"), :contains("Latest News")').length > 0;
    const hasGallery = $('[class*="gallery"], [id*="gallery"], .gallery-grid').length > 0;
    const hasServices = $('[class*="services"], [id*="services"], :contains("Services"), :contains("What we do")').length > 0;

    // 5. HTML CLEANER FOR AI TOKEN EFFICIENCY
    // Clone page to avoid mutating original parse
    const clean$ = cheerio.load(rawHtml);
    clean$('script, style, svg, link, iframe, noscript, comment, img, head').remove();
    // Remove inline styles or attributes
    clean$('*').each((_, el) => {
      const attribs = (el as any).attribs || {};
      for (const attr of Object.keys(attribs)) {
        if (attr !== 'href' && attr !== 'id' && attr !== 'class' && attr !== 'type' && attr !== 'name' && attr !== 'placeholder') {
          clean$(el).removeAttr(attr);
        }
      }
    });

    const cleanedHtml = clean$('body').html() || '';
    const cleanedHtmlSize = Buffer.byteLength(cleanedHtml, 'utf8');

    // Extract a condensed raw-ish text summary of headings and elements for token efficiency
    const textBuilder: string[] = [];
    if (title) textBuilder.push(`Page Title: ${title}`);
    if (description) textBuilder.push(`Meta Description: ${description}`);
    if (cmsDetected) textBuilder.push(`CMS: ${cmsDetected}`);
    if (techStack.length > 0) textBuilder.push(`Tech Stack: ${techStack.join(', ')}`);

    // Extract structured contents
    clean$('h1, h2, h3, h4, p, a, button, li').each((_, el) => {
      const tagName = el.tagName.toLowerCase();
      const txt = clean$(el).text().replace(/\s+/g, ' ').trim();
      if (txt && txt.length > 3) {
        if (tagName.startsWith('h')) {
          textBuilder.push(`[Heading ${tagName.toUpperCase()}] ${txt}`);
        } else if (tagName === 'button' || (tagName === 'a' && clean$(el).attr('class')?.includes('btn'))) {
          textBuilder.push(`[CTA/Button] ${txt}`);
        } else if (tagName === 'p' && txt.length > 15) {
          textBuilder.push(`[Paragraph] ${txt}`);
        } else if (tagName === 'li') {
          textBuilder.push(`[Bullet] ${txt}`);
        }
      }
    });

    const cleanedText = textBuilder.slice(0, 150).join('\n'); // Limit to 150 blocks to be token-lean (< 10k chars)

    // 6. HEURISTIC AUDITING & SCORING
    const seoIssues: string[] = [];
    let seoScore = 100;
    if (!title) { seoScore -= 25; seoIssues.push('Missing homepage title tag'); }
    if (title && title.length < 15) { seoScore -= 10; seoIssues.push('Title tag is too short (< 15 chars) for target ranking keyword depth'); }
    if (!description) { seoScore -= 25; seoIssues.push('Missing meta description tag'); }
    if (description && description.length < 50) { seoScore -= 10; seoIssues.push('Meta description is too short for search engine snippets'); }
    if ($('h1').length === 0) { seoScore -= 15; seoIssues.push('Missing main heading (H1) tag on homepage'); }
    if ($('h1').length > 1) { seoScore -= 5; seoIssues.push('Multiple H1 tags detected - heading hierarchy should be singular'); }
    if (!canonicalUrl) { seoScore -= 10; seoIssues.push('Missing canonical link element to prevent search engine indexing duplication'); }
    
    let imagesWithNoAlt = 0;
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) imagesWithNoAlt++;
    });
    if (imagesWithNoAlt > 0) {
      seoScore -= Math.min(15, imagesWithNoAlt * 2);
      seoIssues.push(`${imagesWithNoAlt} images are missing alternative text (alt) tags, hurting image SEO indexing`);
    }
    seoScore = Math.max(10, seoScore);

    const uxIssues: string[] = [];
    let uxScore = 100;
    if (!hasHeader) { uxScore -= 15; uxIssues.push('Missing structured header navigation menu'); }
    if (!hasFooter) { uxScore -= 15; uxIssues.push('Missing page footer containing standard copyright, legal links, and address'); }
    if (!hasCta) { uxScore -= 25; uxIssues.push('Missing clear direct conversion elements (CTA buttons) above the fold'); }
    if (ctaCount < 2) { uxScore -= 10; uxIssues.push('Low frequency of call-to-actions, conversion paths are sparse'); }
    if (!hasNavigation) { uxScore -= 10; uxIssues.push('Navigation structure is non-standard or missing'); }
    if (!hasContactForm) { uxScore -= 15; uxIssues.push('No direct contact form detected, forcing user to bounce or manually mail'); }
    uxScore = Math.max(10, uxScore);

    const mobileIssues: string[] = [];
    let mobileScore = 100;
    if (!viewport) { mobileScore -= 50; mobileIssues.push('Missing responsive viewport meta tag - page will look broken on mobile devices'); }
    if (cmsDetected === 'Webflow' || cmsDetected === 'WordPress') {
      // These usually handle mobile styling well
    } else if (!rawHtml.includes('@media') && !rawHtml.includes('tw-') && !rawHtml.includes('sm:') && !rawHtml.includes('md:')) {
      mobileScore -= 30;
      mobileIssues.push('No responsive CSS media queries or Tailwind prefixes detected');
    }
    mobileScore = Math.max(15, mobileScore);

    const accessibilityIssues: string[] = [];
    let accessibilityScore = 100;
    if (imagesWithNoAlt > 0) {
      accessibilityScore -= Math.min(25, imagesWithNoAlt * 3);
      accessibilityIssues.push('Screen readers will skip images missing ALT description parameters');
    }
    if (!language) {
      accessibilityScore -= 15;
      accessibilityIssues.push('No HTML lang attribute defined, screen readers cannot detect spoken language defaults');
    }
    accessibilityScore = Math.max(15, accessibilityScore);

    const performanceIssues: string[] = [];
    let performanceScore = 100;
    const imageCount = $('img').length;
    const scriptCount = $('script[src]').length;
    const stylesheetCount = $('link[rel="stylesheet"]').length;

    if (rawHtmlSize > 300000) {
      performanceScore -= 20;
      performanceIssues.push(`Heavy page weights detected (${Math.round(rawHtmlSize / 1024)}KB), increases mobile load delays`);
    }
    if (imageCount > 30) {
      performanceScore -= 10;
      performanceIssues.push(`High image count (${imageCount}) on homepage without lazy-loading metrics`);
    }
    if (scriptCount > 15) {
      performanceScore -= 10;
      performanceIssues.push(`Excessive external JS scripts loaded (${scriptCount}), blocks critical page rendering`);
    }
    if (stylesheetCount > 5) {
      performanceScore -= 5;
      performanceIssues.push(`Excessive block-render style headers (${stylesheetCount}) loaded on main payload`);
    }
    performanceScore = Math.max(20, performanceScore);

    const brandingIssues: string[] = [];
    let brandingScore = 100;
    const logoKeywords = ['logo', 'brand', 'favicon'];
    let logoFound = false;
    $('img').each((_, el) => {
      const src = $(el).attr('src')?.toLowerCase() || '';
      const id = $(el).attr('id')?.toLowerCase() || '';
      const cls = $(el).attr('class')?.toLowerCase() || '';
      if (logoKeywords.some(kw => src.includes(kw) || id.includes(kw) || cls.includes(kw))) {
        logoFound = true;
      }
    });
    if (!logoFound) {
      brandingScore -= 20;
      brandingIssues.push('No explicit logo element or branding identity found in image properties');
    }
    if (favicons.length === 0) {
      brandingScore -= 15;
      brandingIssues.push('No custom favicon configuration found, defaults browser tab branding');
    }
    brandingScore = Math.max(10, brandingScore);

    const contentIssues: string[] = [];
    let contentScore = 100;
    const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;
    if (wordCount < 150) {
      contentScore -= 40;
      contentIssues.push(`Very sparse content found on the homepage (${wordCount} words) - website lacks descriptive authority`);
    } else if (wordCount > 3000) {
      contentScore -= 10;
      contentIssues.push(`Excessive text blobs (${wordCount} words) on homepage, might degrade user layout clarity`);
    }
    if (!hasServices) {
      contentScore -= 20;
      contentIssues.push('No designated services or core offerings catalog page detected on main page');
    }
    contentScore = Math.max(15, contentScore);

    const securityIssues: string[] = [];
    let securityScore = 100;
    if (!url.startsWith('https://')) {
      securityScore -= 60;
      securityIssues.push('Insecure connection protocol (HTTP) used! Forms and traffic are unencrypted');
    }
    // Check form submission endpoints
    $('form').each((_, el) => {
      const action = $(el).attr('action') || '';
      if (action.startsWith('http://')) {
        securityScore -= 20;
        securityIssues.push('Form submission target is set to an insecure HTTP url, risking data leaks');
      }
    });
    securityScore = Math.max(10, securityScore);

    const trustIssues: string[] = [];
    let trustScore = 100;
    if (!hasTestimonials) {
      trustScore -= 30;
      trustIssues.push('Missing customer social proofs, testimonials, or active reviews');
    }
    const hasAddress = pageText.includes('st.') || pageText.includes('street') || pageText.includes('rd.') || pageText.includes('road') || pageText.includes('ave') || pageText.includes('avenue') || pageText.includes('suite') || pageText.includes('building');
    if (!hasAddress && emailsSet.size === 0 && phonesSet.size === 0) {
      trustScore -= 40;
      trustIssues.push('Complete lack of local business indicators (missing phone, physical location, and contact email)');
    } else if (!hasAddress) {
      trustScore -= 15;
      trustIssues.push('No physical business address or local map references detected, decreasing local authority');
    }
    if (Object.keys(socialLinks).length === 0) {
      trustScore -= 15;
      trustIssues.push('No active social media profiles linked (LinkedIn, Facebook, Instagram), reducing modern trustworthiness');
    }
    trustScore = Math.max(10, trustScore);

    return {
      url,
      success: true,
      rawHtmlSize,
      cleanedHtmlSize,
      metadata: {
        title,
        description,
        keywords,
        ogTitle,
        ogDescription,
        ogImage,
        ogUrl,
        twitterCard,
        canonicalUrl,
        language,
        charset,
        viewport,
        favicons,
        structuredData,
      },
      technologies: {
        cms: cmsDetected,
        frameworks,
        css,
        analytics,
        security,
        techStack,
      },
      structure: {
        hasHeader,
        hasFooter,
        hasHero,
        hasCta,
        ctaCount,
        hasNavigation,
        hasContactForm,
        hasBookingWidget,
        bookingProvider,
        hasPricing,
        hasPortfolio,
        hasTestimonials,
        hasFaq,
        hasBlog,
        hasGallery,
        hasServices,
        emails: Array.from(emailsSet),
        phones: Array.from(phonesSet),
        socialLinks,
      },
      heuristics: {
        seoScore,
        seoIssues,
        uxScore,
        uxIssues,
        mobileScore,
        mobileIssues,
        accessibilityScore,
        accessibilityIssues,
        performanceScore,
        performanceIssues,
        brandingScore,
        brandingIssues,
        contentScore,
        contentIssues,
        securityScore,
        securityIssues,
        trustScore,
        trustIssues,
      },
      cleanedText,
    };
  } catch (error: any) {
    logger.error('Crawler', `Failed to crawl target URL ${url}`, error);
    return {
      url,
      success: false,
      error: error.message || 'Unknown crawl error',
      rawHtmlSize: 0,
      cleanedHtmlSize: 0,
      metadata: {
        title: '',
        description: '',
        keywords: [],
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        ogUrl: null,
        twitterCard: null,
        canonicalUrl: null,
        language: null,
        charset: null,
        viewport: null,
        favicons: [],
        structuredData: [],
      },
      technologies: {
        cms: null,
        frameworks: [],
        css: [],
        analytics: [],
        security: [],
        techStack: [],
      },
      structure: {
        hasHeader: false,
        hasFooter: false,
        hasHero: false,
        hasCta: false,
        ctaCount: 0,
        hasNavigation: false,
        hasContactForm: false,
        hasBookingWidget: false,
        bookingProvider: null,
        hasPricing: false,
        hasPortfolio: false,
        hasTestimonials: false,
        hasFaq: false,
        hasBlog: false,
        hasGallery: false,
        hasServices: false,
        emails: [],
        phones: [],
        socialLinks: {},
      },
      heuristics: {
        seoScore: 50,
        seoIssues: ['Could not audit: Connection timeout or unreachable website host'],
        uxScore: 50,
        uxIssues: ['Could not audit: Reachability check failed'],
        mobileScore: 50,
        mobileIssues: ['Could not audit: Reachability check failed'],
        accessibilityScore: 50,
        accessibilityIssues: ['Could not audit: Reachability check failed'],
        performanceScore: 50,
        performanceIssues: ['Could not audit: Reachability check failed'],
        brandingScore: 50,
        brandingIssues: ['Could not audit: Reachability check failed'],
        contentScore: 50,
        contentIssues: ['Could not audit: Reachability check failed'],
        securityScore: 50,
        securityIssues: ['Could not audit: Reachability check failed'],
        trustScore: 50,
        trustIssues: ['Could not audit: Reachability check failed'],
      },
      cleanedText: '',
    };
  }
}
