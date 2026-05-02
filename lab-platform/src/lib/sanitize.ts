import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize HTML from the rich editor before rendering.
 * Allows safe formatting tags but strips scripts, iframes, and event handlers.
 */
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'hr',
      'img',
      'span', 'div',
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      '*': ['class', 'style'],
    },
    allowedStyles: {
      '*': {
        // Allow only safe CSS
        'color': [/.*/],
        'background-color': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
      },
    },
    // Force external links to open safely
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          ...(attribs.href?.startsWith('http') ? { target: '_blank' } : {}),
        },
      }),
    },
  })
}
