document.addEventListener('DOMContentLoaded', () => {
    const introSequence = document.getElementById('intro-sequence');
    const text1 = document.getElementById('text1');
    const text2 = document.getElementById('text2');
    const text3 = document.getElementById('text3');
    const timelineContainer = document.getElementById('timeline-container');
    const mainNav = document.getElementById('main-nav');
    const endSequence = document.getElementById('end-sequence');
    const endText1 = document.getElementById('end-text1');
    const endText2 = document.getElementById('end-text2');

    // =========================================================================
    // PROVIDER ARCHITECTURE
    // Each provider fetches images from a different source and normalizes them
    // into a common format: { id, src, thumb, author, origin, link, description }
    // =========================================================================

    const providers = {

        // ----- WIKIMEDIA COMMONS (active) -----
        wikimedia: {
            name: 'Wikimedia Commons',
            enabled: true,
            async fetch(query, limit) {
                const searchTerms = query || 'sunset landscape';
                const url = 'https://commons.wikimedia.org/w/api.php'
                    + '?action=query'
                    + '&generator=search'
                    + '&gsrnamespace=6'
                    + `&gsrsearch=${encodeURIComponent(searchTerms)}`
                    + `&gsrlimit=${limit || 30}`
                    + '&prop=imageinfo'
                    + '&iiprop=url|extmetadata|size|mime'
                    + '&iiurlwidth=1200'
                    + '&format=json'
                    + '&origin=*';

                const res = await fetch(url);
                const data = await res.json();

                if (!data.query || !data.query.pages) return [];

                return Object.values(data.query.pages)
                    .filter(page => {
                        const info = page.imageinfo && page.imageinfo[0];
                        if (!info) return false;
                        if (!info.mime || !info.mime.startsWith('image/')) return false;
                        if (info.width < 800) return false; // skip small images
                        return true;
                    })
                    .map(page => {
                        const info = page.imageinfo[0];
                        const meta = info.extmetadata || {};
                        return {
                            id: 'wmc_' + page.pageid,
                            src: info.thumburl || info.url,
                            fullSrc: info.url,
                            thumb: info.thumburl || info.url,
                            author: meta.Artist ? stripHtml(meta.Artist.value) : 'Desconhecido',
                            origin: 'Wikimedia Commons',
                            link: info.descriptionurl || '',
                            description: meta.ImageDescription
                                ? stripHtml(meta.ImageDescription.value)
                                : (page.title || ''),
                            license: meta.LicenseShortName
                                ? meta.LicenseShortName.value
                                : '',
                            date: meta.DateTimeOriginal
                                ? meta.DateTimeOriginal.value
                                : '',
                        };
                    });
            }
        },

        // ----- FLICKR (requires API key) -----
        flickr: {
            name: 'Flickr',
            enabled: false, // set to true when API key is configured
            apiKey: '', // INSERT YOUR FLICKR API KEY HERE
            async fetch(query, limit) {
                if (!this.apiKey) return [];
                const url = 'https://api.flickr.com/services/rest/'
                    + '?method=flickr.photos.search'
                    + `&api_key=${this.apiKey}`
                    + `&text=${encodeURIComponent(query || 'sunset')}`
                    + '&sort=interestingness-desc'
                    + '&content_type=1'
                    + '&media=photos'
                    + `&per_page=${limit || 30}`
                    + '&extras=url_l,url_o,owner_name,description,date_taken,license,geo'
                    + '&format=json&nojsoncallback=1';

                const res = await fetch(url);
                const data = await res.json();

                if (!data.photos || !data.photos.photo) return [];

                return data.photos.photo
                    .filter(p => p.url_l || p.url_o)
                    .map(p => ({
                        id: 'flickr_' + p.id,
                        src: p.url_l || p.url_o,
                        fullSrc: p.url_o || p.url_l,
                        thumb: p.url_l || p.url_o,
                        author: p.ownername || 'Desconhecido',
                        origin: 'Flickr',
                        link: `https://www.flickr.com/photos/${p.owner}/${p.id}`,
                        description: p.description && p.description._content
                            ? stripHtml(p.description._content)
                            : p.title || '',
                        license: p.license || '',
                        date: p.datetaken || '',
                    }));
            }
        },

        // ----- BLUESKY (public, no key) -----
        bluesky: {
            name: 'Bluesky',
            enabled: false, // enable when ready
            async fetch(query, limit) {
                // Bluesky AT Protocol - public search
                // Requires CORS proxy or backend
                return [];
            }
        },

        // ----- MASTODON (public, no key) -----
        mastodon: {
            name: 'Mastodon',
            enabled: false, // enable when ready
            instance: 'https://mastodon.social',
            async fetch(query, limit) {
                // Mastodon public timeline search
                // Requires instance URL
                return [];
            }
        },

        // ----- INSTAGRAM GRAPH API (requires app approval) -----
        instagram: {
            name: 'Instagram',
            enabled: false,
            accessToken: '',
            async fetch(query, limit) { return []; }
        },

        // ----- TIKTOK RESEARCH API (requires app approval) -----
        tiktok: {
            name: 'TikTok',
            enabled: false,
            async fetch(query, limit) { return []; }
        },
    };

    // Helper: strip HTML tags from strings
    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // =========================================================================
    // FETCH & RENDER
    // =========================================================================

    async function loadImages() {
        let allImages = [];

        for (const key of Object.keys(providers)) {
            const provider = providers[key];
            if (!provider.enabled) continue;

            try {
                const images = await provider.fetch('sunset por do sol', 30);
                allImages = allImages.concat(images);
            } catch (err) {
                console.warn(`[Provider ${provider.name}] Erro:`, err);
            }
        }

        // Shuffle for variety
        allImages = allImages.sort(() => Math.random() - 0.5);

        renderImages(allImages);
    }

    function renderImages(imageList) {
        timelineContainer.innerHTML = '';

        imageList.forEach(img => {
            const wrapper = document.createElement('div');
            wrapper.className = 'timeline-image-wrapper';

            const imgEl = document.createElement('img');
            imgEl.className = 'timeline-image';
            imgEl.src = img.src;
            imgEl.loading = 'lazy';
            imgEl.alt = img.description || `Pôr do sol — ${img.origin}`;
            imgEl.setAttribute('data-origin', img.origin);
            imgEl.setAttribute('data-author', img.author);
            imgEl.setAttribute('data-id', img.id);

            wrapper.appendChild(imgEl);
            timelineContainer.appendChild(wrapper);
        });

        // Update image references for scroll logic
        updateImageReferences();
    }

    let images = [];
    function updateImageReferences() {
        images = document.querySelectorAll('.timeline-image');
    }

    // =========================================================================
    // INTRO ANIMATION
    // =========================================================================

    document.body.style.overflow = 'hidden';

    setTimeout(() => { text1.style.opacity = 1; }, 1000);
    setTimeout(() => { text1.style.opacity = 0; }, 4000);

    setTimeout(() => { text2.style.opacity = 1; }, 5500);
    setTimeout(() => { text2.style.opacity = 0; }, 8500);

    setTimeout(() => { text3.style.opacity = 1; }, 10000);
    setTimeout(() => { text3.style.opacity = 0; }, 13000);

    setTimeout(() => {
        introSequence.style.opacity = 0;
        setTimeout(() => {
            introSequence.style.display = 'none';
            document.body.style.overflow = '';
            timelineContainer.style.opacity = 1;
        }, 3000);
    }, 14500);

    // =========================================================================
    // SCROLL LOGIC — escurece desde o primeiro pixel de scroll
    // Usa porcentagem total da página — funciona igual em desktop e mobile
    // A 70% da rolagem total já está completamente preto
    // =========================================================================

    let isEndTriggered = false;
    let ticking = false;

    function updateScroll() {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) return;

        // Fração de 0 a 1 baseada na rolagem total
        const scrollFraction = window.scrollY / maxScroll;

        // Escurece de forma acelerada: preto total a 70% da página
        // Isso garante que as últimas imagens já estejam invisíveis
        const progress = Math.min(1, scrollFraction / 0.7);

        // Curva suave (ease-in) para parecer natural
        const eased = progress * progress;

        const brightness = Math.max(0, 1 - eased);
        const contrast = Math.max(0.5, 1 - (eased * 0.5));
        const saturation = Math.max(0, 1 - (eased * 1.8));

        // Fundo escurece junto
        const bgVal = Math.round(Math.max(0, 252 * (1 - eased)));
        document.body.style.backgroundColor = `rgb(${bgVal}, ${bgVal}, ${bgVal})`;

        images.forEach(img => {
            img.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
        });

        // Trigger end sequence
        if (scrollFraction > 0.95 && !isEndTriggered) {
            isEndTriggered = true;
            triggerEndSequence();
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateScroll();
            });
            ticking = true;
        }
    });

    function triggerEndSequence() {
        setTimeout(() => {
            endSequence.style.display = 'flex';
            setTimeout(() => { endText1.style.opacity = 1; }, 2000);
            setTimeout(() => { endText1.style.opacity = 0; }, 7000);
            setTimeout(() => { endText2.style.opacity = 1; }, 9000);
        }, 3000);
    }

    // =========================================================================
    // INIT — load images from active providers
    // =========================================================================
    loadImages();
});
