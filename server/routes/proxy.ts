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
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        if (!response.ok) {
          return reply.status(response.status).send({ error: 'Failed to fetch target URL' });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          return reply.status(400).send({ error: 'Target URL did not return HTML' });
        }

        let html = await response.text();

        // Inject <base> tag to fix relative assets
        const baseTag = `<base href="${url}">`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${baseTag}`);
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
                // Prevent navigation inside the iframe
                var target = e.target;
                var link = target.closest('a');
                if (link && link.href) {
                  e.preventDefault();
                  e.stopPropagation();
                } else if (target.tagName.toLowerCase() === 'button' || target.closest('button') || target.tagName.toLowerCase() === 'input' && (target.type === 'submit' || target.type === 'button')) {
                  e.preventDefault();
                  e.stopPropagation();
                }

                var selector = getCssSelector(target);
                if (selector) {
                  sendAction('click', selector, '');
                }
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
        // CSP can be tricky, we remove it completely to allow our inline script to run
        reply.removeHeader('Content-Security-Policy');

        return reply.send(html);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Proxy request failed', details: (error as Error).message });
      }
    }
  );
}
