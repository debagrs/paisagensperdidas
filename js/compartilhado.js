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

                if (!data.query || !data.query.pages) {
                    return [];
                }

                return Object.values(data.query.pages)
                    .filter(page => {
                        const info = page.imageinfo && page.imageinfo[0];

                        if (!info) return false;
                        if (!info.mime || !info.mime.startsWith('image/')) return false;
                        if (info.width < 800) return false;

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
                            author: meta.Artist
                                ? stripHtml(meta.Artist.value)
                                : 'Desconhecido',
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
            enabled: false,
            apiKey: '',

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

                if (!data.photos || !data.photos.photo) {
                    return [];
                }

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
                        description:
                            p.description &&
                            p.description._content
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
            enabled: false,

            async fetch(query, limit) {
                return [];
            }
        },

        // ----- MASTODON (public, no key) -----
        mastodon: {
            name: 'Mastodon',
            enabled: false,
            instance: 'https://mastodon.social',

            async fetch(query, limit) {
                return [];
            }
        },

        // ----- INSTAGRAM GRAPH API -----
        instagram: {
            name: 'Instagram',
            enabled: false,
            accessToken: '',

            async fetch(query, limit) {
                return [];
            }
        },

        // ----- TIKTOK RESEARCH API -----
        tiktok: {
            name: 'TikTok',
            enabled: false,

            async fetch(query, limit) {
                return [];
            }
        },
    };


    // =========================================================================
    // HELPERS
    // =========================================================================

    function stripHtml(html) {
        const tmp = document.createElement('div');

        tmp.innerHTML = html;

        return tmp.textContent || tmp.innerText || '';
    }


    function clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }


    function smoothStep(value) {
        const t = clamp01(value);

        return t * t * (3 - (2 * t));
    }


    // =========================================================================
    // FETCH & RENDER
    // =========================================================================

    async function loadImages() {
        let allImages = [];

        for (const key of Object.keys(providers)) {
            const provider = providers[key];

            if (!provider.enabled) {
                continue;
            }

            try {
                const images =
                    await provider.fetch(
                        'sunset por do sol',
                        30
                    );

                allImages =
                    allImages.concat(images);

            } catch (err) {
                console.warn(
                    `[Provider ${provider.name}] Erro:`,
                    err
                );
            }
        }

        // Shuffle for variety
        allImages =
            allImages.sort(
                () => Math.random() - 0.5
            );

        renderImages(allImages);
    }


    function renderImages(imageList) {
        timelineContainer.innerHTML = '';

        imageList.forEach(img => {
            const wrapper =
                document.createElement('div');

            wrapper.className =
                'timeline-image-wrapper';


            const imgEl =
                document.createElement('img');

            imgEl.className =
                'timeline-image';

            imgEl.src =
                img.src;

            imgEl.loading =
                'lazy';

            imgEl.alt =
                img.description ||
                `Pôr do sol — ${img.origin}`;

            imgEl.setAttribute(
                'data-origin',
                img.origin
            );

            imgEl.setAttribute(
                'data-author',
                img.author
            );

            imgEl.setAttribute(
                'data-id',
                img.id
            );


            wrapper.appendChild(imgEl);

            timelineContainer.appendChild(
                wrapper
            );
        });
    }


    // =========================================================================
    // INTRO ANIMATION
    // =========================================================================

    document.body.style.overflow = 'hidden';


    setTimeout(() => {
        text1.style.opacity = 1;
    }, 1000);


    setTimeout(() => {
        text1.style.opacity = 0;
    }, 4000);


    setTimeout(() => {
        text2.style.opacity = 1;
    }, 5500);


    setTimeout(() => {
        text2.style.opacity = 0;
    }, 8500);


    setTimeout(() => {
        text3.style.opacity = 1;
    }, 10000);


    setTimeout(() => {
        text3.style.opacity = 0;
    }, 13000);


    setTimeout(() => {

        introSequence.style.opacity = 0;


        setTimeout(() => {

            introSequence.style.display =
                'none';

            document.body.style.overflow =
                '';

            timelineContainer.style.opacity =
                1;

            /*
             * Recalcula o scroll depois que a intro desaparece.
             */
            updateScroll();

        }, 3000);

    }, 14500);


    // =========================================================================
    // SCROLL LOGIC
    //
    // NOVA LÓGICA:
    //
    // - NÃO escurece mais cada imagem separadamente.
    // - NÃO cria mais aquele efeito de cards cinza.
    // - Usa uma camada preta única sobre toda a tela.
    // - Essa camada é controlada pela variável CSS --darkness.
    // - A frase final entra MUITO antes.
    // =========================================================================

    let isEndTriggered = false;
    let ticking = false;


    function updateScroll() {

        const documentHeight =
            Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );


        const maxScroll =
            documentHeight -
            window.innerHeight;


        if (maxScroll <= 0) {
            ticking = false;

            return;
        }


        /*
         * Progresso da página:
         *
         * 0 = início
         * 1 = final
         */

        const scrollFraction =
            clamp01(
                window.scrollY /
                maxScroll
            );


        // =====================================================
        // ESCURECIMENTO
        // =====================================================

        /*
         * O preto chega a 100%
         * em aproximadamente 68% da rolagem.
         *
         * Portanto não é necessário chegar
         * quase ao fim da página.
         */

        const DARK_COMPLETE_AT =
            0.68;


        const darknessProgress =
            clamp01(
                scrollFraction /
                DARK_COMPLETE_AT
            );


        /*
         * Curva suave.
         *
         * Evita uma mudança muito seca
         * nos primeiros pixels.
         */

        const darkness =
            smoothStep(
                darknessProgress
            );


        /*
         * Essa variável é utilizada
         * pelo ::after no CSS.
         */

        document.documentElement
            .style
            .setProperty(
                '--darkness',
                darkness.toFixed(4)
            );


        // =====================================================
        // FINAL
        // =====================================================

        /*
         * Antes:
         *
         * 95% da rolagem
         * +
         * 3 segundos
         * +
         * 2 segundos
         *
         * Agora a sequência começa
         * aproximadamente em 72%.
         */

        const END_TRIGGER_AT =
            0.72;


        if (
            scrollFraction >=
                END_TRIGGER_AT
            &&
            !isEndTriggered
        ) {

            isEndTriggered = true;

            triggerEndSequence();
        }


        ticking = false;
    }


    // =========================================================================
    // SCROLL EVENT
    // =========================================================================

    window.addEventListener(
        'scroll',
        () => {

            if (!ticking) {

                ticking = true;


                window.requestAnimationFrame(
                    updateScroll
                );
            }
        },
        {
            passive: true
        }
    );


    // =========================================================================
    // FINAL SEQUENCE
    // =========================================================================

    function triggerEndSequence() {

        /*
         * Garante preto absoluto.
         */

        document.documentElement
            .style
            .setProperty(
                '--darkness',
                '1'
            );


        /*
         * Mostra imediatamente
         * o container final.
         */

        endSequence.style.display =
            'flex';


        /*
         * PRIMEIRA FRASE
         *
         * Aparece quase imediatamente.
         */

        window.requestAnimationFrame(() => {

            window.requestAnimationFrame(() => {

                endText1.style.opacity =
                    '1';

            });
        });


        /*
         * Primeira frase permanece
         * aproximadamente 3,2 segundos.
         */

        setTimeout(() => {

            endText1.style.opacity =
                '0';

        }, 3200);


        /*
         * Segunda / última frase entra
         * logo depois.
         */

        setTimeout(() => {

            endText2.style.opacity =
                '1';

        }, 4100);
    }


    // =========================================================================
    // RESIZE
    // =========================================================================

    /*
     * Se mudar orientação do celular,
     * redimensionar browser etc.,
     * recalculamos.
     */

    window.addEventListener(
        'resize',
        () => {

            window.requestAnimationFrame(
                updateScroll
            );
        }
    );


    // =========================================================================
    // INIT
    // =========================================================================

    loadImages();

    updateScroll();
});
