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
     * Número máximo de imagens exibidas na experiência.
     *
     * Mantemos um limite para evitar:
     * - página excessivamente longa;
     * - scroll interminável;
     * - excesso de chamadas;
     * - carregamento pesado em celular.
     */

    const MAX_FINAL_IMAGES = 48;


    /*
     * Vocabulário internacional.
     *
     * A cada nova visita algumas buscas diferentes são sorteadas.
     *
     * Isso faz com que "O pôr do sol compartilhado"
     * seja reconstruído constantemente.
     */

    const SUNSET_QUERIES = [

        'sunset',

        'por do sol',

        'pôr do sol',

        'sunset sky',

        'sunset landscape',

        'sunset photography',

        'sunset beach',

        'sunset mountains',

        'sunset city',

        'golden hour',

        'atardecer',

        'tramonto',

        'coucher de soleil'
    ];


    /*
     * Hashtags usadas nas redes sociais.
     *
     * IMPORTANTE:
     * armazenamos sem # porque APIs como Mastodon
     * esperam apenas o nome da hashtag.
     */

    const SUNSET_HASHTAGS = [

        'sunset',

        'pordosol',

        'sunsets',

        'sunsetphotography',

        'sunsetlovers',

        'sunsetsky',

        'goldenhour',

        'atardecer',

        'tramonto',

        'coucherdesoleil'
    ];


    // =========================================================================
    // FUNÇÕES AUXILIARES
    // =========================================================================

    function stripHtml(html) {

        const tmp = document.createElement('div');

        tmp.innerHTML = html;

        return tmp.textContent || tmp.innerText || '';
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


    /*
     * Embaralhamento Fisher-Yates.
     *
     * Melhor do que:
     *
     * array.sort(() => Math.random() - 0.5)
     *
     * porque produz uma distribuição mais consistente.
     */

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


    /*
     * Escolhe determinada quantidade
     * de itens aleatoriamente.
     */

    function pickRandom(array, amount) {

        return shuffleArray(array)
            .slice(
                0,
                Math.min(amount, array.length)
            );
    }


    /*
     * Remove imagens duplicadas.
     *
     * Primeiro tenta comparar ID.
     * Depois URL da imagem.
     */

    function removeDuplicates(images) {

        const ids = new Set();

        const urls = new Set();

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


    /*
     * Algumas APIs podem ocasionalmente
     * devolver URLs sem HTTPS.
     */

    function ensureHttps(url) {

        if (!url) return '';

        if (url.startsWith('//')) {

            return 'https:' + url;
        }

        return url;
    }


    // =========================================================================
    // PROVIDERS
    // =========================================================================

    /*
     * Todas as fontes devolvem o mesmo formato:
     *
     * {
     *   id,
     *   src,
     *   fullSrc,
     *   thumb,
     *   author,
     *   origin,
     *   link,
     *   description,
     *   license,
     *   date
     * }
     */

    const providers = {


        // =====================================================================
        // WIKIMEDIA COMMONS
        // =====================================================================

        wikimedia: {

            name: 'Wikimedia Commons',

            enabled: true,


            async fetch(query, limit = 20) {

                const searchTerms =
                    query || 'sunset landscape';


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


                const res = await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Wikimedia HTTP ${res.status}`
                    );
                }


                const data = await res.json();


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
                         * Evita imagens muito pequenas.
                         */

                        if (
                            info.width &&
                            info.width < 700
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
                                info.descriptionurl || '',


                            description:
                                meta.ImageDescription
                                    ? stripHtml(
                                        meta.ImageDescription.value
                                    )
                                    : (
                                        page.title || ''
                                    ),


                            license:
                                meta.LicenseShortName
                                    ? meta.LicenseShortName.value
                                    : '',


                            date:
                                meta.DateTimeOriginal
                                    ? meta.DateTimeOriginal.value
                                    : ''
                        };
                    });
            }
        },


        // =====================================================================
        // BLUESKY
        // =====================================================================

        /*
         * Utilizamos a API pública do Bluesky.
         *
         * Não existe senha,
         * token ou chave dentro do frontend.
         */

        bluesky: {

            name: 'Bluesky',

            enabled: true,


            async fetch(query, limit = 20) {

                /*
                 * Busca textual.
                 *
                 * Hashtags funcionam como parte
                 * da consulta.
                 */

                const searchQuery =
                    query.startsWith('#')
                        ? query
                        : `#${query}`;


                const url =
                    'https://public.api.bsky.app'
                    + '/xrpc/app.bsky.feed.searchPosts'
                    + `?q=${encodeURIComponent(searchQuery)}`
                    + `&limit=${Math.min(limit, 25)}`
                    + '&sort=latest';


                const res = await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Bluesky HTTP ${res.status}`
                    );
                }


                const data = await res.json();


                if (
                    !data ||
                    !Array.isArray(data.posts)
                ) {

                    return [];
                }


                const images = [];


                data.posts.forEach(post => {

                    /*
                     * Posts do Bluesky podem ter diferentes
                     * tipos de embed.
                     *
                     * Aqui nos interessam apenas
                     * aqueles que contêm imagens.
                     */

                    const embed =
                        post.embed || {};


                    let postImages = [];


                    /*
                     * app.bsky.embed.images#view
                     */

                    if (
                        Array.isArray(embed.images)
                    ) {

                        postImages =
                            embed.images;
                    }


                    /*
                     * Alguns embeds podem aparecer
                     * dentro de media.
                     */

                    if (
                        postImages.length === 0 &&
                        embed.media &&
                        Array.isArray(embed.media.images)
                    ) {

                        postImages =
                            embed.media.images;
                    }


                    /*
                     * Construção do link público.
                     */

                    let postLink = '';


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


                            images.push({

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
                                            post.author
                                                .displayName
                                            ||
                                            post.author
                                                .handle
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
                                    (
                                        post.record &&
                                        post.record.text
                                    )
                                    ||
                                    '',


                                license:
                                    '',


                                date:
                                    post.indexedAt ||
                                    (
                                        post.record &&
                                        post.record.createdAt
                                    )
                                    ||
                                    ''
                            });
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

            name: 'Mastodon',

            enabled: true,


            /*
             * Podemos futuramente adicionar
             * mais instâncias.
             */

            instances: [

                'https://mastodon.social',

                'https://mstdn.social',

                'https://mas.to'
            ],


            async fetch(hashtag, limit = 20) {

                /*
                 * Escolhe uma instância diferente
                 * a cada chamada.
                 */

                const instance =
                    this.instances[
                        Math.floor(
                            Math.random() *
                            this.instances.length
                        )
                    ];


                /*
                 * Mastodon espera hashtag sem #.
                 */

                const cleanTag =
                    hashtag.replace('#', '');


                const url =
                    `${instance}`
                    + `/api/v1/timelines/tag/`
                    + `${encodeURIComponent(cleanTag)}`
                    + `?limit=${Math.min(limit, 40)}`
                    + '&only_media=true';


                const res = await fetch(url);


                if (!res.ok) {

                    throw new Error(
                        `Mastodon ${instance} HTTP ${res.status}`
                    );
                }


                const statuses =
                    await res.json();


                if (
                    !Array.isArray(statuses)
                ) {

                    return [];
                }


                const images = [];


                statuses.forEach(status => {

                    /*
                     * Ignoramos boosts duplicados
                     * usando o status original quando houver.
                     */

                    const sourceStatus =
                        status.reblog ||
                        status;


                    const attachments =
                        sourceStatus.media_attachments ||
                        [];


                    attachments.forEach(
                        (media, index) => {

                            /*
                             * Queremos somente imagens.
                             */

                            if (
                                media.type !== 'image'
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


                            images.push({

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
                                    media.description ||
                                    stripHtml(
                                        sourceStatus.content ||
                                        ''
                                    ),


                                license:
                                    '',


                                date:
                                    sourceStatus.created_at ||
                                    ''
                            });
                        }
                    );
                });


                return images;
            }
        },


        // =====================================================================
        // FLICKR
        // =====================================================================

        /*
         * Continua preparado.
         *
         * Não ativamos porque exigiria colocar
         * uma API key.
         *
         * Não devemos publicar uma chave privada
         * diretamente neste JavaScript.
         */

        flickr: {

            name: 'Flickr',

            enabled: false,

            apiKey: '',


            async fetch(query, limit) {

                if (!this.apiKey) {
                    return [];
                }


                const url =
                    'https://api.flickr.com/services/rest/'
                    + '?method=flickr.photos.search'
                    + `&api_key=${this.apiKey}`
                    + `&text=${encodeURIComponent(query || 'sunset')}`
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


                        license:
                            p.license || '',


                        date:
                            p.datetaken || ''
                    }));
            }
        },


        // =====================================================================
        // INSTAGRAM
        // =====================================================================

        instagram: {

            name: 'Instagram',

            enabled: false,

            async fetch() {

                /*
                 * Mantido desativado.
                 *
                 * Instagram exige infraestrutura
                 * e autenticação apropriadas.
                 *
                 * Nunca colocar access token permanente
                 * diretamente em JavaScript público.
                 */

                return [];
            }
        },


        // =====================================================================
        // TIKTOK
        // =====================================================================

        tiktok: {

            name: 'TikTok',

            enabled: false,

            async fetch() {

                /*
                 * Mantido preparado para futura
                 * integração via backend.
                 */

                return [];
            }
        }
    };


    // =========================================================================
    // CARREGAMENTO DAS IMAGENS
    // =========================================================================

    async function loadImages() {

        let allImages = [];


        /*
         * A cada visita escolhemos
         * três buscas diferentes para Wikimedia.
         */

        const selectedQueries =
            pickRandom(
                SUNSET_QUERIES,
                3
            );


        /*
         * Também sorteamos hashtags diferentes
         * para as redes sociais.
         */

        const selectedHashtags =
            pickRandom(
                SUNSET_HASHTAGS,
                4
            );


        console.log(
            '[Paisagens Perdidas] Buscas desta sessão:',
            selectedQueries
        );


        console.log(
            '[Paisagens Perdidas] Hashtags desta sessão:',
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
                            12
                        );


                    allImages =
                        allImages.concat(images);

                } catch (err) {

                    console.warn(
                        '[Wikimedia] Erro:',
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
                            15
                        );


                    allImages =
                        allImages.concat(images);

                } catch (err) {

                    console.warn(
                        `[Bluesky #${hashtag}] Erro:`,
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

            /*
             * Usamos três das hashtags sorteadas
             * para não gerar chamadas demais.
             */

            for (
                const hashtag
                of selectedHashtags.slice(0, 3)
            ) {

                try {

                    const images =
                        await providers.mastodon.fetch(
                            hashtag,
                            20
                        );


                    allImages =
                        allImages.concat(images);

                } catch (err) {

                    /*
                     * Mastodon é federado.
                     *
                     * Uma instância pode temporariamente
                     * bloquear preview público.
                     *
                     * Isso NÃO deve quebrar a obra.
                     */

                    console.warn(
                        `[Mastodon #${hashtag}] Erro:`,
                        err
                    );
                }
            }
        }


        // =====================================================================
        // LIMPEZA
        // =====================================================================

        /*
         * Remove URLs repetidas.
         */

        allImages =
            removeDuplicates(
                allImages
            );


        /*
         * Mistura redes e fontes.
         */

        allImages =
            shuffleArray(
                allImages
            );


        /*
         * Limita o tamanho final.
         */

        allImages =
            allImages.slice(
                0,
                MAX_FINAL_IMAGES
            );


        /*
         * Segurança:
         *
         * Wikimedia normalmente garante que
         * ainda haverá conteúdo caso alguma
         * rede social falhe.
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


        console.log(
            `[Paisagens Perdidas] ${allImages.length} imagens carregadas.`
        );


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
                `Pôr do sol — ${img.origin}`;


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
             * Se uma imagem externa falhar,
             * removemos somente aquele card.
             *
             * O restante da timeline continua.
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

    /*
     * Mantemos a lógica nova:
     *
     * - camada preta única;
     * - sem cards individualmente cinzas;
     * - final muito mais cedo.
     */

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

            ticking = false;

            return;
        }


        /*
         * 0 = começo
         * 1 = fim
         */

        const scrollFraction =
            clamp01(
                window.scrollY /
                maxScroll
            );


        // =====================================================================
        // ESCURECIMENTO
        // =====================================================================

        /*
         * Tela totalmente preta
         * em aproximadamente 68%.
         */

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
        // FRASES FINAIS
        // =====================================================================

        /*
         * A sequência começa aproximadamente
         * em 72% da rolagem.
         */

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


                window
                    .requestAnimationFrame(
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

        /*
         * Preto absoluto.
         */

        document.documentElement
            .style
            .setProperty(
                '--darkness',
                '1'
            );


        /*
         * Exibe imediatamente
         * o fundo final.
         */

        endSequence.style.display =
            'flex';


        /*
         * PRIMEIRA FRASE
         */

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


        /*
         * Sai depois de 3,2 segundos.
         */

        setTimeout(
            () => {

                endText1.style.opacity =
                    '0';

            },
            3200
        );


        /*
         * FRASE FINAL
         */

        setTimeout(
            () => {

                endText2.style.opacity =
                    '1';

            },
            4100
        );
    }


    // =========================================================================
    // REDIMENSIONAMENTO
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

    /*
     * A cada recarregamento:
     *
     * 1. novas buscas são sorteadas;
     * 2. novas hashtags são escolhidas;
     * 3. APIs são consultadas novamente;
     * 4. imagens são misturadas;
     * 5. a timeline é reconstruída.
     */

    loadImages();


    updateScroll();

});
