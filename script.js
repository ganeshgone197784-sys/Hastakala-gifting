/* ---- INTRO VIDEO -------------------------------------------------------
   Option A (local file):  const INTRO_VIDEO_URL = "assets/hastakala-intro.mp4";
   Option B (hosted URL):  const INTRO_VIDEO_URL = "https://example.com/intro.mp4";
   Leave as "YOUR_INTRO_VIDEO_URL" to use the built-in animated logo intro.
   Tip: keep the file under ~8 MB, H.264 MP4, 1080p or lower, for fast loading. */
const INTRO_VIDEO_URL = "hastakala-intro.mp4";  // bundled: keep this file next to index.html

const CONFIG = {
  intro: {
    videoUrl: INTRO_VIDEO_URL,
    oncePerSession: true,   // true = intro plays once per browser tab session
    loadTimeoutMs: 7000,    // if the video has not started by then, use the logo animation
    maxVideoMs: 14000,      // safety cap: never keep visitors waiting longer than this
    fallbackMs: 4800        // length of the built-in logo intro
  },

  /* WhatsApp number: digits only, with country code, no + or spaces.
     Example for India: "919876543210". Leave "" until you have a real number. */
  whatsappNumber: "",

  /* Business contact details shown on the site. Leave "" to hide a field. */
  contact: {
    email: "",      // e.g. "hello@yourdomain.com"
    phone: "",      // e.g. "+91 98765 43210"
    address: "",    // e.g. "Shop 12, Market Road, Your City"
    hours: ""       // e.g. "Mon–Sat, 10 am – 7 pm"
  },

  /* Social links — full URLs. Leave "" until real pages exist. */
  social: {
    instagram: "",  // e.g. "https://instagram.com/hastakala"
    facebook: "",
    youtube: ""
  },

  /* ---- FORM DELIVERY (pick one; all optional) ---------------------------
     A) EmailJS (free tier, no backend): https://www.emailjs.com
        Create a service + template, then paste the three IDs below.
        Template variables used: from_name, reply_to, product, quantity, message
     B) formEndpoint: any form backend that accepts JSON POST (Formspree, Getform, your API).
     If neither is set, the forms fall back to WhatsApp (if configured) or show setup help. */
  emailjs: { serviceId: "", templateId: "", publicKey: "" },
  formEndpoint: "",

  /* Newsletter: POST { email } as JSON to this URL (Mailchimp proxy, Formspree, your API…).
     Leave "" and the form validates but clearly says nothing was saved. */
  newsletterEndpoint: "",

  /* Payment: see startPayment() in the script. Keep false until a real
     gateway (Razorpay, Cashfree, Stripe…) and a backend are connected. */
  payment: { enabled: false },

  currency: "₹"
};

/* Session gate: decides BEFORE first paint whether the intro shows (no flash on repeat visits). */
(function () {
  try {
    var seen = sessionStorage.getItem("hk_intro_seen");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (CONFIG.intro.oncePerSession && seen) return;
    document.documentElement.classList.add("has-intro");
  } catch (e) { document.documentElement.classList.add("has-intro"); }
})();

