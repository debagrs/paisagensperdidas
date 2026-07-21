document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // ELEMENTOS DA INTERFACE
    // =========================================================================

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
    // CONFIGURAÇÃO GERAL
    // =========================================================================

    /*
     * Quantidade máxima final.
     *
     * Mantemos um limite para:
     * - não alongar demais a obra;
     * - melhorar carregamento;
     * - manter ritmo do scroll.
     */

    const MAX_FINAL_IMAGES = 42;


    // =========================================================================
    // BUSCAS PARA WIKIMEDIA
    // =========================================================================

    /*
     * Aqui deixamos os termos MUITO mais específicos.
     *
     * Evitamos simplesmente "golden hour", por exemplo,
     * porque pode retornar retratos, arquitetura etc.
     */

    const SUNSET_QUERIES = [

        'sunset landscape',

        'sunset sky landscape',

        'sunset over ocean',

        'sunset over sea',

        'sunset beach landscape',

        'sunset mountains landscape',

        'sunset countryside',

        'sunset horizon',

        'sunset lake landscape',

        'sunset river landscape',

        'sunset city skyline',

        'sunset clouds landscape',

        'sunset nature landscape',

        'por do sol paisagem',

        'atardecer paisaje',

        'tramonto paesaggio',

        'coucher de soleil paysage'
    ];


    // =========================================================================
    // HASHTAGS
    // =========================================================================

    /*
     * Removi hashtags excessivamente genéricas.
     *
     * Quanto mais genérica a hashtag,
     * maior o risco de aparecer conteúdo sem relação visual.
     */

    const SUNSET_HASHTAGS = [

        'sunset',

        'pordosol',

        'sunsetsky',

        'sunsetlandscape',

        'sunsetphotography',

        'sunsetlovers',

        'sunsetlover',

        'sunsetclouds',

        'sunsetbeach',

        'sunsetview',

        'atardecer',

        'tramonto',

        'coucherdesoleil'
    ];


    // =========================================================================
    // TERMOS POSITIVOS
    // =========================================================================

    /*
     * Para aceitar posts sociais,
     * exigimos pelo menos um termo claramente relacionado
     * ao pôr do sol.
     */

    const SUNSET_POSITIVE_TERMS = [

        'sunset',

        '#sunset',

        'sunsets',

        '#sunsets',

        'pôr do sol',

        'por do sol',

        '#pordosol',

        'sunsetsky',

        '#sunsetsky',

        'sunset landscape',

        'sunsetlandscape',

        '#sunsetlandscape',

        'sunset photography',

        'sunsetphotography',

        '#sunsetphotography',

        'sunset beach',

        'sunsetbeach',

        'sunset clouds',

        'sunsetclouds',

        'sunset view',

        'sunsetview',

        'atardecer',

        '#atardecer',

        'tramonto',

        '#tramonto',

        'coucher de soleil',

        'coucherdesoleil',

        '#coucherdesoleil'
    ];


    // =========================================================================
    // TERMOS NEGATIVOS
    // =========================================================================

    /*
     * Isto não pretende "compreender" a imagem.
     *
     * É apenas uma barreira adicional para evitar
     * conteúdos evidentemente fora do universo da obra.
     */

    const BLOCKED_TERMS = [

        'politic',

        'política',

        'politica',

        'politician',

        'president',

        'presidente',

        'governor',

        'governador',

        'mayor',

        'prefeito',

        'eleição',

        'eleicao',

        'election',

        'campaign',

        'campanha',

        'candidate',

        'candidato',

        'conference',

        'conferência',

        'conferencia',

        'meeting',

        'reunião',

        'reuniao',

        'seminar',

        'seminário',

        'seminario',

        'congress',

        'congresso',

        'speech',

        'discurso',

        'press conference',

        'coletiva de imprensa',

        'interview',

        'entrevista',

        'portrait',

        'retrato',

        'selfie',

        'fashion',

        'moda',

        'model',

        'modelo',

        'concert',

        'show',

        'festival',

        'band',

        'banda',

        'football',

        'futebol',

        'soccer',

        'basketball',

        'baseball'
    ];


    // =========================================================================
    // FUNÇÕES AUXILIARES
    // =========================================================================

    function stripHtml(html) {

        const tmp = document.createElement('div');

        tmp.innerHTML = html || '';

        return tmp.textContent || tmp.innerText || '';
    }


    function normalizeText(text) {

        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }


    function clamp01(value) {

        return Math.max(
            0,
            Math.min(1, value)
        );
    }


    function smoothStep(value) {

        const t = clamp01(value);

        return t * t * (3 - (2 * t));
    }


    function shuffleArray(array) {

        const result = [...array];

        for (
            let i = result.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                result[i],
                result[j]
            ] = [
                result[j],
                result[i]
            ];
        }

        return result;
    }


    function pickRandom(array, amount) {

        return shuffleArray(array)
            .slice(
                0,
                Math.min(amount, array.length)
            );
    }


    function ensureHttps(url) {

        if (!url) return '';

        if (url.startsWith('//')) {

            return 'https:' + url;
        }

        return url;
    }


    // =========================================================================
    // VALIDAÇÃO SEMÂNTICA
    // =========================================================================

    /*
     * Verifica se o texto contém
     * alguma referência real a pôr do sol.
     */

    function containsSunsetTerm(text) {

        const normalized =
            normalizeText(text);


        return SUNSET_POSITIVE_TERMS.some(term => {

            return normalized.includes(
                normalizeText(term)
            );
        });
    }


    /*
     * Verifica se há sinais claros
     * de conteúdo incompatível.
     */

    function containsBlockedTerm(text) {

        const normalized =
            normalizeText(text);


        return BLOCKED_TERMS.some(term => {

            return normalized.includes(
                normalizeText(term)
            );
        });
    }


    /*
     * Verifica proporção da imagem.
     *
     * A obra busca PAISAGENS.
     *
     * Portanto aceitamos:
     *
     * horizontal;
     * quase quadrada;
     *
     * mas rejeitamos retratos claramente verticais.
     */

    function isLandscapeEnough(width, height) {

        if (!width || !height) {

            /*
             * Quando a API não informa dimensões,
             * não rejeitamos automaticamente.
             */

            return true;
        }


        const ratio =
            width / height;


        /*
         * 1 = quadrada.
         *
         * 0.9 ainda tolera uma pequena verticalidade,
         * mas elimina retratos muito verticais.
         */

        return ratio >= 0.9;
    }


    /*
     * Faz a análise geral da imagem.
     */

    function isRelevantSunsetImage(image) {

        if (!image || !image.src) {

            return false;
        }


        const combinedText = [

            image.description,

            image.alt,

            image.title,

            image.searchContext,

            image.hashtagContext

        ].filter(Boolean).join(' ');


        /*
         * Precisa conter um termo de pôr do sol.
         */

        if (
            !containsSunsetTerm(combinedText)
        ) {

            return false;
        }


        /*
         * Não pode ter termos fortemente incompatíveis.
         */

        if (
            containsBlockedTerm(combinedText)
        ) {

            return false;
        }


        /*
         * Precisa ter proporção compatível
         * com paisagem.
         */

        if (
            !isLandscapeEnough(
                image.width,
                image.height
            )
        ) {

            return false;
        }


        return true;
    }


    // =========================================================================
    // REMOÇÃO DE DUPLICADOS
    // =========================================================================

    function removeDuplicates(images) {

        const ids =
            new Set();

        const urls =
            new Set();


        return images.filter(img => {

            if (!img || !img.src) {

                return false;
            }


            if (
                img.id &&
                ids.has(img.id)
            ) {

                return false;
            }


            if (
                urls.has(img.src)
            ) {

                return false;
            }


            if (img.id) {

                ids.add(img.id);
            }


            urls.add(img.src);


            return true;
        });
    }


    // =========================================================================
    // PROVIDERS
    // =========================================================================

    const providers = {


        // =====================================================================
        // WIKIMEDIA COMMONS
        // =====================================================================

        wikimedia: {

            name: 'Wikimedia Commons',

            enabled: true,


            async fetch(query, limit = 20) {

                const searchTerms =
                    query ||
                    'sunset landscape';


                const url =
                    'https://commons.wikimedia.org/w/api.php'
                    + '?action=query'
                    + '&generator=search'
                    + '&gsrnamespace=6'
                    + `&gsrsearch=${encodeURIComponent(searchTerms)}`
                    + `&gsrlimit=${limit}`
                    + '&prop=imageinfo'
                    + '&iiprop=url|extmetadata|size|mime'
                    + '&iiurlwidth=1200'
                    + '&format=json'
                    + '&origin=*';


                const res =
                    await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Wikimedia HTTP ${res.status}`
                    );
                }


                const data =
                    await res.json();


                if (
                    !data.query ||
                    !data.query.pages
                ) {

                    return [];
                }


                return Object
                    .values(data.query.pages)

                    .filter(page => {

                        const info =
                            page.imageinfo &&
                            page.imageinfo[0];


                        if (!info) {

                            return false;
                        }


                        if (
                            !info.mime ||
                            !info.mime.startsWith('image/')
                        ) {

                            return false;
                        }


                        /*
                         * Exclui imagens pequenas.
                         */

                        if (
                            info.width &&
                            info.width < 800
                        ) {

                            return false;
                        }


                        /*
                         * Exclui retratos verticais.
                         */

                        if (
                            !isLandscapeEnough(
                                info.width,
                                info.height
                            )
                        ) {

                            return false;
                        }


                        return true;
                    })


                    .map(page => {

                        const info =
                            page.imageinfo[0];


                        const meta =
                            info.extmetadata || {};


                        const description =
                            meta.ImageDescription
                                ? stripHtml(
                                    meta.ImageDescription.value
                                )
                                : (
                                    page.title || ''
                                );


                        return {

                            id:
                                'wmc_' +
                                page.pageid,


                            src:
                                ensureHttps(
                                    info.thumburl ||
                                    info.url
                                ),


                            fullSrc:
                                ensureHttps(
                                    info.url
                                ),


                            thumb:
                                ensureHttps(
                                    info.thumburl ||
                                    info.url
                                ),


                            author:
                                meta.Artist
                                    ? stripHtml(
                                        meta.Artist.value
                                    )
                                    : 'Desconhecido',


                            origin:
                                'Wikimedia Commons',


                            link:
                                info.descriptionurl ||
                                '',


                            description:
                                description,


                            title:
                                page.title || '',


                            /*
                             * Guardamos a busca usada.
                             *
                             * Isso ajuda o filtro semântico.
                             */

                            searchContext:
                                query,


                            license:
                                meta.LicenseShortName
                                    ? meta.LicenseShortName.value
                                    : '',


                            date:
                                meta.DateTimeOriginal
                                    ? meta.DateTimeOriginal.value
                                    : '',


                            width:
                                info.width ||
                                null,


                            height:
                                info.height ||
                                null
                        };
                    })


                    /*
                     * Segunda filtragem.
                     *
                     * Só mantém resultados semanticamente
                     * ligados ao pôr do sol.
                     */

                    .filter(
                        isRelevantSunsetImage
                    );
            }
        },


        // =====================================================================
        // BLUESKY
        // =====================================================================

        bluesky: {

            name:
                'Bluesky',

            enabled:
                true,


            async fetch(hashtag, limit = 20) {

                const cleanTag =
                    String(hashtag || '')
                        .replace('#', '');


                /*
                 * Busca pelo termo e pela hashtag.
                 */

                const searchQuery =
                    `#${cleanTag}`;


                const url =
                    'https://public.api.bsky.app'
                    + '/xrpc/app.bsky.feed.searchPosts'
                    + `?q=${encodeURIComponent(searchQuery)}`
                    + `&limit=${Math.min(limit, 25)}`
                    + '&sort=latest';


                const res =
                    await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Bluesky HTTP ${res.status}`
                    );
                }


                const data =
                    await res.json();


                if (
                    !data ||
                    !Array.isArray(data.posts)
                ) {

                    return [];
                }


                const images = [];


                data.posts.forEach(post => {

                    const embed =
                        post.embed || {};


                    let postImages =
                        [];


                    if (
                        Array.isArray(
                            embed.images
                        )
                    ) {

                        postImages =
                            embed.images;
                    }


                    if (
                        postImages.length === 0 &&
                        embed.media &&
                        Array.isArray(
                            embed.media.images
                        )
                    ) {

                        postImages =
                            embed.media.images;
                    }


                    const postText =
                        (
                            post.record &&
                            post.record.text
                        )
                        ||
                        '';


                    /*
                     * PRIMEIRO FILTRO:
                     *
                     * o próprio texto do post precisa realmente
                     * conter referência a pôr do sol.
                     */

                    const textForValidation =
                        `${postText} #${cleanTag}`;


                    if (
                        !containsSunsetTerm(
                            textForValidation
                        )
                    ) {

                        return;
                    }


                    /*
                     * Bloqueia posts evidentemente
                     * incompatíveis.
                     */

                    if (
                        containsBlockedTerm(
                            postText
                        )
                    ) {

                        return;
                    }


                    let postLink =
                        '';


                    if (
                        post.author &&
                        post.author.handle &&
                        post.uri
                    ) {

                        const parts =
                            post.uri.split('/');


                        const rkey =
                            parts[
                                parts.length - 1
                            ];


                        postLink =
                            `https://bsky.app/profile/`
                            + `${post.author.handle}`
                            + `/post/${rkey}`;
                    }


                    postImages.forEach(
                        (image, index) => {

                            const src =
                                image.fullsize ||
                                image.thumb ||
                                image.url ||
                                '';


                            if (!src) {

                                return;
                            }


                            /*
                             * Bluesky pode fornecer aspectRatio.
                             */

                            const width =
                                image.aspectRatio &&
                                image.aspectRatio.width
                                    ? image.aspectRatio.width
                                    : null;


                            const height =
                                image.aspectRatio &&
                                image.aspectRatio.height
                                    ? image.aspectRatio.height
                                    : null;


                            /*
                             * Rejeita retratos verticais.
                             */

                            if (
                                !isLandscapeEnough(
                                    width,
                                    height
                                )
                            ) {

                                return;
                            }


                            const item = {

                                id:
                                    `bsky_${post.cid || post.uri}_${index}`,


                                src:
                                    ensureHttps(src),


                                fullSrc:
                                    ensureHttps(
                                        image.fullsize ||
                                        src
                                    ),


                                thumb:
                                    ensureHttps(
                                        image.thumb ||
                                        src
                                    ),


                                author:
                                    post.author
                                        ? (
                                            post.author.displayName
                                            ||
                                            post.author.handle
                                            ||
                                            'Desconhecido'
                                        )
                                        : 'Desconhecido',


                                origin:
                                    'Bluesky',


                                link:
                                    postLink,


                                description:
                                    image.alt ||
                                    postText ||
                                    '',


                                alt:
                                    image.alt ||
                                    '',


                                hashtagContext:
                                    `#${cleanTag}`,


                                license:
                                    '',


                                date:
                                    post.indexedAt
                                    ||
                                    (
                                        post.record &&
                                        post.record.createdAt
                                    )
                                    ||
                                    '',


                                width:
                                    width,


                                height:
                                    height
                            };


                            /*
                             * Filtro final.
                             */

                            if (
                                isRelevantSunsetImage(
                                    item
                                )
                            ) {

                                images.push(
                                    item
                                );
                            }
                        }
                    );
                });


                return images;
            }
        },


        // =====================================================================
        // MASTODON
        // =====================================================================

        mastodon: {

            name:
                'Mastodon',

            enabled:
                true,


            instances: [

                'https://mastodon.social',

                'https://mstdn.social',

                'https://mas.to'
            ],


            async fetch(hashtag, limit = 20) {

                const instance =
                    this.instances[
                        Math.floor(
                            Math.random() *
                            this.instances.length
                        )
                    ];


                const cleanTag =
                    String(hashtag || '')
                        .replace('#', '');


                const url =
                    `${instance}`
                    + `/api/v1/timelines/tag/`
                    + `${encodeURIComponent(cleanTag)}`
                    + `?limit=${Math.min(limit, 40)}`
                    + '&only_media=true';


                const res =
                    await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Mastodon ${instance} HTTP ${res.status}`
                    );
                }


                const statuses =
                    await res.json();


                if (
                    !Array.isArray(
                        statuses
                    )
                ) {

                    return [];
                }


                const images =
                    [];


                statuses.forEach(status => {

                    const sourceStatus =
                        status.reblog ||
                        status;


                    const contentText =
                        stripHtml(
                            sourceStatus.content ||
                            ''
                        );


                    /*
                     * Mesmo vindo da timeline da hashtag,
                     * conferimos novamente se há
                     * vocabulário de pôr do sol.
                     */

                    const validationText =
                        `${contentText} #${cleanTag}`;


                    if (
                        !containsSunsetTerm(
                            validationText
                        )
                    ) {

                        return;
                    }


                    /*
                     * Bloqueia conteúdo incompatível.
                     */

                    if (
                        containsBlockedTerm(
                            contentText
                        )
                    ) {

                        return;
                    }


                    const attachments =
                        sourceStatus.media_attachments ||
                        [];


                    attachments.forEach(
                        (media, index) => {

                            if (
                                media.type !==
                                'image'
                            ) {

                                return;
                            }


                            const src =
                                media.preview_url ||
                                media.url ||
                                '';


                            if (!src) {

                                return;
                            }


                            /*
                             * Mastodon fornece metadata
                             * de dimensões em muitos casos.
                             */

                            const width =
                                media.meta &&
                                media.meta.original &&
                                media.meta.original.width
                                    ? media.meta.original.width
                                    : null;


                            const height =
                                media.meta &&
                                media.meta.original &&
                                media.meta.original.height
                                    ? media.meta.original.height
                                    : null;


                            /*
                             * Rejeita retratos verticais.
                             */

                            if (
                                !isLandscapeEnough(
                                    width,
                                    height
                                )
                            ) {

                                return;
                            }


                            const item = {

                                id:
                                    `mastodon_${sourceStatus.id}_${index}`,


                                src:
                                    ensureHttps(src),


                                fullSrc:
                                    ensureHttps(
                                        media.url ||
                                        src
                                    ),


                                thumb:
                                    ensureHttps(
                                        media.preview_url ||
                                        src
                                    ),


                                author:
                                    sourceStatus.account
                                        ? (
                                            sourceStatus
                                                .account
                                                .display_name
                                            ||
                                            sourceStatus
                                                .account
                                                .acct
                                            ||
                                            'Desconhecido'
                                        )
                                        : 'Desconhecido',


                                origin:
                                    'Mastodon',


                                link:
                                    sourceStatus.url ||
                                    '',


                                description:
                                    media.description
                                    ||
                                    contentText
                                    ||
                                    '',


                                alt:
                                    media.description ||
                                    '',


                                hashtagContext:
                                    `#${cleanTag}`,


                                license:
                                    '',


                                date:
                                    sourceStatus.created_at ||
                                    '',


                                width:
                                    width,


                                height:
                                    height
                            };


                            if (
                                isRelevantSunsetImage(
                                    item
                                )
                            ) {

                                images.push(
                                    item
                                );
                            }
                        }
                    );
                });


                return images;
            }
        },


        // =====================================================================
        // FLICKR
        // =====================================================================

        flickr: {

            name:
                'Flickr',

            enabled:
                false,

            apiKey:
                '',


            async fetch(query, limit) {

                if (!this.apiKey) {

                    return [];
                }


                const url =
                    'https://api.flickr.com/services/rest/'
                    + '?method=flickr.photos.search'
                    + `&api_key=${this.apiKey}`
                    + `&text=${encodeURIComponent(query || 'sunset landscape')}`
                    + '&sort=date-posted-desc'
                    + '&content_type=1'
                    + '&media=photos'
                    + `&per_page=${limit || 30}`
                    + '&extras=url_l,url_o,owner_name,description,date_taken,license,geo'
                    + '&format=json'
                    + '&nojsoncallback=1';


                const res =
                    await fetch(url);


                const data =
                    await res.json();


                if (
                    !data.photos ||
                    !data.photos.photo
                ) {

                    return [];
                }


                return data.photos.photo

                    .filter(
                        p =>
                            p.url_l ||
                            p.url_o
                    )

                    .map(p => ({

                        id:
                            'flickr_' +
                            p.id,


                        src:
                            p.url_l ||
                            p.url_o,


                        fullSrc:
                            p.url_o ||
                            p.url_l,


                        thumb:
                            p.url_l ||
                            p.url_o,


                        author:
                            p.ownername ||
                            'Desconhecido',


                        origin:
                            'Flickr',


                        link:
                            `https://www.flickr.com/photos/${p.owner}/${p.id}`,


                        description:
                            p.description &&
                            p.description._content
                                ? stripHtml(
                                    p.description._content
                                )
                                : p.title || '',


                        searchContext:
                            query,


                        license:
                            p.license || '',


                        date:
                            p.datetaken || ''
                    }))

                    .filter(
                        isRelevantSunsetImage
                    );
            }
        },


        // =====================================================================
        // INSTAGRAM
        // =====================================================================

        instagram: {

            name:
                'Instagram',

            enabled:
                false,


            async fetch() {

                return [];
            }
        },


        // =====================================================================
        // TIKTOK
        // =====================================================================

        tiktok: {

            name:
                'TikTok',

            enabled:
                false,


            async fetch() {

                return [];
            }
        }
    };


    // =========================================================================
    // CARREGAMENTO
    // =========================================================================

    async function loadImages() {

        let allImages =
            [];


        /*
         * Wikimedia:
         * 4 buscas diferentes por sessão.
         */

        const selectedQueries =
            pickRandom(
                SUNSET_QUERIES,
                4
            );


        /*
         * Redes:
         * escolhemos 4 hashtags.
         */

        const selectedHashtags =
            pickRandom(
                SUNSET_HASHTAGS,
                4
            );


        console.log(
            '[Paisagens Perdidas] buscas:',
            selectedQueries
        );


        console.log(
            '[Paisagens Perdidas] hashtags:',
            selectedHashtags
        );


        // =====================================================================
        // WIKIMEDIA
        // =====================================================================

        if (
            providers.wikimedia.enabled
        ) {

            for (
                const query
                of selectedQueries
            ) {

                try {

                    const images =
                        await providers.wikimedia.fetch(
                            query,
                            15
                        );


                    allImages =
                        allImages.concat(
                            images
                        );

                } catch (err) {

                    console.warn(
                        '[Wikimedia] erro:',
                        err
                    );
                }
            }
        }


        // =====================================================================
        // BLUESKY
        // =====================================================================

        if (
            providers.bluesky.enabled
        ) {

            for (
                const hashtag
                of selectedHashtags
            ) {

                try {

                    const images =
                        await providers.bluesky.fetch(
                            hashtag,
                            20
                        );


                    allImages =
                        allImages.concat(
                            images
                        );

                } catch (err) {

                    console.warn(
                        `[Bluesky #${hashtag}] erro:`,
                        err
                    );
                }
            }
        }


        // =====================================================================
        // MASTODON
        // =====================================================================

        if (
            providers.mastodon.enabled
        ) {

            for (
                const hashtag
                of selectedHashtags.slice(
                    0,
                    3
                )
            ) {

                try {

                    const images =
                        await providers.mastodon.fetch(
                            hashtag,
                            25
                        );


                    allImages =
                        allImages.concat(
                            images
                        );

                } catch (err) {

                    console.warn(
                        `[Mastodon #${hashtag}] erro:`,
                        err
                    );
                }
            }
        }


        // =====================================================================
        // FILTRAGEM GERAL
        // =====================================================================

        /*
         * Aplicamos novamente o filtro
         * a TODAS as fontes.
         */

        allImages =
            allImages.filter(
                isRelevantSunsetImage
            );


        /*
         * Remove duplicadas.
         */

        allImages =
            removeDuplicates(
                allImages
            );


        /*
         * Embaralha.
         */

        allImages =
            shuffleArray(
                allImages
            );


        /*
         * Limite final.
         */

        allImages =
            allImages.slice(
                0,
                MAX_FINAL_IMAGES
            );


        console.log(
            `[Paisagens Perdidas] ${allImages.length} imagens aprovadas pela curadoria automática.`
        );


        /*
         * Fallback.
         */

        if (
            allImages.length === 0
        ) {

            timelineContainer.innerHTML =
                '<p style="padding:40px;text-align:center;">'
                + 'As paisagens estão temporariamente silenciosas.'
                + '</p>';


            return;
        }


        renderImages(
            allImages
        );
    }


    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================

    function renderImages(imageList) {

        timelineContainer.innerHTML =
            '';


        imageList.forEach(img => {

            const wrapper =
                document.createElement(
                    'div'
                );


            wrapper.className =
                'timeline-image-wrapper';


            const imgEl =
                document.createElement(
                    'img'
                );


            imgEl.className =
                'timeline-image';


            imgEl.src =
                img.src;


            imgEl.loading =
                'lazy';


            imgEl.decoding =
                'async';


            imgEl.alt =
                img.description
                ||
                `Paisagem de pôr do sol — ${img.origin}`;


            imgEl.setAttribute(
                'data-origin',
                img.origin || ''
            );


            imgEl.setAttribute(
                'data-author',
                img.author || ''
            );


            imgEl.setAttribute(
                'data-id',
                img.id || ''
            );


            /*
             * Imagem externa falhou?
             *
             * Remove somente ela.
             */

            imgEl.addEventListener(
                'error',
                () => {

                    wrapper.remove();
                }
            );


            wrapper.appendChild(
                imgEl
            );


            timelineContainer.appendChild(
                wrapper
            );
        });
    }


    // =========================================================================
    // INTRO
    // =========================================================================

    document.body.style.overflow =
        'hidden';


    setTimeout(
        () => {

            text1.style.opacity =
                1;

        },
        1000
    );


    setTimeout(
        () => {

            text1.style.opacity =
                0;

        },
        4000
    );


    setTimeout(
        () => {

            text2.style.opacity =
                1;

        },
        5500
    );


    setTimeout(
        () => {

            text2.style.opacity =
                0;

        },
        8500
    );


    setTimeout(
        () => {

            text3.style.opacity =
                1;

        },
        10000
    );


    setTimeout(
        () => {

            text3.style.opacity =
                0;

        },
        13000
    );


    setTimeout(
        () => {

            introSequence.style.opacity =
                0;


            setTimeout(
                () => {

                    introSequence.style.display =
                        'none';


                    document.body.style.overflow =
                        '';


                    timelineContainer.style.opacity =
                        1;


                    updateScroll();

                },
                3000
            );

        },
        14500
    );


    // =========================================================================
    // SCROLL
    // =========================================================================

    let isEndTriggered =
        false;


    let ticking =
        false;


    function updateScroll() {

        const documentHeight =
            Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );


        const maxScroll =
            documentHeight -
            window.innerHeight;


        if (
            maxScroll <= 0
        ) {

            ticking =
                false;


            return;
        }


        const scrollFraction =
            clamp01(
                window.scrollY /
                maxScroll
            );


        // =====================================================================
        // ESCURECIMENTO
        // =====================================================================

        const DARK_COMPLETE_AT =
            0.68;


        const darknessProgress =
            clamp01(
                scrollFraction /
                DARK_COMPLETE_AT
            );


        const darkness =
            smoothStep(
                darknessProgress
            );


        document.documentElement
            .style
            .setProperty(
                '--darkness',
                darkness.toFixed(4)
            );


        // =====================================================================
        // FINAL
        // =====================================================================

        const END_TRIGGER_AT =
            0.72;


        if (
            scrollFraction >=
            END_TRIGGER_AT
            &&
            !isEndTriggered
        ) {

            isEndTriggered =
                true;


            triggerEndSequence();
        }


        ticking =
            false;
    }


    // =========================================================================
    // EVENTO DE SCROLL
    // =========================================================================

    window.addEventListener(
        'scroll',
        () => {

            if (!ticking) {

                ticking =
                    true;


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
    // SEQUÊNCIA FINAL
    // =========================================================================

    function triggerEndSequence() {

        document.documentElement
            .style
            .setProperty(
                '--darkness',
                '1'
            );


        endSequence.style.display =
            'flex';


        window.requestAnimationFrame(
            () => {

                window.requestAnimationFrame(
                    () => {

                        endText1.style.opacity =
                            '1';
                    }
                );
            }
        );


        setTimeout(
            () => {

                endText1.style.opacity =
                    '0';

            },
            3200
        );


        setTimeout(
            () => {

                endText2.style.opacity =
                    '1';

            },
            4100
        );
    }


    // =========================================================================
    // RESIZE
    // =========================================================================

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
