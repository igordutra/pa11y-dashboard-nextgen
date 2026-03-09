import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export default async function proxyRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/proxy',
    {
      schema: {
        querystring: z.object({
          url: z.string().url(),
        }),
      },
    },
    async (request, reply) => {
      const { url } = request.query as { url: string };

      try {
        const response = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        if (!response.ok) {
          return reply.status(response.status).send({ error: 'Failed to fetch target URL' });
        }

        const finalUrl = response.url; // The actual URL after any redirects

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          return reply.status(400).send({ error: 'Target URL did not return HTML' });
        }

        let html = await response.text();

        // Inject <base> tag to fix relative assets based on the final resolved URL
        const baseTag = `<base href="${finalUrl}">`;
        
        // Handle variations of <head> like <head class="..."> using a regex
        const headRegex = /(<head[^>]*>)/i;
        if (headRegex.test(html)) {
          html = html.replace(headRegex, `$1${baseTag}`);
        } else {
          html = `${baseTag}${html}`;
        }

        // Inject recording script
        const recorderScript = `
          <script>
            (function() {
              function getCssSelector(el) {
                if (!(el instanceof Element)) return;
                var path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                  var selector = el.nodeName.toLowerCase();
                  if (el.id) {
                    selector += '#' + el.id;
                    path.unshift(selector);
                    break;
                  } else {
                    var sib = el, nth = 1;
                    while (sib = sib.previousElementSibling) {
                      if (sib.nodeName.toLowerCase() == selector)
                        nth++;
                    }
                    if (nth != 1)
                      selector += ":nth-of-type("+nth+")";
                  }
                  path.unshift(selector);
                  el = el.parentNode;
                }
                return path.join(" > ");
              }

              function sendAction(action, selector, value) {
                window.parent.postMessage({
                  type: 'pa11y_action',
                  action: action,
                  selector: selector,
                  value: value
                }, '*');
              }

              document.addEventListener('click', function(e) {
                var target = e.target;
                var link = target.closest('a');
                
                // Always record the click action
                var selector = getCssSelector(target);
                if (selector) {
                  sendAction('click', selector, '');
                }

                // Handle link navigation
                if (link && link.hasAttribute('href')) {
                  var href = link.getAttribute('href');
                  
                  // Ignore empty links or purely script-driven anchors
                  if (!href || href === '#' || href.startsWith('javascript:')) {
                    // Do not prevent default, let the SPA handle it
                    return; 
                  }

                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Resolve relative URLs based on the proxy target
                  var absoluteUrl = new URL(href, "${finalUrl}").href;

                  // Tell the UI we are navigating
                  sendAction('navigate', '', absoluteUrl);
                  
                  // Update the iframe location to the new proxied URL
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
                } 
                // Note: We no longer preventDefault on buttons. Many modern sites (like BBC's cookie banner)
                // use buttons heavily for local state changes. Preventing default breaks them.
              }, true);

              document.addEventListener('change', function(e) {
                var target = e.target;
                if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'select') {
                  var selector = getCssSelector(target);
                  if (selector) {
                    sendAction('type', selector, target.value);
                  }
                }
              }, true);
            })();
          </script>
        `;

        if (html.includes('</body>')) {
          html = html.replace('</body>', `${recorderScript}</body>`);
        } else {
          html += recorderScript;
        }

        // Forward headers except those that prevent iframe embedding
        const headersToForward = ['content-type', 'cache-control', 'expires', 'last-modified', 'pragma'];
        response.headers.forEach((value, key) => {
          if (headersToForward.includes(key.toLowerCase())) {
            reply.header(key, value);
          }
        });

        // Ensure these headers are removed/set so we can iframe it
        reply.header('X-Frame-Options', 'ALLOWALL');
        
        // Fastify helmet adds strict CSP by default. We MUST override it for the proxy response 
        // to allow the external site's inline scripts/styles and external assets to load.
        reply.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        
        return reply.send(html);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Proxy request failed', details: (error as Error).message });
      }
    }
  );
}
