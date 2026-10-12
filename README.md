# Hastakala — Tradition in Every Piece

A static, mobile-friendly storefront for festive essentials: chocolates, diyas, torans, flowers, gift hampers and personalised gifts. Plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `style.css` | All styling and design tokens |
| `script.js` | Settings (`CONFIG`), intro video, catalog, bag, wishlist, forms |
| `hastakala-intro.mp4` | Animated logo intro video (about 4 MB, 10 s) |

Keep all four files in the same folder.

## Run locally

Open `index.html` in a browser. For best results, serve the folder instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repository and upload all four files to the root.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Save. The site goes live at `https://<username>.github.io/<repo>/`.

## Configuration

Edit the `CONFIG` block at the top of `script.js`:

| Setting | What it does |
|---------|--------------|
| `intro.videoUrl` | Intro video path (default `hastakala-intro.mp4`) |
| `intro.oncePerSession` | Play the intro once per browser tab session |
| `intro.maxVideoMs` | Safety cap on intro length |
| `whatsappNumber` | Digits only with country code, e.g. `919876543210`. Enables WhatsApp ordering |
| `contact` | Email, phone, address, hours. Leave `""` to hide a field |
| `social` | Instagram, Facebook, YouTube URLs |
| `emailjs` / `formEndpoint` | Where contact and gift forms are delivered |
| `newsletterEndpoint` | JSON POST URL for newsletter sign-ups |
| `payment.enabled` | Keep `false` until a real payment gateway and backend are connected |

Until these are filled in, forms fall back to WhatsApp (if set) or show setup help. The browser console lists anything still unconfigured.

## Intro video

- The video plays muted, once per session, with a **Skip intro** button.
- If it fails to load or autoplay is blocked, the built-in animated logo plays instead.
- Visitors with reduced-motion enabled skip the intro.
- To replace it, overwrite `hastakala-intro.mp4` (H.264 MP4, 1080p or lower, ideally under 8 MB).
- A "Replay intro" button is in the footer.

## Images

Photos come from Unsplash and are set in the `IMAGES` object in `script.js`. A value is either an Unsplash photo ID or a local path such as `assets/hero.jpg`.

| Slot | Photographer |
|------|--------------|
| Chocolates | Monique Carrati |
| Diyas (hero) | Sonika Agarwal |
| Diyas (banner, category) | Suchandra Roy Chowdhury |
| Torans (marigold garland) | Yoav Farhi |
| Flowers | Sophie Backes |
| Bouquet | Lidia Nemiroff |

Hamper, thali, pooja and wedding images are carried over from the original file. Replace any of them with your own product photos before launch. If an image fails to load, a branded placeholder is shown.

Unsplash photos are free to use under the [Unsplash License](https://unsplash.com/license). Credit is appreciated but not required.

## Products

The 12 products and their prices are demo data in the `CATALOG` section of `script.js`. Replace them with your real items, prices and photos.

## Before launch

- [ ] Add the real WhatsApp number, contact details and social links
- [ ] Connect form delivery (EmailJS or a form endpoint) and the newsletter endpoint
- [ ] Replace demo products and sample photos
- [ ] Have the Privacy Policy and Terms drafts reviewed (they are templates)
- [ ] Connect a payment gateway if you plan to take online payments

## Browser support

Current versions of Chrome, Edge, Safari and Firefox on desktop and mobile.