(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = window.matchMedia('(max-width: 700px)').matches;
  var fmt = function (n) { return CONFIG.currency + Number(n).toLocaleString('en-IN'); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var phoneOk = function (v) { var d = v.replace(/\D/g, ''); return /^[+\d\s()\-]+$/.test(v) && d.length >= 7 && d.length <= 15; };

  /* ---------------------------------------------------------------
     ICONS (Lucide-style inline SVG, no library needed)
     --------------------------------------------------------------- */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>',
    youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3 0 1.4 1 2.500 2.500 2.500Z"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    ring: '<circle cx="12" cy="15" r="6"/><path d="m9 3-2 4h10l-2-4Z"/>'
  };
  var icon = function (n) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; };
  var hydrateIcons = function (root) { $$('[data-icon]', root).forEach(function (el) { if (!el.firstChild) el.outerHTML = icon(el.getAttribute('data-icon')); }); };

  /* ---------------------------------------------------------------
     IMAGES — Unsplash. REPLACE with your own product photos:
     put files in /assets and set e.g.  hero: "assets/hero.jpg"
     (any value starting with "http" or "assets/" is used as-is;
      otherwise it is treated as an Unsplash photo ID.)
     Every image has a graceful gradient + logo fallback if it fails to load.
     --------------------------------------------------------------- */
  var IMG_BASE = 'https://images.unsplash.com/';
  var IMAGES = {
    hero:      'photo-1602305362475-17c5fd62d2e3',  // diyas lit for Diwali (Sonika Agarwal)
    heroArch:  'photo-1602305362475-17c5fd62d2e3',
    banner:    'photo-1635192592106-77a5aacbe1a3',  // circle of diyas (Suchandra Roy Chowdhury)
    chocolate: 'photo-1526081347589-7fa3cb41b4b2',  // assorted chocolates in box (Monique Carrati)
    chocolate2:'photo-1526081347589-7fa3cb41b4b2',
    diya:      'photo-1635192592106-77a5aacbe1a3',  // diyas (Suchandra Roy Chowdhury)
    candles:   'photo-1602305362475-17c5fd62d2e3',  // floating/lit diyas
    toran:     'photo-1705475388142-a2700c4caeb5',  // marigold garlands (Yoav Farhi)
    flowers:   'photo-1560022402-aae014a0f4de',     // flower bouquet (Sophie Backes)
    bouquet:   'photo-1681585195517-516a388719a3',  // colourful bouquet (Lidia Nemiroff)
    hamper:    'photo-1549465220-1a8b9238cd48',     // gift box / hamper
    gift2:     'photo-1513201099705-a9746e1e201f',  // wrapped gifts
    gift3:     'photo-1607344645866-009c320b63e0',
    thali:     'photo-1567337710282-00832b415979',  // festive thali
    pooja:     'photo-1600093463592-8e36ae95ef56',  // pooja items
    wedding:   'photo-1519741497674-611481863552',  // wedding decor
    wedding2:  'photo-1465495976277-4387d4b0b4c6'
  };
  function photoUrl(key, w) {
    var v = IMAGES[key] || key;
    if (/^(https?:|assets\/|\.\/|\/)/.test(v)) return v;
    return IMG_BASE + v + '?auto=format&fit=crop&w=' + w + '&q=72';
  }
  function pic(key, alt, o) {
    o = o || {};
    var w = o.w || 600, sizes = o.sizes || '100vw';
    var local = /^(https?:|assets\/|\.\/|\/)/.test(IMAGES[key] || key);
    var srcset = local ? '' : ' srcset="' + photoUrl(key, Math.round(w / 2)) + ' ' + Math.round(w / 2) + 'w, ' + photoUrl(key, w) + ' ' + w + 'w, ' + photoUrl(key, w * 2) + ' ' + (w * 2) + 'w" sizes="' + sizes + '"';
    return '<img src="' + photoUrl(key, w) + '"' + srcset + ' alt="' + alt + '" ' + (o.eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"') + ' style="object-position:' + (o.pos || 'center') + '">';
  }
  /* If an image fails, show the branded gradient + logo placeholder instead */
  function markBroken(img) { var p = img.closest('.ph'); if (p) p.classList.add('is-broken'); img.style.visibility = 'hidden'; }
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') markBroken(e.target); }, true);
  window.addEventListener('load', function () { $$('img').forEach(function (i) { if (i.complete && i.naturalWidth === 0) markBroken(i); }); });

  /* ---------------------------------------------------------------
     CATALOG — DEMO DATA (replace with your real products & prices)
     --------------------------------------------------------------- */
  var CATEGORIES = [
    { id: 'chocolates', name: 'Chocolates & Sweet Treats', desc: 'Gift boxes and festive sweets.', img: 'chocolate', alt: 'Assorted chocolates arranged for gifting' },
    { id: 'diyas', name: 'Diyas & Candle Holders', desc: 'Terracotta, floating and scented lights.', img: 'diya', alt: 'Glowing diyas lit for a festival' },
    { id: 'torans', name: 'Torans & Door Hangings', desc: 'Marigold-inspired welcomes for your doorway.', img: 'toran', alt: 'Marigold garland hanging at a doorway' },
    { id: 'flowers', name: 'Fresh & Artificial Flowers', desc: 'Bouquets and blooms that last.', img: 'flowers', alt: 'Colourful flower bouquet' },
    { id: 'hampers', name: 'Gift Hampers', desc: 'Curated boxes, ready to give.', img: 'hamper', alt: 'Beautifully wrapped gift hamper' },
    { id: 'thalis', name: 'Festive Thalis', desc: 'Decorated thalis for aarti and gifting.', img: 'thali', alt: 'Decorated festive thali' },
    { id: 'pooja', name: 'Pooja Essentials', desc: 'Everyday and festival pooja needs.', img: 'pooja', alt: 'Pooja essentials with flowers and incense' },
    { id: 'wedding', name: 'Wedding & Return Gifts', desc: 'Favours and décor for big days.', img: 'wedding', alt: 'Elegant wedding decor' },
    { id: 'personalized', name: 'Personalized Gifts', desc: 'Made around a name and a story.', img: 'gift2', alt: 'Wrapped personalised gifts' },
    { id: 'more', name: 'More Handcrafted Treasures', desc: 'Keepsakes and special finds.', img: 'gift3', alt: 'Handcrafted keepsake gift box' }
  ];
  var catName = function (id) { var c = CATEGORIES.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; };

  var PRODUCTS = [
    { id: 'p1',  name: 'Premium Chocolate Gift Box',     cat: 'chocolates',   price: 899,  was: 1199, rating: 4.8, img: 'chocolate',  occ: ['diwali','birthday','anniversary','corporate','festivals'], blurb: 'Assorted chocolates in a keepsake gift box.' },
    { id: 'p2',  name: 'Handcrafted Terracotta Diya Set', cat: 'diyas',        price: 349,  was: 449,  rating: 4.7, img: 'diya',       occ: ['diwali','ganesh','housewarming','festivals'], blurb: 'Set of 12 terracotta diyas for festive evenings and pooja.' },
    { id: 'p3',  name: 'Marigold Floral Toran',          cat: 'torans',       price: 549,  was: 0,    rating: 4.9, img: 'toran',      occ: ['diwali','ganesh','housewarming','wedding','festivals'], blurb: 'Marigold-inspired door hanging with beaded detail.' },
    { id: 'p4',  name: 'Festive Flower Bouquet',         cat: 'flowers',      price: 799,  was: 999,  rating: 4.6, img: 'bouquet',    occ: ['birthday','anniversary','wedding'], blurb: 'Seasonal blooms arranged into a festive bouquet.' },
    { id: 'p5',  name: 'Luxury Celebration Hamper',      cat: 'hampers',      price: 2499, was: 2999, rating: 4.9, img: 'hamper',     occ: ['diwali','corporate','anniversary','festivals'], blurb: 'Chocolates, sweets, diyas and keepsakes in one hamper.' },
    { id: 'p6',  name: 'Traditional Pooja Thali',        cat: 'thalis',       price: 1299, was: 0,    rating: 4.8, img: 'thali',      occ: ['diwali','ganesh','housewarming','festivals'], blurb: 'Decorative pooja thali with diya, small bowls and accents.' },
    { id: 'p7',  name: 'Decorative Floating Diyas',      cat: 'diyas',        price: 449,  was: 549,  rating: 4.7, img: 'candles',    occ: ['diwali','wedding','housewarming','anniversary'], blurb: 'Floating diyas for urli bowls and festive water décor.' },
    { id: 'p8',  name: 'Personalized Gift Hamper',       cat: 'personalized', price: 1799, was: 0,    rating: 4.8, img: 'gift2',      occ: ['birthday','anniversary','corporate','wedding'], blurb: 'Built around a name, a theme and your budget.' },
    { id: 'p9',  name: 'Wedding Return Gift Set',        cat: 'wedding',      price: 999,  was: 0,    rating: 4.6, img: 'wedding',    occ: ['wedding','corporate','birthday'], blurb: 'Compact, beautifully packed favours for guests (set of 6).' },
    { id: 'p10', name: 'Handmade Festive Candle Set',    cat: 'diyas',        price: 599,  was: 749,  rating: 4.7, img: 'candles',    occ: ['diwali','housewarming','anniversary','festivals'], blurb: 'Scented candle set in festive colours.' },
    { id: 'p11', name: 'Pooja Essentials Kit',           cat: 'pooja',        price: 499,  was: 0,    rating: 4.8, img: 'pooja',      occ: ['ganesh','diwali','housewarming','festivals'], blurb: 'Incense, camphor, roli and other daily pooja basics.' },
    { id: 'p12', name: 'Handcrafted Keepsake Box',       cat: 'more',         price: 699,  was: 0,    rating: 4.7, img: 'gift3',      occ: ['birthday','anniversary','corporate','wedding'], blurb: 'A keepsake box with space for small gifts and a note.' }
  ];
  var byId = function (id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; };

  var OCCASIONS = [
    { id: 'diwali', name: 'Diwali', icon: 'flame' }, { id: 'ganesh', name: 'Ganesh Chaturthi', icon: 'sparkles' },
    { id: 'wedding', name: 'Weddings', icon: 'ring' }, { id: 'birthday', name: 'Birthdays', icon: 'gift' },
    { id: 'anniversary', name: 'Anniversaries', icon: 'heart' }, { id: 'housewarming', name: 'Housewarming', icon: 'home' },
    { id: 'festivals', name: 'Festivals', icon: 'calendar' }, { id: 'corporate', name: 'Corporate Gifting', icon: 'briefcase' }
  ];
  var occName = function (id) { var o = OCCASIONS.filter(function (x) { return x.id === id; })[0]; return o ? o.name : ''; };

  /* SAMPLE REVIEWS — replace these objects with real customer reviews.
     Set "sample: false" (or remove the field) to hide the Sample label on a review. */
  var SAMPLE_REVIEWS = [
    { name: 'Sample customer', place: 'City, State', stars: 5, sample: true, text: 'The packaging felt like opening a gift in itself. Every little detail looked considered.' },
    { name: 'Sample customer', place: 'City, State', stars: 5, sample: true, text: 'Our doorway looked wonderful for the festival. Guests kept asking where the toran was from.' },
    { name: 'Sample customer', place: 'City, State', stars: 4, sample: true, text: 'A thoughtful hamper that was easy to personalise, and just right for our family gathering.' }
  ];

  /* ---------------------------------------------------------------
     STATE
     --------------------------------------------------------------- */
  var state = { q: '', cat: 'all', occ: '', sort: 'featured' };
  var cart = store.get('hk_cart', {});
  var wish = store.get('hk_wish', []);
  Object.keys(cart).forEach(function (id) { if (!byId(id) || !(cart[id] > 0)) delete cart[id]; });
  wish = wish.filter(function (id) { return !!byId(id); });

  /* ---------------------------------------------------------------
     UI HELPERS
     --------------------------------------------------------------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2800);
  }
  function syncModalLock() { document.documentElement.classList.toggle('modal-open', !!$('dialog[open]')); }
  function openDlg(d) { if (typeof d === 'string') d = document.getElementById(d); if (!d) return; if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } syncModalLock(); }
  function closeDlg(d) { if (d && d.open) d.close(); syncModalLock(); }
  $$('dialog').forEach(function (d) {
    d.addEventListener('close', syncModalLock);
    d.addEventListener('click', function (e) { if (e.target === d) closeDlg(d); }); // backdrop click
  });
  function showStatus(el, kind, html) { el.className = 'status ' + kind; el.innerHTML = html; el.hidden = false; }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } document.body.removeChild(t);
    });
  }
  function particles(el, n) {
    if (!el || reduceMotion) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'), size = 3 + Math.random() * 7;
      s.className = 'dot';
      s.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;--dx:' + ((Math.random() - .5) * 90).toFixed(0) + 'px;--dur:' + (7 + Math.random() * 9).toFixed(1) + 's;--dl:-' + (Math.random() * 12).toFixed(1) + 's';
      frag.appendChild(s);
    }
    el.appendChild(frag);
  }

  /* ---------------------------------------------------------------
     INTRO (your video → graceful fallback → skip → session memory)
     --------------------------------------------------------------- */
  var intro = $('#intro'), introDone = false, introTimers = [], introVideo = null;
  function clearIntroTimers() { introTimers.forEach(clearTimeout); introTimers = []; }
  function finishIntro() {
    if (introDone) return; introDone = true; clearIntroTimers();
    try { sessionStorage.setItem('hk_intro_seen', '1'); } catch (e) {}
    intro.classList.add('is-leaving');
    if (introVideo) { try { introVideo.pause(); } catch (e) {} }
    document.documentElement.classList.remove('has-intro'); // un-pause hero entrance + unlock scroll
    // keep overlay visible while the iris closes, then remove
    document.documentElement.classList.add('has-intro-closing');
    intro.style.display = 'block';
    setTimeout(function () {
      intro.style.display = 'none'; intro.classList.remove('is-leaving', 'play', 'has-video');
      if (introVideo) { introVideo.removeAttribute('src'); introVideo.load(); introVideo.remove(); introVideo = null; }
      document.documentElement.classList.remove('has-intro-closing');
    }, reduceMotion ? 0 : 1150);
    var skip = $('#introSkip'); if (skip && document.activeElement === skip) skip.blur();
    var m = $('#heroTitle'); if (m) { m.setAttribute('tabindex', '-1'); }
  }
  function startFallbackIntro() {
    if (introDone) return;
    if (introVideo) { try { introVideo.pause(); } catch (e) {} introVideo.remove(); introVideo = null; }
    intro.classList.remove('has-video'); intro.classList.add('play');
    clearIntroTimers(); introTimers.push(setTimeout(finishIntro, CONFIG.intro.fallbackMs));
  }
  function runIntro() {
    introDone = false; clearIntroTimers();
    intro.style.display = ''; intro.classList.remove('is-leaving', 'play', 'has-video');
    document.documentElement.classList.add('has-intro');
    particles($('#introParticles'), isSmall ? 14 : 26);
    var skip = $('#introSkip'); if (skip) skip.focus({ preventScroll: true });
    var url = (CONFIG.intro.videoUrl || '').trim();
    var usable = url && !/^YOUR_/i.test(url);
    if (!usable) { startFallbackIntro(); return; }
    var started = false;
    introVideo = document.createElement('video');
    introVideo.muted = true; introVideo.defaultMuted = true; introVideo.autoplay = true; introVideo.playsInline = true;
    introVideo.setAttribute('muted', ''); introVideo.setAttribute('playsinline', ''); introVideo.setAttribute('webkit-playsinline', '');
    introVideo.preload = 'auto'; introVideo.setAttribute('aria-hidden', 'true');
    introVideo.addEventListener('playing', function () { started = true; intro.classList.add('has-video'); });
    introVideo.addEventListener('ended', finishIntro);
    introVideo.addEventListener('error', function () { if (!started) startFallbackIntro(); else finishIntro(); });
    introVideo.src = url;
    intro.insertBefore(introVideo, intro.firstChild);
    introTimers.push(setTimeout(function () { if (!started) startFallbackIntro(); }, CONFIG.intro.loadTimeoutMs));
    introTimers.push(setTimeout(finishIntro, CONFIG.intro.maxVideoMs));
    var p = introVideo.play();
    if (p && p.catch) p.catch(function () { if (!started) startFallbackIntro(); }); // autoplay blocked
  }
  $('#introSkip').addEventListener('click', finishIntro);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !introDone && document.documentElement.classList.contains('has-intro')) finishIntro(); });
  $('#replayIntro').addEventListener('click', function () { window.scrollTo(0, 0); runIntro(); });
  if (document.documentElement.classList.contains('has-intro')) runIntro(); else { intro.style.display = 'none'; }

  /* ---------------------------------------------------------------
     STATIC RENDERING
     --------------------------------------------------------------- */
  hydrateIcons(document);
  $('#year').textContent = new Date().getFullYear();
  $('#heroBg').innerHTML = pic('hero', '', { w: 1400, sizes: '100vw', eager: true, pos: 'center' });
  $('#archImg').innerHTML = pic('heroArch', 'Glowing diyas lit for a festive celebration (sample photo)', { w: 700, sizes: '(max-width:899px) 78vw, 400px', eager: true, pos: '50% 60%' });
  $('#bannerImg').innerHTML = pic('banner', 'Candles and warm festive lights (sample photo)', { w: 1600, sizes: '100vw', pos: 'center' });
  $('#collage').innerHTML =
    '<div class="a ph">' + pic('gift2', 'Wrapped gifts with ribbon (sample photo)', { w: 520, sizes: '(max-width:899px) 44vw, 250px' }) + '</div>' +
    '<div class="b ph">' + pic('hamper', 'Gift hamper box (sample photo)', { w: 520, sizes: '(max-width:899px) 44vw, 250px' }) + '</div>';
  $('#storyCollage').innerHTML =
    '<div class="a ph">' + pic('flowers', 'Fresh flowers in warm light (sample photo)', { w: 520, sizes: '(max-width:899px) 44vw, 250px' }) + '</div>' +
    '<div class="b ph">' + pic('diya', 'A row of lit diyas (sample photo)', { w: 520, sizes: '(max-width:899px) 44vw, 250px' }) + '</div>';

  $('#catGrid').innerHTML = CATEGORIES.map(function (c, i) {
    return '<button class="cat reveal" type="button" data-cat="' + c.id + '" style="--d:' + ((i % 5) * 70) + 'ms" aria-label="Shop ' + c.name + '">' +
      '<span class="cat-img ph">' + pic(c.img, c.alt, { w: 480, sizes: '(max-width:639px) 46vw, (max-width:1099px) 30vw, 19vw' }) + '</span>' +
      '<span class="cat-name">' + c.name + '</span><span class="cat-desc">' + c.desc + '</span></button>';
  }).join('');
  $('#catToggle').addEventListener('click', function () {
    var g = $('#catGrid'), open = g.classList.toggle('is-open');
    this.textContent = open ? 'Show Fewer Categories' : 'View All Categories';
    this.setAttribute('aria-expanded', String(open)); observeReveals(g);
  });

  $('#occGrid').innerHTML = OCCASIONS.map(function (o, i) {
    var n = PRODUCTS.filter(function (p) { return p.occ.indexOf(o.id) > -1; }).length;
    return '<button class="occ-card reveal" type="button" data-occ="' + o.id + '" style="--d:' + ((i % 4) * 70) + 'ms"><span class="occ-ico">' + icon(o.icon) + '</span><h3>' + o.name + '</h3><span>' + n + ' sample pieces</span></button>';
  }).join('');

  $('#reviewList').innerHTML = SAMPLE_REVIEWS.map(function (r, i) {
    var stars = ''; for (var s = 0; s < r.stars; s++) stars += icon('star');
    return '<figure class="review reveal" style="--d:' + (i * 90) + 'ms;margin:0"><div class="stars" role="img" aria-label="' + r.stars + ' out of 5 stars">' + stars + '</div><blockquote>“' + r.text + '”</blockquote><figcaption class="who"><b>' + r.name + '</b>' + (r.sample ? '<span class="pill">Sample</span>' : '') + '<br>' + r.place + '</figcaption></figure>';
  }).join('');

  $('#footCats').innerHTML = CATEGORIES.slice(0, 6).map(function (c) { return '<li><button type="button" data-cat="' + c.id + '">' + c.name + '</button></li>'; }).join('');
  $('#cProduct').innerHTML = '<option value="">Choose a product</option>' + PRODUCTS.map(function (p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('') + '<option value="custom">Something custom / not listed</option>';
  $('#gOcc').innerHTML += OCCASIONS.map(function (o) { return '<option>' + o.name + '</option>'; }).join('') + '<option>Other</option>';
  $('#gPrefs').innerHTML = CATEGORIES.slice(0, 9).map(function (c, i) { return '<label><input type="checkbox" name="prefs" value="' + c.name + '"> ' + c.name + '</label>'; }).join('');

  /* Contact + social blocks (driven by CONFIG) */
  function contactList(dark) {
    var c = CONFIG.contact, rows = [];
    function row(ico, label, val, href) {
      rows.push('<li><div class="why-ico">' + icon(ico) + '</div><div><b>' + label + '</b>' + (val ? (href ? '<a href="' + href + '">' + val + '</a>' : '<span class="v">' + val + '</span>') : '<span class="v muted">Details coming soon</span>') + '</div></li>');
    }
    row('mail', 'Email', c.email, c.email ? 'mailto:' + c.email : '');
    row('phone', 'Phone', c.phone, c.phone ? 'tel:' + c.phone.replace(/[^\d+]/g, '') : '');
    if (c.address) row('pin', 'Visit us', c.address, '');
    if (c.hours) row('clock', 'Hours', c.hours, '');
    return rows.join('');
  }
  $('#contactInfo').innerHTML = contactList();
  $('#footContact').innerHTML = contactList();
  function socialLinks() {
    var s = CONFIG.social, out = '';
    [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube']].forEach(function (x) {
      var url = s[x[0]];
      out += '<a href="' + (url || '#contact') + '" aria-label="Hastakala on ' + x[1] + '" data-social="' + x[0] + '"' + (url ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + icon(x[0]) + '</a>';
    });
    if (waReady()) out += '<a href="' + waLink('Hello Hastakala!') + '" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">' + icon('chat') + '</a>';
    return out;
  }
  function waReady() { return /^\d{8,15}$/.test(String(CONFIG.whatsappNumber || '').replace(/\D/g, '')) && String(CONFIG.whatsappNumber).replace(/\D/g, '').length > 0; }
  function waLink(text) { return 'https://wa.me/' + String(CONFIG.whatsappNumber).replace(/\D/g, '') + '?text=' + encodeURIComponent(text); }
  $('#contactSocials').innerHTML = socialLinks();
  $('#footSocials').innerHTML = socialLinks();
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-social]');
    if (a && !CONFIG.social[a.getAttribute('data-social')]) { e.preventDefault(); toast('Add this link in CONFIG.social.' + a.getAttribute('data-social') + ' to activate it.'); }
  });

  /* ---------------------------------------------------------------
     PRODUCTS: filter, search, sort, render
     --------------------------------------------------------------- */
  function renderChips() {
    var list = [{ id: 'all', name: 'All' }].concat(CATEGORIES);
    $('#chips').innerHTML = list.map(function (c) { return '<button class="chip" type="button" data-chip="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + c.name + '</button>'; }).join('');
  }
  function visibleProducts() {
    var terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var list = PRODUCTS.filter(function (p) {
      if (state.cat !== 'all' && p.cat !== state.cat) return false;
      if (state.occ && p.occ.indexOf(state.occ) < 0) return false;
      if (terms.length) { var hay = (p.name + ' ' + catName(p.cat) + ' ' + p.blurb).toLowerCase(); return terms.every(function (t) { return hay.indexOf(t) > -1; }); }
      return true;
    });
    if (state.sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
    else if (state.sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
    return list;
  }
  function productCard(p, i) {
    var disc = p.was ? Math.round((1 - p.price / p.was) * 100) : 0, inWish = wish.indexOf(p.id) > -1;
    return '<article class="pc reveal" style="--d:' + ((i % 4) * 70) + 'ms">' +
      '<div class="pc-img ph">' + (disc ? '<span class="pc-disc">' + disc + '% off</span>' : '') +
      '<button class="wish" type="button" data-wish="' + p.id + '" aria-pressed="' + inWish + '" aria-label="' + (inWish ? 'Remove ' : 'Add ') + p.name + (inWish ? ' from' : ' to') + ' wishlist">' + icon('heart') + '</button>' +
      pic(p.img, p.name + ' (sample photo)', { w: 520, sizes: '(max-width:639px) 46vw, (max-width:999px) 31vw, 23vw' }) + '</div>' +
      '<div class="pc-body"><span class="pc-cat">' + catName(p.cat) + '</span><h3 class="pc-name">' + p.name + '</h3>' +
      '<div class="pc-rate">' + icon('star') + p.rating.toFixed(1) + ' <em>sample rating</em></div>' +
      '<div class="pc-price"><b>' + fmt(p.price) + '</b>' + (p.was ? '<s aria-label="Original price ' + fmt(p.was) + '">' + fmt(p.was) + '</s>' : '') + '</div>' +
      '<button class="btn btn-dark" type="button" data-add="' + p.id + '">' + icon('bag') + ' Add to bag</button></div></article>';
  }
  function renderProducts() {
    var list = visibleProducts(), grid = $('#pgrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty">' + icon('search') + '<h3>Nothing matches yet</h3><p>We couldn\'t find a piece for your search. Clear the filters, or tell us what you\'re looking for and we\'ll help.</p><div class="btn-row" style="justify-content:center"><button class="btn btn-dark" type="button" data-clear>Clear filters</button><button class="btn btn-line" type="button" data-open="giftDialog">Ask for something custom</button></div></div>';
    } else grid.innerHTML = list.map(productCard).join('');
    $('#resultInfo').textContent = 'Showing ' + list.length + ' of ' + PRODUCTS.length + ' sample products';
    var tags = [];
    if (state.occ) tags.push('<span class="tag">Occasion: ' + occName(state.occ) + '<button type="button" data-rm="occ" aria-label="Remove occasion filter">' + icon('x') + '</button></span>');
    if (state.q.trim()) tags.push('<span class="tag">Search: ' + state.q.trim().replace(/</g, '&lt;') + '<button type="button" data-rm="q" aria-label="Remove search">' + icon('x') + '</button></span>');
    var any = state.cat !== 'all' || state.occ || state.q.trim() || state.sort !== 'featured';
    var af = $('#activeFilters');
    af.innerHTML = tags.join('') + (any ? '<button class="link-btn" type="button" data-clear>Clear filters</button>' : '');
    af.hidden = !any;
    $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-chip') === state.cat)); });
    observeReveals(grid);
  }
  function setFilter(patch, scroll) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    $('#q').value = state.q; $('#sort').value = state.sort;
    renderProducts();
    if (scroll) { var s = $('#shop'); s.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
  }
  var searchT;
  $('#q').addEventListener('input', function () { var v = this.value; clearTimeout(searchT); searchT = setTimeout(function () { state.q = v; renderProducts(); }, 160); });
  $('#sort').addEventListener('change', function () { state.sort = this.value; renderProducts(); });
  function focusSearch() { setFilter({}, true); setTimeout(function () { $('#q').focus({ preventScroll: true }); }, reduceMotion ? 0 : 500); }
  $('#btnSearch').addEventListener('click', focusSearch);

  /* ---------------------------------------------------------------
     CART + WISHLIST
     --------------------------------------------------------------- */
  function cartLines() { return Object.keys(cart).map(function (id) { return { p: byId(id), qty: cart[id] }; }); }
  function subtotal() { return cartLines().reduce(function (s, l) { return s + l.p.price * l.qty; }, 0); }
  function cartCount() { return cartLines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function saveCart() { store.set('hk_cart', cart); renderCart(); }
  function saveWish() { store.set('hk_wish', wish); renderWish(); }
  function updateBadges(which) {
    var c = cartCount(), w = wish.length;
    $('#cartCount').textContent = c; $('#cartCount').setAttribute('data-n', c); $('#btnCart').setAttribute('aria-label', 'Shopping bag, ' + c + (c === 1 ? ' item' : ' items'));
    $('#wishCount').textContent = w; $('#wishCount').setAttribute('data-n', w); $('#btnWish').setAttribute('aria-label', 'Wishlist, ' + w + (w === 1 ? ' item' : ' items'));
    if (which === 'cart') bump($('#cartCount')); if (which === 'wish') bump($('#wishCount'));
  }
  function addToCart(id, qty) { cart[id] = Math.min(99, (cart[id] || 0) + (qty || 1)); saveCart(); updateBadges('cart'); toast('Added to your bag'); }
  function setQty(id, n) { if (n < 1) delete cart[id]; else cart[id] = Math.min(99, n); saveCart(); updateBadges(); }
  function lineHtml(p, ctrl) {
    return '<div class="line-item"><div class="ph">' + pic(p.img, p.name, { w: 160, sizes: '76px' }) + '</div><div><h3>' + p.name + '</h3><div class="meta">' + fmt(p.price) + (ctrl.meta || '') + '</div>' + ctrl.html + '</div></div>';
  }
  function emptyArt() {
    return '<svg viewBox="0 0 120 90" aria-hidden="true"><defs><linearGradient id="eb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8C98A"/><stop offset="1" stop-color="#9E7332"/></linearGradient></defs><path fill="#F6D58E" d="M60 8C68 23 72 31 72 40C72 48 66 53 60 53C54 53 48 48 48 40C48 31 52 23 60 8Z"/><path fill="url(#eb)" d="M8 54Q60 106 112 54Q60 64 8 54Z"/><ellipse cx="60" cy="54" rx="52" ry="5" fill="#C99A4A"/></svg>';
  }
  function renderCart() {
    var lines = cartLines(), body = $('#cartBody'), foot = $('#cartFoot');
    if (!lines.length) {
      body.innerHTML = '<div class="cart-empty">' + emptyArt() + '<h3>Your bag is empty</h3><p>Add a few festive favourites and they\'ll wait for you here.</p><button class="btn btn-dark" type="button" data-close data-scroll="#shop">Start shopping</button></div>';
      foot.hidden = true;
    } else {
      body.innerHTML = lines.map(function (l) {
        return lineHtml(l.p, { meta: ' each', html: '<div class="line-ctrl"><div class="qty" role="group" aria-label="Quantity for ' + l.p.name + '"><button type="button" data-qty="-1" data-id="' + l.p.id + '" aria-label="Decrease quantity">' + icon('minus') + '</button><output aria-live="polite">' + l.qty + '</output><button type="button" data-qty="1" data-id="' + l.p.id + '" aria-label="Increase quantity">' + icon('plus') + '</button></div><b>' + fmt(l.p.price * l.qty) + '</b><button class="rm" type="button" data-remove="' + l.p.id + '" aria-label="Remove ' + l.p.name + ' from bag">' + icon('trash') + ' Remove</button></div>' });
      }).join('');
      var sub = subtotal();
      foot.hidden = false;
      foot.innerHTML = '<div class="sum-row"><span>Subtotal (' + cartCount() + ' items)</span><span>' + fmt(sub) + '</span></div><div class="sum-row"><span>Delivery</span><span>Confirmed at order</span></div><div class="sum-row total"><span>Estimated total</span><span>' + fmt(sub) + '</span></div><p class="sum-note">Sample prices. Delivery and final totals are confirmed with you before any payment.</p><div class="stack"><button class="btn btn-gold" type="button" id="btnCheckout">Review order</button><button class="btn btn-line btn-sm" type="button" id="btnClear">Clear bag</button></div>';
    }
    updateBadges();
  }
  function renderWish() {
    var body = $('#wishBody');
    if (!wish.length) { body.innerHTML = '<div class="cart-empty">' + emptyArt() + '<h3>No favourites yet</h3><p>Tap the heart on any product to save it here.</p><button class="btn btn-dark" type="button" data-close data-scroll="#shop">Browse products</button></div>'; }
    else body.innerHTML = wish.map(function (id) { var p = byId(id); return lineHtml(p, { html: '<div class="line-ctrl"><button class="btn btn-dark btn-sm" type="button" data-add="' + p.id + '">' + icon('bag') + ' Add to bag</button><button class="rm" type="button" data-wish="' + p.id + '" aria-label="Remove ' + p.name + ' from wishlist">' + icon('trash') + ' Remove</button></div>' }); }).join('');
    updateBadges();
    $$('.wish').forEach(function (b) { var on = wish.indexOf(b.getAttribute('data-wish')) > -1; b.setAttribute('aria-pressed', String(on)); });
  }
  function toggleWish(id) {
    var i = wish.indexOf(id);
    if (i > -1) { wish.splice(i, 1); toast('Removed from wishlist'); } else { wish.push(id); toast('Saved to wishlist'); }
    store.set('hk_wish', wish); renderWish(); updateBadges('wish');
  }
  $('#btnCart').addEventListener('click', function () { renderCart(); openDlg('cartDrawer'); });
  $('#btnWish').addEventListener('click', function () { renderWish(); openDlg('wishDrawer'); });

  /* ---------------------------------------------------------------
     CHECKOUT (DEMO) — no real payment, no fake order confirmation
     --------------------------------------------------------------- */
  function orderText() {
    var lines = cartLines().map(function (l) { return '- ' + l.qty + ' x ' + l.p.name + ' (' + fmt(l.p.price) + ' each)'; });
    return 'Hello Hastakala, I would like to place an order:\n' + lines.join('\n') + '\nEstimated subtotal: ' + fmt(subtotal()) + '\nPlease confirm availability, delivery and payment options.';
  }
  function openCheckout() {
    if (!cartLines().length) { toast('Your bag is empty'); return; }
    var rows = cartLines().map(function (l) { return '<div class="sum-row"><span>' + l.qty + ' × ' + l.p.name + '</span><span>' + fmt(l.p.price * l.qty) + '</span></div>'; }).join('');
    $('#coBody').innerHTML = rows + '<div class="sum-row total"><span>Estimated subtotal</span><span>' + fmt(subtotal()) + '</span></div>' +
      '<p class="sum-note">This is a demo checkout. No payment is taken and no order is placed from this page.</p>' +
      '<div class="status" id="coStatus" role="status" hidden></div>' +
      '<div class="stack" style="margin-top:12px"><button class="btn btn-gold" type="button" id="coWhats">' + icon('chat') + ' Send order on WhatsApp</button><button class="btn btn-dark" type="button" id="coPay">Pay online</button><button class="btn btn-line" type="button" id="coCopy">' + icon('copy') + ' Copy order summary</button></div>';
    hydrateIcons($('#coBody'));
    closeDlg($('#cartDrawer')); openDlg('checkoutDialog');
  }
  /* ===== PAYMENT INTEGRATION POINT =====
     To accept real payments you need a gateway account (Razorpay, Cashfree, PayU, Stripe…)
     AND a small backend that creates the order and verifies the payment signature.
     Typical flow:
       1) POST order (cart lines) to YOUR backend -> returns a gateway order id
       2) Open the gateway's checkout with that id (gateway SDK)
       3) Backend verifies the payment webhook, then marks the order paid
     Never put secret keys in this file. Set CONFIG.payment.enabled = true after wiring this up. */
  function startPayment(order) {
    var st = $('#coStatus');
    if (!CONFIG.payment.enabled) {
      showStatus(st, 'warn', '<b>Online payment isn\'t connected yet.</b> To go live, connect a payment gateway and a backend (see <code>startPayment()</code> in the script). For now you can send this order on WhatsApp or copy the summary.');
      return;
    }
    showStatus(st, 'bad', 'Payment is enabled in CONFIG but <code>startPayment()</code> has no gateway code yet. Add it before launch.');
  }

  /* ---------------------------------------------------------------
     FORMS: validation + delivery
     --------------------------------------------------------------- */
  function validate(form) {
    var ok = true;
    $$('[data-req]', form).forEach(function (el) {
      var f = el.closest('.field'), type = el.getAttribute('data-req'), v = el.value.trim(), msg = '';
      if (type === 'contact') { if (!(EMAIL_RE.test(v) || phoneOk(v))) msg = v ? 'Enter a valid email address or phone number.' : 'Enter your email or phone number.'; }
      else if (type === 'qty') { var n = Number(v); if (!/^\d+$/.test(v) || n < 1 || n > 999) msg = 'Enter a quantity between 1 and 999.'; }
      else if (!v) msg = el.tagName === 'SELECT' ? 'Please choose an option.' : 'This field is required.';
      f.classList.toggle('invalid', !!msg);
      var er = $('.err', f); if (er) er.textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && ok) { el.focus(); ok = false; }
    });
    return ok;
  }
  function inquiryText(p) {
    var l = ['Hello Hastakala,', ''];
    Object.keys(p).forEach(function (k) { if (p[k]) l.push(k + ': ' + p[k]); });
    return l.join('\n');
  }
  function emailReady() { var e = CONFIG.emailjs; return !!(e.serviceId && e.templateId && e.publicKey); }
  function deliver(payload, via, statusEl) {
    var text = inquiryText(payload);
    if (via === 'whatsapp') {
      if (waReady()) { window.open(waLink(text), '_blank', 'noopener'); showStatus(statusEl, 'ok', 'Opening WhatsApp with your message ready. Press send there to reach us.'); }
      else setupHelp(statusEl, text, 'WhatsApp isn\'t set up yet. Add the business number to <code>CONFIG.whatsappNumber</code> (digits with country code).');
      return;
    }
    if (emailReady() || CONFIG.formEndpoint) {
      showStatus(statusEl, 'warn', 'Sending…');
      var req = emailReady()
        ? fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: CONFIG.emailjs.serviceId, template_id: CONFIG.emailjs.templateId, user_id: CONFIG.emailjs.publicKey, template_params: { from_name: payload.Name || '', reply_to: payload.Contact || '', product: payload.Product || payload.Occasion || '', quantity: payload.Quantity || '', message: text } }) })
        : fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      req.then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); showStatus(statusEl, 'ok', 'Thank you! Your inquiry has been sent. We\'ll get back to you soon.'); })
         .catch(function () { showStatus(statusEl, 'bad', 'We couldn\'t send that just now. Please try again' + (waReady() ? ' or use the WhatsApp button.' : ' in a moment.')); });
      return;
    }
    if (waReady()) { window.open(waLink(text), '_blank', 'noopener'); showStatus(statusEl, 'ok', 'Opening WhatsApp with your inquiry ready. Press send there to reach us.'); return; }
    setupHelp(statusEl, text, 'Your details look good, but <b>nothing was sent</b> because no delivery channel is connected yet. Connect EmailJS or a form endpoint (or add a WhatsApp number) in <code>CONFIG</code>.');
  }
  function setupHelp(el, text, lead) {
    showStatus(el, 'warn', lead + '<br><button class="link-btn" type="button" data-copy>Copy message</button><pre></pre>');
    $('pre', el).textContent = text; el.setAttribute('data-text', text);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var t = b.closest('.status').getAttribute('data-text') || '';
    copyText(t).then(function () { toast('Message copied'); }, function () { toast('Couldn\'t copy. Select the text instead.'); });
  });
  // remember which submit button was used (send vs whatsapp)
  function formSubmit(form, statusSel, build) {
    var via = 'send';
    $$('button[type=submit]', form).forEach(function (b) { b.addEventListener('click', function () { via = b.getAttribute('data-via') || 'send'; }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = $(statusSel); st.hidden = true;
      if (!validate(form)) return;
      deliver(build(new FormData(form)), via, st);
      via = 'send';
    });
  }
  formSubmit($('#contactForm'), '#contactStatus', function (fd) {
    var pid = fd.get('product'), prod = pid === 'custom' ? 'Something custom' : (byId(pid) ? byId(pid).name : '');
    return { Name: fd.get('name'), Contact: fd.get('contact'), Product: prod, Quantity: fd.get('quantity'), Message: (fd.get('message') || '').trim() };
  });
  formSubmit($('#giftForm'), '#giftStatus', function (fd) {
    return { Name: fd.get('name'), Contact: fd.get('contact'), Occasion: fd.get('occasion'), Budget: fd.get('budget'), 'Preferred products': fd.getAll('prefs').join(', '), Notes: (fd.get('notes') || '').trim() };
  });
  ['#contactForm', '#giftForm'].forEach(function (s) { $$('[data-req]', $(s)).forEach(function (el) { el.addEventListener('input', function () { var f = el.closest('.field'); f.classList.remove('invalid'); var er = $('.err', f); if (er) er.textContent = ''; el.setAttribute('aria-invalid', 'false'); }); }); });

  /* Newsletter */
  $$('.js-news').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input', form), err = $('.err', form), st = $('.status', form), v = input.value.trim();
      st.hidden = true; err.textContent = '';
      if (!EMAIL_RE.test(v)) { err.textContent = v ? 'Enter a valid email like name@example.com.' : 'Enter your email address.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      input.setAttribute('aria-invalid', 'false');
      if (!CONFIG.newsletterEndpoint) { showStatus(st, 'warn', 'Your email looks good, but <b>nothing was saved</b>: newsletter sign-up isn\'t connected yet.'); return; }
      showStatus(st, 'warn', 'Subscribing…');
      fetch(CONFIG.newsletterEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) })
        .then(function (r) { if (!r.ok) throw new Error(); showStatus(st, 'ok', 'You\'re subscribed. Watch your inbox for festive updates.'); input.value = ''; })
        .catch(function () { showStatus(st, 'bad', 'Something went wrong. Please try again in a moment.'); });
    });
  });

  /* Legal (draft templates — have these reviewed for your business and local law) */
  var LEGAL = {
    privacy: { title: 'Privacy Policy', html: '<p><b>Draft template.</b> Replace the bracketed details and have this reviewed before launch.</p><h3>What we collect</h3><p>Details you choose to send through our forms: your name, email or phone, and your order or gift preferences.</p><h3>On this website</h3><p>Your bag and wishlist are stored only in your own browser (local storage) so they are still there when you return. You can clear them any time in your browser settings.</p><h3>How we use it</h3><p>To reply to your inquiry, prepare quotes and fulfil orders. We do not sell your information.</p><h3>Sharing</h3><p>We share details only with services needed to respond or deliver (for example email, messaging or courier providers).</p><h3>Your choices</h3><p>You can ask us to correct or delete your information at any time at [your contact email].</p>' },
    terms: { title: 'Terms & Conditions', html: '<p><b>Draft template.</b> Replace the bracketed details and have this reviewed before launch.</p><h3>Sample catalog</h3><p>Products, prices and photos on this site are illustrative until confirmed with you. Final availability and pricing are confirmed before any order is accepted.</p><h3>Orders</h3><p>A request sent through this site is an inquiry, not a confirmed order. An order is confirmed only when we confirm it to you in writing and, where applicable, payment is received.</p><h3>Personalised items</h3><p>Customised items are made to your details. Please check names and messages carefully; [your policy on changes and returns].</p><h3>Delivery &amp; returns</h3><p>[Add your delivery areas, timelines and return or refund policy.]</p><h3>Contact</h3><p>Questions? Reach us at [your contact email].</p>' }
  };

  /* ---------------------------------------------------------------
     GLOBAL CLICK HANDLER (event delegation)
     --------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var t = e.target, el;
    if ((el = t.closest('[data-add]'))) { addToCart(el.getAttribute('data-add')); return; }
    if ((el = t.closest('[data-wish]'))) { toggleWish(el.getAttribute('data-wish')); return; }
    if ((el = t.closest('[data-qty]'))) { var id = el.getAttribute('data-id'); setQty(id, (cart[id] || 0) + Number(el.getAttribute('data-qty'))); return; }
    if ((el = t.closest('[data-remove]'))) { setQty(el.getAttribute('data-remove'), 0); toast('Removed from bag'); return; }
    if (t.closest('#btnClear')) { cart = {}; saveCart(); updateBadges(); toast('Bag cleared'); return; }
    if (t.closest('#btnCheckout')) { openCheckout(); return; }
    if (t.closest('#coWhats')) { var st = $('#coStatus'); if (waReady()) { window.open(waLink(orderText()), '_blank', 'noopener'); showStatus(st, 'ok', 'Opening WhatsApp with your order ready. Press send there to reach us.'); } else setupHelp(st, orderText(), 'WhatsApp isn\'t set up yet. Add the business number to <code>CONFIG.whatsappNumber</code>.'); return; }
    if (t.closest('#coPay')) { startPayment({ lines: cartLines(), subtotal: subtotal() }); return; }
    if (t.closest('#coCopy')) { copyText(orderText()).then(function () { toast('Order summary copied'); }, function () { toast('Couldn\'t copy. Try again.'); }); return; }
    if ((el = t.closest('[data-chip]'))) { setFilter({ cat: el.getAttribute('data-chip') }, false); return; }
    if ((el = t.closest('[data-cat]'))) { setFilter({ cat: el.getAttribute('data-cat'), occ: '', q: '' }, true); return; }
    if ((el = t.closest('[data-occ]'))) { setFilter({ occ: el.getAttribute('data-occ'), cat: 'all', q: '' }, true); return; }
    if ((el = t.closest('[data-rm]'))) { var k = el.getAttribute('data-rm'); var p = {}; p[k] = ''; setFilter(p, false); return; }
    if (t.closest('[data-clear]')) { setFilter({ q: '', cat: 'all', occ: '', sort: 'featured' }, false); return; }
    if ((el = t.closest('[data-open]'))) { openDlg(el.getAttribute('data-open')); return; }
    if ((el = t.closest('[data-legal]'))) { var L = LEGAL[el.getAttribute('data-legal')]; $('#legalTitle').textContent = L.title; $('#legalBody').innerHTML = L.html; openDlg('legalDialog'); return; }
    if ((el = t.closest('[data-close]'))) { closeDlg(el.closest('dialog')); var tgt = el.getAttribute('data-scroll'); if (tgt) { var s = $(tgt); if (s) s.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); } return; }
    if (t.closest('[data-focus-search]')) { e.preventDefault(); closeMenu(); focusSearch(); return; }
  });

  /* ---------------------------------------------------------------
     HEADER, MENU, PARALLAX, REVEALS
     --------------------------------------------------------------- */
  var header = $('#siteHeader'), menu = $('#menu'), burger = $('#btnMenu');
  function closeMenu() { menu.classList.remove('open'); header.classList.remove('is-open'); document.documentElement.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); burger.innerHTML = icon('menu'); }
  burger.addEventListener('click', function () {
    var open = !menu.classList.contains('open');
    if (!open) { closeMenu(); return; }
    menu.classList.add('open'); header.classList.add('is-open'); document.documentElement.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu'); burger.innerHTML = icon('x');
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); burger.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth >= 900) closeMenu(); });

  var parallaxEls = $$('[data-parallax]'), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle('is-solid', y > 40);
      if (!reduceMotion && y < window.innerHeight * 1.4) parallaxEls.forEach(function (el) { el.style.transform = 'translate3d(0,' + (y * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px,0)'; });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }) : null;
  function observeReveals(root) {
    $$('.reveal:not(.in), .zoom-in:not(.in)', root || document).forEach(function (el) { if (io && !reduceMotion) io.observe(el); else el.classList.add('in'); });
  }

  /* ---------------------------------------------------------------
     INIT
     --------------------------------------------------------------- */
  particles($('#heroParticles'), isSmall ? 8 : 16);
  renderChips(); renderProducts(); renderCart(); renderWish(); observeReveals();

  // Setup hints for the site owner (visible in the browser console only)
  var missing = [];
  if (!waReady()) missing.push('CONFIG.whatsappNumber');
  if (!CONFIG.contact.email) missing.push('CONFIG.contact.email');
  if (!CONFIG.contact.phone) missing.push('CONFIG.contact.phone');
  if (!emailReady() && !CONFIG.formEndpoint) missing.push('CONFIG.emailjs or CONFIG.formEndpoint (form delivery)');
  if (!CONFIG.newsletterEndpoint) missing.push('CONFIG.newsletterEndpoint');
  if (missing.length && window.console && console.info) console.info('[Hastakala] Still to configure: ' + missing.join(', '));
})();
