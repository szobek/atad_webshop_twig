let root = document.documentElement;
let scrollPosition = 0;
let dropdownData = {};

function findFocusables(el, { included_tabindex_minus_1 = false, requiredClass = '', excluded_class = '' } = {}) {
    if (!el) return [];

    const baseSelectors = [
        'button:not(:disabled)',
        '[href]',
        'input:not(:disabled)',
        'select:not(:disabled)',
        'textarea:not(:disabled)',
        'div[role="button"]',
        '[tabindex]'
    ];

    const selectors = baseSelectors.map(sel => {
        let fullSelector = included_tabindex_minus_1 ? sel : `${sel}:not([tabindex="-1"])`;

        if (requiredClass) {
            fullSelector += `.${requiredClass}`;
        }

        if (excluded_class) {
            fullSelector += `:not(.${excluded_class})`;
        }

        return fullSelector;
    });

    return [...el.querySelectorAll(selectors.join(','))]
        .filter(el => el.offsetParent !== null);
}

function createFocusExitHandler(popoverPanel, popoverButton, focusables) {
    return function (e) {
        if (e.key === "Tab") {
            if (!e.shiftKey) {
                const last = focusables[focusables.length - 1];

                if (document.activeElement === last) {

                    let next = popoverButton.nextElementSibling;
                    while (next && typeof next.focus !== "function") {
                        next = next.nextElementSibling;
                    }
                    if (next) { /* van testvére ami fókuszálható (következő dom elem) */
                        e.preventDefault(); /* mi szeretnénk a fókuszt a következő elemre tenni */
                        handleCloseDropdowns();
                        next.focus();
                    } else {
                        /* nincs testvére ami fókuszálható, nincs preventDefault sem, így a következő elemre ugrik a fókusz */
                        handleCloseDropdowns(false,true);
                    }
                }
            } else {
                const first = focusables[0];
                if (document.activeElement === first) {
                    e.preventDefault();
                    handleCloseDropdowns(false,true);
                }
            }
        } else if (e.key === "Escape") {
            handleCloseDropdowns(false,true);
        }
    };
}

function scrollLock(lock) {
    let $body = document.body;

    if ( lock && !$body.classList.contains('scroll-lock') ) {
        scrollPosition = window.pageYOffset;
        $body.style.overflow = 'hidden';
        $body.style.position = 'fixed';
        $body.style.top = `-${scrollPosition}px`;
        $body.style.width = '100%';
        root.style.scrollBehavior = 'auto';
        $body.style.scrollBehavior = 'auto';
        $body.classList.add("scroll-lock");
    }
    if ( !lock && $body.classList.contains('scroll-lock') ) {
        $body.style.removeProperty('overflow');
        $body.style.removeProperty('position');
        $body.style.removeProperty('top');
        $body.style.removeProperty('width');
        $body.classList.remove("scroll-lock");
        window.scrollTo(0, scrollPosition);
        $body.style.scrollBehavior = '';
        root.style.scrollBehavior = '';
    }
}

function debounce(func, wait=500, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }, wait);
        if (immediate && !timeout) func.apply(context, args);
    };
}
function throttle(callback, delay=300) {
    var timeoutHandler = null;
    return function () {
        if (timeoutHandler == null) {
            timeoutHandler = setTimeout(function () {
                callback();
                timeoutHandler = null;
            }, delay);
        }
    }
}
function closeNanobar(e, name, type, cssVar) {
    var $target = $(e).closest('.js-nanobar');
    $target.stop().animate({
        height: "0px"
    }, 500, function() {
        $target.remove();
        set_front_var(name,1,type);
        $(window).trigger('resize');
        if ( cssVar != "undefined" || cssVar != "" ) root.style.setProperty(cssVar, "0px");
    });
}
function getContrastYIQ(hexcolor){
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'light' : 'dark';
}
function getHeight(el) {
    if (el.length > 0) {
        return el.outerHeight();
    } else {
        return 0;
    }
}
function handleCloseDropdownCat(force_close=false, options = {}) {
    const { element, handler, reason } = options;
    let thisNavLink = $('.nav-link--products');
    let thisNavItem = thisNavLink.parent();
    let thisDropdownMenu = thisNavItem.find('.dropdown-menu').first();

    $('html').removeClass('products-dropdown-opened cat-megasubmenu-opened');
    $('#dropdown-cat').removeClass('has-opened');

    if (force_close) {
        thisNavLink.attr('aria-expanded', 'false');
        thisNavItem.removeClass('show force-show always-opened');
        thisDropdownMenu.removeClass('show');
    } else {
        if ( !thisNavItem.hasClass('always-opened') ) {
            thisDropdownMenu.removeClass('show');
        }
        thisNavLink.attr('aria-expanded', 'false');
        thisNavItem.not('.always-opened').removeClass('show');
        if ( !thisNavItem.hasClass('force-show') ) {
            thisNavItem = $("#dropdown-cat").find('.nav-item:not(.always-opened).show');
            thisNavLink = thisNavItem.children('.nav-link');
            thisDropdownMenu = thisNavItem.find('.dropdown-menu').first();

            thisNavLink.attr('aria-expanded', 'false');
            thisNavItem.removeClass('show');
            thisDropdownMenu.removeClass('show');
        } else {
            thisNavItem.removeClass('force-show');
        }
    }

    if (reason && reason === 'escape') {
        element.off('keydown', handler);
        element.removeData('keydownHandler');
    }
}
function handleOpenDropdownCat() {
    let thisNavLink = $('.nav-link--products');
    let thisNavItem = thisNavLink.parent();
    let thisDropdownMenu = thisNavItem.find('.dropdown-menu').first();

    thisNavLink.attr('aria-expanded','true');
    thisNavItem.addClass('show always-opened');
    thisDropdownMenu.addClass('show');
}
function handleCloseDropdowns(maskNotClose,focus,options = {}) {
    const { element, handler, reason } = options;
    if ( dropdownData.activeBtn !== undefined && dropdownData.activeBtn != "" ) {
        dropdownData.activeBtn.removeClass('is-active').attr('aria-expanded',false);
        dropdownData.activeDropdown.removeClass('is-active');
        if ( dropdownData.activeBtn.hasClass('search-box__dropdown-btn') && dropdownData.activeDropdown.find('.js-search').hasClass('search-smart-enabled') ) {
            $(document).trigger('smartSearchClose');
        }
        if (focus) {
            dropdownData.activeBtn.focus();
        }
        dropdownData.activeDropdown.off('keydown');
        dropdownData.activeBtn = '';
        dropdownData.activeDropdown = '';
        $('html').removeClass('dropdown-opened products-dropdown-opened');
    }
    if (!maskNotClose) {
        $.mask.close();
    }
    if (reason && reason === 'escape') {
        element.off('keydown', handler);
        element.removeData('keydownHandler');
    }
}
function handleCloseMenuDropdowns(options = {}) {
    const { element, handler, reason } = options;
    const opened_menu = $('#nav--menu').find('.nav-item.show');

    if (reason && reason === 'escape') {
        element.off('keydown', handler);
        element.removeData('keydownHandler');
        opened_menu.first().find('.nav-link').focus();
    }
    opened_menu.find('.nav-link').attr('aria-expanded', 'false');
    opened_menu.find('.dropdown-menu').removeClass('show');
    opened_menu.removeClass('show');
}
function getHeaderHeight() { /* ne töröld! shop_common hivatkozás van rá */
    let $header = $('.js-header-inner:visible:first');
    return $header.outerHeight();
}

/* Business logic to handle hover behaviour on one product element */
function altPicHover() {
    let item = $(this);

    /* Get the main image */
    let mainPic = item.find(".js-main-img");
    let mainPicSrc = mainPic.attr("data-src-orig");
    let mainPicSrcSet = mainPic.attr("data-srcset-orig");
    if (mainPicSrcSet==undefined) mainPicSrcSet="";

    /* Get the alt image wrappers */
    let altPics = item.find(".js-alt-img-wrap");

    /* Business logic to handle swapping of the main img and one alt img */
    function handleSwap() {
        let $this = $(this);

        /* Function to swap images */
        function swapImages() {
            let currentAltPicSrc = $this.find("img").attr("data-src-orig");
            mainPic.attr("src", currentAltPicSrc);

            let currentAltPicSrcSet = $this.find("img").attr("data-srcset-orig");
            if (currentAltPicSrcSet === undefined) currentAltPicSrcSet = "";
            mainPic.attr("srcset", currentAltPicSrcSet);
        }

        /* When hovering over the alt img swap it with the main img */
        $this.mouseover(swapImages);

        /* Handle focus event */
        $this.focus(swapImages);

        /* Handle blur event */
        $this.blur(function() {
            mainPic.attr("src", mainPicSrc);
            mainPic.attr("srcset", mainPicSrcSet);
        });
    }

    item.find('.js-alt-images').mouseleave(function() {
        mainPic.attr("src", mainPicSrc);
        mainPic.attr("srcset", mainPicSrcSet);
    });

    /* Call the handleSwap fn on all alt imgs */
    altPics.each(handleSwap);
}

/* CHECK SEARCH INPUT CONTENT  */
function checkForInput(element) {
    let thisEl = $(element);
    let tmpval = thisEl.val();
    thisEl.toggleClass('not-empty', tmpval.length >= 1);
    thisEl.toggleClass('search-enable', tmpval.length >= 3);
}

function getScrollTop() {
    return $(window).scrollTop();
}

function getWindowWidth() {
    return $(window).width();
}

function getVisibleDistanceTillHeaderBottom() {
    let $header = $('.js-header-inner:visible:first');
    let $headerTop = $header.offset().top - $(window).scrollTop();
    let visibleDistanceTillHeaderBottom = getHeight($header) + $headerTop;
    return visibleDistanceTillHeaderBottom;
}
let $headerHeight = 0;
let $headerFixedHeight = 60;
let $headerShrinkedOffset = 50;
let $headerVisibleOffset = 200;

$(function() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', "".concat(vh, "px"));
    window.addEventListener('resize', function () {
        vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', "".concat(vh, "px"));
    });

    let $body = document.body;
    /* back to top */
    const scrollTopEl = $('button.back_to_top');
    function showBackToTop(offset = 500, fadeDuration = 300) {
        if ($(window).scrollTop() > offset) {
            scrollTopEl.stop().fadeIn(fadeDuration);
        } else {
            scrollTopEl.stop().fadeOut(fadeDuration);
        }
    }
    scrollTopEl.on('click', function(e) {
        e.preventDefault();
        $('html, body').animate({scrollTop: 0}, 0);
        return false;
    });
    $(window).on('scroll', throttle(function () {
        showBackToTop();
    }, 500));

    if (window.innerWidth > $body.clientWidth) {
        let scrollbar_width = window.innerWidth - $body.clientWidth > 10 ? 10 : 10;
        root.style.setProperty('--scrollbar-width', scrollbar_width + "px");
    }
    
    initTippy();

    let $header = $('.js-header:visible:first');
    let $headerInner = $('.js-header-inner:visible:first');
    const $slideshow = $('.js-slideshow');

    $headerHeight = getHeight($headerInner);
    root.style.setProperty('--header-height', $headerHeight + "px");
    let $slideshowHeight = getHeight($slideshow);
    let $headerOffsetTop = $header.length ? $header.offset().top : 0;

    if ( !$header.hasClass('nav--bottom') ) {
    $header.css('height', $headerHeight + 'px');
    }

    if ( $header.hasClass('js-header-fixed') ) {

        function headerFixHandle(scrollTop) {
            /*START OLDAL ÉS VAN SLIDESHOW */
            if ($('body#ud_shop_start').length > 0 && $slideshowHeight !== 0 ) {
                if ( scrollTop >= $headerOffsetTop + $headerHeight + $slideshowHeight + $headerShrinkedOffset ) {
                    $header.addClass('is-fixed is-shrinked');
                    $('html').addClass('header-is-fixed header-is-shrinked');

                    if ( scrollTop >= $headerOffsetTop + $headerHeight + $slideshowHeight + $headerVisibleOffset ) {
                        $header.addClass('is-visible');
                        $('html').addClass('header-is-visible');
                    } else {
                        $header.removeClass('is-visible');
                        $('html').removeClass('header-is-visible');
                    }

                    if (root.style.getPropertyValue('--header-height--small') == "" ) {
                        $headerFixedHeight = getHeight($headerInner);
                        root.style.setProperty('--header-height--small', $headerFixedHeight + "px");
                    }

                    handleCloseDropdownCat(true);
                    $('html').removeClass('cat-megasubmenu-opened');
                    $('#dropdown-cat').removeClass('has-opened');
                    $('.js-navbar-nav').find('.nav-item.show').not('.nav-item--products').removeClass('show');
                    $('.js-navbar-nav').find('.nav-link').not('.nav-link--products').attr('aria-expanded', 'false');
                    $('.dropdown-menu.show').removeClass('show');
                } else {
                    $header.removeClass('is-shrinked is-fixed');
                    $('html').removeClass('header-is-shrinked header-is-fixed');
                    handleOpenDropdownCat();
                }
            } else {
                if ( scrollTop >= $headerOffsetTop + $headerHeight + $headerShrinkedOffset ) {
                    $header.addClass('is-fixed is-shrinked');
                    $('html').addClass('header-is-fixed header-is-shrinked');

                    if ( scrollTop >= $headerOffsetTop + $headerHeight + $headerVisibleOffset ) {
                        $header.addClass('is-visible');
                        $('html').addClass('header-is-visible');
                    } else {
                        $header.removeClass('is-visible');
                        $('html').removeClass('header-is-visible');
                    }

                    if (root.style.getPropertyValue('--header-height--small') == "" ) {
                        $headerFixedHeight = getHeight($headerInner);
                        root.style.setProperty('--header-height--small', $headerFixedHeight + "px");
                    }

                    handleCloseDropdownCat();
                    $('html').removeClass('cat-megasubmenu-opened');
                    $('#dropdown-cat').removeClass('has-opened');
                    $('.js-navbar-nav').find('.nav-item.show').not('.nav-item--products').removeClass('show');
                    $('.js-navbar-nav').find('.nav-link').not('.nav-link--products').attr('aria-expanded', 'false');
                    $('.dropdown-menu.show').removeClass('show');
                } else {
                    $header.removeClass('is-shrinked is-fixed');
                    $('html').removeClass('header-is-shrinked header-is-fixed');
                }
            }
        }
        headerFixHandle($(this).scrollTop());


        function hasScrolled() {
            let scrollTop = $(this).scrollTop();

            if (window.matchMedia('(min-width: 576px)').matches) {
                if ($('.dropdown__content').not('.filter-dropdown').hasClass('is-active')) {
                    handleCloseDropdowns();
                }
                if ($('#nav--menu').find('.nav-item').hasClass('show')) {
                    handleCloseMenuDropdowns();
                }
            }
            headerFixHandle(scrollTop);
        }

        /*** SCROLL DOWN ***/
        $(window).on('scroll', throttle(function () {
            if ( !$('body').hasClass('scroll-lock') ) {
                hasScrolled(this);
            }
        }, 150));

    }

    $(window).on('resize', debounce(function () {
        $header = $('.js-header:visible:first');
        $headerInner = $('.js-header-inner:visible:first');
        $headerOffsetTop = $header.offset().top;
        $headerHeight = getHeight($headerInner);
        $header.css('height', $headerHeight + 'px');
        $slideshowHeight = getHeight($slideshow);
        root.style.setProperty('--header-height', $headerHeight + "px");
        if ($('.js-nanobar').length > 0 ) {
            root.style.setProperty('--nanobar-height', getHeight($('.js-nanobar')) + "px");
        }
    }, 500));

    $('button.dropdown__btn').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        let thisBtn = this;
        let $thisBtn = $(this);
        let thisBtnFor = $thisBtn.data("btn-for");
        let $thisDropdown = $(thisBtnFor);
        if ( $thisDropdown.length ) {
            let $thisDropdownCaret = $thisDropdown.find('.dropdown__caret');

            /* has stored active dropdown and same with this */
            if ( dropdownData.activeBtn !== undefined && dropdownData.activeBtn != "" && dropdownData.activeBtn.is($thisBtn) ) {
                handleCloseDropdowns();
                $('html').removeClass('dropdown-opened products-dropdown-opened');
                if (window.matchMedia('(min-width: 1200px)').matches) {
                    $.mask.close();
                }
                if (window.matchMedia('(max-width: 575.8px)').matches) {
                    scrollLock(false);
                }
            } else {
                /* close active dropdown */
                handleCloseDropdowns();
                handleCloseDropdownCat();
                handleCloseMenuDropdowns();

                /* find all the buttons that handle filter dropdown (sticky, inline, bar, nav) */
                if ( thisBtnFor == "#filter-dropdown" ) {
                    $thisBtn = $('button.dropdown__btn[data-btn-for="' + thisBtnFor + '"]');
                }
                dropdownData.activeBtn = $thisBtn;
                dropdownData.activeDropdown = $thisDropdown;
                $thisBtn.addClass('is-active').attr('aria-expanded',true);
                $thisDropdown.addClass('is-active');

                if ( !$thisBtn.is('.js-cart-box-loaded-by-ajax') || $thisBtn.is('.js-cart-box-loaded-by-ajax.is-loaded') ) {
                    const focusables = findFocusables($thisDropdown[0]);

                    if (focusables.length > 0) {
                        const focusExitHandler = createFocusExitHandler($thisDropdown[0], $thisBtn[0], focusables);
                        $thisDropdown.on("keydown", focusExitHandler);
                        focusables[0].focus();
                    }
                }
                if ($thisBtn.hasClass('hamburger-box__dropdown-btn')) {
                    $('html').addClass('products-dropdown-opened');
                }
                if ( $thisBtn.hasClass('hamburger-box__dropdown-btn-mobile') && !thisBtn.hasAttribute("data-calculated-height") ) {
                    let element = $($thisBtn.attr('data-btn-for')).find(".hamburger-box__dropdown-nav-lists-wrapper");
                    let elementHeight = element.outerHeight(true);
                    let totalHeight = 0;

                    element.children().each(function(){
                        totalHeight = totalHeight + $(this).outerHeight(true);
                    });
                    if ( totalHeight > elementHeight) {
                        element.addClass('has-scrollbar');
                    }
                    $thisBtn.attr("data-calculated-height", totalHeight);
                }

                if (window.matchMedia('(max-width: 575.8px)').matches) {
                    scrollLock(true);

                    requestAnimationFrame(function() {
                        if ( $("#container").hasClass('nav-position-top') ) {
                            dropdownData.headerBottomOffset =  $headerInner.offset().top + $headerHeight;

                            if ( $('html').hasClass('header-is-fixed') ) {
                                dropdownData.headerBottomOffset = $headerHeight;
                            }
                            root.style.setProperty("--header-bottom-offset", dropdownData.headerBottomOffset + "px");
                            $thisDropdown.css({
                                top: dropdownData.headerBottomOffset + 'px'
                            });
                        } else if ( $("#container").hasClass('nav-position-bottom') ) {
                            $thisDropdown.css({
                                bottom: getHeaderHeight() + 'px',
                                left: dropdownData.right + 'px'
                            });
                        }
                        if ($thisBtn.hasClass('search-box__dropdown-btn')) {
                            let $searchInput = $('.search-box__input');
                            if ($searchInput.prop('readonly')==true) {
                                $searchInput.blur();
                                $searchInput.prop('readonly', false);
                            }
                            $searchInput.focus();
                        }
                    });
                }

                if (window.matchMedia('(min-width: 576px)').matches) {
                    requestAnimationFrame(function() {
                        const thisBtnBounds = thisBtn.getBoundingClientRect();
                        dropdownData.width = thisBtnBounds.width;
                        dropdownData.height = thisBtnBounds.height;
                        dropdownData.left = thisBtnBounds.left;
                        dropdownData.right = thisBtnBounds.right;
                        dropdownData.top =  thisBtnBounds.top;
                        dropdownData.bottom =  thisBtnBounds.bottom;

                        if ($thisDropdown.attr('data-content-direction') === "right" ) {
                            $thisDropdown.css({
                                top: dropdownData.bottom + 'px',
                                left: dropdownData.right + 'px'
                            });
                        } else {
                            $thisDropdown.css({
                                top: dropdownData.bottom + 'px',
                                left: dropdownData.left + 'px'
                            });
                        }
                        if ($thisBtn.hasClass('search-box__dropdown-btn')) {
                            $thisDropdownCaret.css({
                                left: dropdownData.left + dropdownData.width / 2 + 'px'
                            });
                        } else {
                            if ($thisDropdown.attr('data-content-direction') === "right" ) {
                                $thisDropdownCaret.css({
                                    right: dropdownData.width / 2 + 'px'
                                });
                            } else {
                                $thisDropdownCaret.css({
                                    left: dropdownData.width / 2 + 'px'
                                });
                            }
                        }
                        root.style.setProperty("--dropdown-btn-bottom-distance", dropdownData.bottom + "px");
                        if ($thisBtn.hasClass('search-box__dropdown-btn')) {
                            $('.search-box__input').focus();
                        }
                        if ($thisBtn.hasClass('cart-box__dropdown-btn') && !$thisBtn.hasClass("js-cart-box-loaded-by-ajax")) {
                            let cartBoxFreeShippingEl = $(".js-cart-box-free-shipping", $thisDropdown);
                            let cartBoxHeaderEl = $(".js-cart-box-title", $thisDropdown);
                            let cartBoxSumEl = $(".js-cart-box-sum", $thisDropdown);
                            let cartBoxBtnsEl = $(".js-cart-box-btns", $thisDropdown);

                            if (cartBoxFreeShippingEl.length > 0 && cartBoxFreeShippingEl.css('display') != 'none') {
                                root.style.setProperty("--cart-box-free-shipping-height", cartBoxFreeShippingEl.outerHeight(true) + "px");
                            }
                            if (cartBoxHeaderEl.length > 0 && cartBoxHeaderEl.css('display') != 'none') {
                                root.style.setProperty("--cart-box-header-height", cartBoxHeaderEl.outerHeight(true) + "px");
                            }
                            if (cartBoxSumEl.length > 0 ) {
                                root.style.setProperty("--cart-box-sum", cartBoxSumEl.outerHeight(true) + "px");
                            }
                            if (cartBoxBtnsEl.length > 0 ) {
                                root.style.setProperty("--cart-box-btns", cartBoxBtnsEl.outerHeight(true) + "px");
                            }
                        }
                    });
                }
                $('html').addClass('dropdown-opened');
            }
        }
    });

    /* CHECK SEARCH INPUT CONTENT  */
    $('input.search-box__input').on('input blur', function() {
        checkForInput(this);
    });
    /* REMOVE is-active CLASS FROM DROPDOWN WHEN CLICKED OUTSIDE */

    $(document).on('click', function(e) {
        if ( dropdownData.activeBtn !== undefined && dropdownData.activeBtn != "" && !$(e.target).closest(dropdownData.activeDropdown).length ) {
            handleCloseDropdowns();
            if ( $('body').hasClass('scroll-lock') ) {
                scrollLock(false);
            }
        }

/*        if ( $('html').hasClass('cat-megasubmenu-opened') && !$(e.target).closest('.megasubmenu.show').length ) {
            let activeMegasubmenu =  $('.megasubmenu.show');
            let activeNavitem = activeMegasubmenu.closest('.nav-item.show');
            let activeNavlink = activeNavitem.children('.nav-link');

            activeNavlink.attr('aria-expanded','false');
            activeNavitem.removeClass('show');
            activeMegasubmenu.removeClass('show');
            $('html').removeClass('cat-megasubmenu-opened');
            $('#dropdown-cat').removeClass('has-opened');
        }*/

        if ( variantsHandle.activeToggleBtn !== undefined && variantsHandle.activeToggleBtn != "" && !$(e.target).closest(variantsHandle.activeDropdown).length && !$(e.target).closest(variantsHandle.activeCartBtn).length && !variantsHandle.activeToggleBtn.is($(e.target)) ) {
            variantsHandle.activeDropdown.removeClass('show');
            variantsHandle.activeProduct.removeClass('is-variants-opened');
            variantsHandle.activeToggleBtn.attr('aria-expanded','false').removeClass('active');
        }


        /*
        if ($('.dropdown__content').hasClass('is-active')) {
            if (!$(e.target).closest('.dropdown__btn').length && !$(e.target).closest('.dropdown__content').length && !$(e.target).hasClass('js-remove-slider-filter')) {
                handleCloseDropdowns();
                scrollLock(false);
            }
        }*/
        if ($('.dropdown-menu').hasClass('show')) {
            if (!$(e.target).closest('.nav-item').length && !$(e.target).closest('.dropdown-menu').length) {
                handleCloseMenuDropdowns();
                handleCloseDropdownCat();
                $('#dropdown-cat').removeClass('has-opened');
            }
        }
    });


    $('.dropdown__content').on('click','button.dropdown__btn-close', function() {
        handleCloseDropdowns(false,true);
        if (window.matchMedia('(max-width: 575.8px)').matches) {
            scrollLock(false);
        }
    });

    /* DATA SCROLL DOWN */

    $(document).on('click', '.js-scroll-to-btn', function(e) {
        e.preventDefault();
        /* it had to be turned off because it caused a delay in scrolling */
        root.style.scrollBehavior = 'auto';

        let $this = $(this);
        let $offset = 10;
        if ($this.data('offset') !== undefined) $offset = $this.data('offset');
        let $scrollTo = $this.data('scroll');
        let $thisClickTab = $this.data('click-tab');
        let $thisClickTabEl = $($thisClickTab);
        let $thisClickAcc = $this.data('click-acc');
        let $thisClickAccEl = $($thisClickAcc);
        let $thisScrollTab = $this.data('scroll-tab');
        let $thisScrollAcc = $this.data('scroll-acc');
        let $thisOffsetTab = $this.data('offset-tab');
        let $thisOffsetAcc = $this.data('offset-acc');

        if ( $("#container").hasClass('header-will-fixed') ) {
            let temp_header_height = 0;

            if (window.matchMedia('(min-width: 576px)').matches) {
                if ($headerFixedHeight) {
                    temp_header_height = $headerFixedHeight;
                } else {
                    temp_header_height = $headerHeight;
                }
            } else {
                if ( $("#container").hasClass('nav-position-top') ) {
                    temp_header_height = $headerHeight;
                }
            }
            $offset += temp_header_height;
        }

        if (window.matchMedia('(min-width: 768px)').matches) {
            if ($thisScrollTab !== undefined && $($thisScrollTab).length > 0) {
                $scrollTo = $thisScrollTab;
            }

            if ($thisClickTabEl?.length && !$thisClickTabEl.hasClass('active')) {
                $thisClickTabEl.trigger('click');
                setTimeout(() => { $thisClickTabEl.focus(); }, 0);
            }

            if ($thisOffsetTab !== undefined && $.isNumeric($thisOffsetTab) ) {
                $offset += $thisOffsetTab;
            }
            $('html,body').animate(
                {scrollTop: $($scrollTo).offset().top - $offset},
                'slow',
                function () {
                    root.style.scrollBehavior = '';
                }
            );
        }
        if (window.matchMedia('(max-width: 767.8px)').matches) {
            let no_scroll = false;
            if ($thisScrollAcc !== undefined && $($thisScrollAcc).length > 0) {
                $scrollTo = $thisScrollAcc;
            }
            if ($thisOffsetAcc !== undefined && $.isNumeric($thisOffsetAcc) ) {
                $offset += $thisOffsetAcc;
            }

            if ($thisClickAccEl?.length && !$thisClickAccEl.hasClass('active')) {
                $thisClickAccEl.trigger('click');
                no_scroll = true;
                setTimeout(() => { $thisClickAccEl.focus(); }, 0);
            }

            if ( no_scroll == false ) {
                setTimeout(function (){
                    $('html,body').animate(
                        {scrollTop: $($scrollTo).offset().top - $offset},
                        'slow',
                        function () {
                            root.style.scrollBehavior = '';
                        }
                    );
                }, 300);
            }
        }
    });
});

let headerCorrection =  function(from, to) {
    let correction = 10;
    let $slideshowHeight = getHeight($('.js-slideshow'));
    let headerOffsetTop = $(".header--desktop").offset().top;

    if ($("#nav--mobile-top").length && window.matchMedia('(max-width: 575.98px)').matches) {
        headerOffsetTop = $("#nav--mobile-top").offset().top;
    }

    if (!($("#ud_shop_cart").length || $("#ud_shop_order_mods").length || $("#ud_shop_order_control").length || $("#ud_shop_order_checkout").length || $("#ud_shop_order_track_det").length || $("#ud_shop_order_send").length)) {
        if (to >= $headerHeight + headerOffsetTop + $headerVisibleOffset + $slideshowHeight) {
            correction += $headerHeight;
        }
    }

    return correction;
}

/*** PRODUCT VARIANT CHANGE AND ERROR HANDLING ***/
function changeVariant(el) {
    let $thisSelect = $(el);
    let $thisSelectWrap = $thisSelect.closest('.js-variant-wrap');

    if (!$thisSelect.hasClass('is-selected')) {
        $thisSelect.addClass('is-selected').removeClass('is-invalid');
        $thisSelect.attr('aria-invalid','false');
        $thisSelectWrap.removeClass('has-fault');
    }
    checkVariants(el, true)
}
let $faultInVariants;
function checkVariants(el, onlyCheck) {
    $faultInVariants = false;
    let $thisProduct = $(el).closest('.js-product');
    let $variantSelectWraps = $('.js-variant-wrap', $thisProduct);

    $variantSelectWraps.each( function() {
        let selectWrap = $(this);
        let selectItem = $(selectWrap).find('select');

        if (!selectItem.hasClass('is-selected')) {
            if (!onlyCheck) {
                selectWrap.addClass('has-fault');
                selectItem.attr('aria-invalid', 'true').addClass('is-invalid');
                if (!$faultInVariants) {
                    selectItem.focus();
                }
            }
            $faultInVariants = true;
        } else {
            if (!onlyCheck) {
                selectWrap.removeClass('has-fault');
                selectItem.attr('aria-invalid','false').removeClass('is-invalid');
            }
        }
    });
    if (!$faultInVariants) {
        $thisProduct.removeClass('has-unselected-variant');
        $thisProduct.addClass('all-variant-selected');
    } else {
        $thisProduct.addClass('has-unselected-variant');
        $thisProduct.removeClass('all-variant-selected');
    }
}

function inputsErrorHandling(isTooltip) {
    /*check error in spec params inputs*/
    let faultInInputs = 0;
    if (isTooltip === 1) {
        faultInInputs = check_cust_input(null,"tooltip");
    } else {
        faultInInputs = check_cust_input();
    }

    /*check error in variant inputs*/
    let faultInVariant = $faultInVariants;
    /* IS not select onchange fn call (it runs only when clicked on btn), is a text input param, is artdet */
    const faultContainers = [];

    if (faultInInputs === 1 || faultInVariant === true) {
        /* artdet */
        if (isTooltip !== 1) {
            if (faultInVariant === true) {
                faultContainers.push($('#artdet__other:not(.product-tooltip__variant)')[0]);
            }
            if (faultInInputs === 1) {
                faultContainers.push($('#artdet__param-spec--input:not(.product-tooltip__spec-params)')[0]);
            }
        } else { /* product details popup */
            if (faultInVariant === true) {
                faultContainers.push($('#page_PopupContainer_tooltip').find('.js-variants')[0]);
            }
            if (faultInInputs === 1) {
                faultContainers.push($('#page_PopupContainer_tooltip').find('.js-spec-params-input')[0]);
            }
        }

        /* legkorábbi hiba konténer megkeresése */
        const firstContainer = faultContainers.reduce((earliest, current) => {
            if (!earliest) return current;
            return earliest.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING
                ? earliest
                : current;
        }, null);

        /* első konténerhez görgetés ha szükséges, és fókuszálás az első hibás inputra */
        if (firstContainer) {
            if (isTooltip !== 1) {
                let temp_callback = function () {
                    overlay_load("error", lang_text_required_fields_missing);
                }
                if (isInViewport(firstContainer)) {
                    temp_callback();
                } else {
                    scrollToElement({
                        element: firstContainer,
                        callback: temp_callback
                    });
                }
            } else if (!isInViewport(firstContainer)) {
                scrollToElement({
                    element: firstContainer,
                    offset: $headerHeight + 20,
                    scrollIn: '.product-tooltip__data',
                    container: '#page_PopupContainer_tooltip_inner'
                });
            }
        }
    } else {
        let mainBtn;
        if ( isTooltip === 1 ) {
            mainBtn = $('#page_tooltip').find('.js-main-product-cart-btn');
        } else {
            mainBtn = $('#page_artdet_content').find('.js-main-product-cart-btn');
        }
        let cartadd = mainBtn.data("cartadd");
        mainBtn.addClass('loading');
        eval(cartadd);
    }
}
function closeVariantsOverlay(el) {
    function closeThisOverlay(el) {
        let $thisOpenBtn = $(el);
        let $thisProduct = $thisOpenBtn.closest('.js-product');
        let $thisVariants = $thisProduct.find('.js-variants');

        $thisProduct.removeClass('is-variants-opened');
        $thisVariants.removeClass('show');
        $thisProduct.find('.product__variants-btn').attr('aria-expanded', false).focus();
    }

    /* Listák bezárásra és ESC eseményfigyelők törlése */
    if (!variantsHandle.controllers) return;

    variantsHandle.controllers.forEach(controller => {
        if (typeof controller.onKeydown === 'function') {
            closeThisOverlay(controller.openButton);
            document.removeEventListener('keydown', controller.onKeydown);
        }
    });
    variantsHandle.controllers = [];
    window.announceToScreenReader?.('listCollapse', {'label': UNAS.text.product_variants});
}
function closeInputsOverlay(el) {
    let $thisCloseBtn = $(el);
    let $thisProduct = $thisCloseBtn.closest('.js-product');
    let $thisInputs = $thisProduct.find('.js-inputs');
    let $thisToggleBtn = $thisProduct.find('.js-inputs-dropdown-toggle-btn');

    $thisInputs.removeClass('show');
    $thisProduct.removeClass('is-variants-opened');
    $thisToggleBtn.attr('aria-expanded','false').removeClass('active');
}
let lastFocusedElement;
function handleFocusIn(e) {
    lastFocusedElement = e.target;
}
document.addEventListener('focusin', handleFocusIn);

function openVariantsOverlay(el) {
    let $thisOpenBtn = $(el);
    let $thisProduct = $thisOpenBtn.closest('.js-product');
    let $thisVariants = $thisProduct.find('.js-variants');

    let focusableSelectors = [], focusableElements = [];
    let firstEl,lastEl;

    function onKeydown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            closeVariantsOverlay();
            return;
        }
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (lastFocusedElement === $thisOpenBtn[0]) {
                    e.preventDefault();
                    firstEl.focus();
                    return;
                }
                if (document.activeElement === firstEl || lastFocusedElement === $thisVariants[0] ) {
                    e.preventDefault();
                    $thisOpenBtn.focus();
                }
            } else {
                if (lastFocusedElement === $thisOpenBtn[0]) {
                    e.preventDefault();
                    firstEl.focus();
                    return;
                }
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    $thisOpenBtn.focus();
                }
            }
        }
    }

    if( $thisProduct.is('.all-variant-selected.is-variants-opened') || $thisProduct.is('.all-variant-selected.js-variant-type-2') ){
        let cartadd = $thisOpenBtn.data("cartadd");

        closeVariantsOverlay();
        eval(cartadd);
        return;
    }
    if( !$thisProduct.hasClass('is-variants-opened') && !$thisProduct.hasClass('js-variant-type-2') ){
        focusableSelectors = [
            'a[href]', 'button:not([disabled])', 'input:not([disabled])',
            'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
        ];
        focusableElements = Array.from($thisVariants[0].querySelectorAll(focusableSelectors.join(',')))
            .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

        if (focusableElements.length === 0) return;

        firstEl = focusableElements[0];
        lastEl = focusableElements[focusableElements.length - 1];

        $thisVariants.addClass('show').attr('tabindex','-1').focus();
        $thisVariants[0].removeAttribute('tabindex');
        $thisProduct.addClass('is-variants-opened');
        $thisOpenBtn.attr('aria-expanded',true);
        window.announceToScreenReader?.('listExpand', {'label': UNAS.text.product_variants});
        document.addEventListener('keydown', onKeydown);
        variantsHandle.controllers.push({
            openButton: $thisOpenBtn[0],
            onKeydown: onKeydown
        });
    }else{
        checkVariants(el);
    }
}
let variantsHandle = { controllers: [] };

function openInputsOverlay(el) {
    let $thisOpenBtn = $(el);
    let $thisBtnGroup = $thisOpenBtn.closest('.product__main-btn-group');
    let $thisCartBtn = $thisBtnGroup.find('.product__main-btn');
    let $thisToggleBtn = $thisBtnGroup.find('.js-inputs-dropdown-toggle-btn');
    let $thisProduct = $thisOpenBtn.closest('.js-product');
    let $thisInputs = $thisProduct.find('.js-inputs');
    let focusableSelectors = [], focusableElements = [];
    let firstEl,lastEl;

    function onKeydown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            closeVariants();
            return;
        }
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === $thisCartBtn[0] ) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    $thisCartBtn.focus();
                }
            }
        }
    }

    function openVariants() {
        $thisInputs.addClass('show').attr('tabindex','-1').focus();
        $thisInputs[0].removeAttribute('tabindex');
        $thisProduct.addClass('is-variants-opened');
        $thisToggleBtn.addClass('active').attr('aria-expanded','true');

        variantsHandle.activeToggleBtn = $thisToggleBtn;
        variantsHandle.activeCartBtn = $thisCartBtn;
        variantsHandle.activeDropdown = $thisInputs;
        variantsHandle.activeProduct = $thisProduct;

        window.announceToScreenReader?.('listExpand', {'label': UNAS.text.product_variants});
        focusableSelectors = [
            'a[href]', 'button:not([disabled])', 'input:not([disabled])',
            'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
        ];
        focusableElements = Array.from($thisInputs[0].querySelectorAll(focusableSelectors.join(',')))
            .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

        if (focusableElements.length === 0) return;

        firstEl = focusableElements[0];
        lastEl = focusableElements[focusableElements.length - 1];
        document.addEventListener('keydown', onKeydown);
        variantsHandle.controllers.push({
            openButton: $thisOpenBtn[0],
            onKeydown: onKeydown
        });
    }

    function closeVariants() {
        function closeThisVariants(){
            $thisInputs.removeClass('show');
            $thisProduct.removeClass('is-variants-opened');
            $thisToggleBtn.removeClass('active').attr('aria-expanded','false');
        }

        /* Listák bezárásra és ESC eseményfigyelők törlése */
        if (!variantsHandle.controllers) return;

        variantsHandle.controllers.forEach(controller => {
            if (typeof controller.onKeydown === 'function') {
                closeThisVariants(controller.openButton);
                document.removeEventListener('keydown', controller.onKeydown);
            }
        });
        variantsHandle.controllers = [];
        window.announceToScreenReader?.('listCollapse', {'label': UNAS.text.product_variants});
    }

    if ( !$thisOpenBtn.hasClass('product__inputs-dropdown-toggle-btn') ) {
        if ( !$thisProduct.hasClass('js-has-variant') || $thisProduct.is('.all-variant-selected.is-variants-opened') ) {
            let cartadd = $thisCartBtn.data("cartadd");
            eval(cartadd);
            closeVariants();
            return;
        } else {
            if ( !$thisProduct.hasClass('is-variants-opened') ) {
                openVariants();
            } else {
                checkVariants(el);
            }
        }
    } else {
        if ( $thisProduct.hasClass('is-variants-opened') ) {
            closeVariants();
        } else {
            openVariants();
        }
    }
}
$(window).bind("pageshow", function() {
    $('.js-variant-wrap').each(function () {
        $('select option', this).each(function () {
            if (this.defaultSelected) {
                this.selected = true;
                return false;
            }
        });
    });
    $('.cust_input_select:not(.param_cust_input_save_select)').each(function () {
        $('option', this).each(function () {
            if (this.defaultSelected) {
                this.selected = true;
                return false;
            }
        });
    });
    $('.cust_input_file, .cust_input_text').each(function () {
        let $this = $(this);
        if (!$this.hasClass('param_cust_input_save')) {
            $this.val("");
        }
        if ($this.hasClass('cust_input_file')) {
            $this.siblings(".file-name").html($this.siblings(".file-name").attr('data-empty'));
        }
    });
});

/**** FILE INPUT CUSTOMIZATION ****/
function file_input_filname_change(el){
    let thisInput = $(el);
    let fileName = thisInput.val().split("\\").pop();

    if ( thisInput.hasClass("custom-file-input--2") ) {
        if (fileName === "") {
            let thisLabel = thisInput.next('.custom-file-label').find('.custom-file-name');
            thisLabel.html(thisLabel.attr('data-text'));
            if ( thisInput.hasClass("required") ) {
                thisInput.removeClass("is-valid");
            }
        } else {
            thisInput.next('.custom-file-label').find('.custom-file-name').html(fileName);
            if ( thisInput.hasClass("required") ) {
                thisInput.removeClass("is-invalid").addClass("is-valid");
            }
        }
    } else {
        if (fileName === "") {
            let thisLabel = thisInput.next('.custom-file-label')
            thisLabel.html(thisLabel.attr('data-title'));
        } else {
            thisInput.next('.custom-file-label').html(fileName);
        }
    }
}
/*** CUSTOM CONTENT/SHORT DESCRIPTION OPENER ***/

function readMoreOpener(){
    let readmoreV2 = true;
    if (!$('#container').hasClass('readmore-v2')) {
        readmoreV2 = false;
    }
    let $container = $(this);
    let $content = $('.read-more__content', $container);
    let $button = $('.read-more__btn', $container);
    let $buttonWrap = $('.read-more__btn-wrap', $container);
    let $buttonText = $('.read-more-text', $button);
    let $contentHeight = $content.outerHeight(true);
    let $defaultMaxHeight = $container.css('max-height');

    if ($defaultMaxHeight.indexOf('px') !== -1 ) {
        $defaultMaxHeight = parseInt($defaultMaxHeight.replace(/[^-\d\.]/g, ''));
    }

    if ($contentHeight > $defaultMaxHeight) {
        $container.addClass('has-button').css({height: $defaultMaxHeight});
        $button.prop('disabled',false);

        $button.toggle(function () {
            if (readmoreV2) {
                $container.css('max-height', 'unset').addClass('is-opened').animate({height: $contentHeight}, 400);
            } else {
                $container.css('max-height', 'unset').addClass('is-opened').animate({height: $content.outerHeight(true) + $buttonWrap.outerHeight(true)}, 400);
            }
            $button.addClass('is-active').attr('aria-label',$buttonText.data('opened'));
        }, function () {
            $container.animate({height: $defaultMaxHeight}, 400).removeClass('is-opened');
            $button.removeClass('is-active').attr('aria-label',$buttonText.data('closed'));
        });
    }
    $(this).addClass('is-processed');
}

if (service_type == 'shop') {
    document.addEventListener('DOMContentLoaded', function() {
        toastr.options = {
            "positionClass": "toast-top-center",
            "closeButton": true,
            "progressBar":  true,
            "timeOut":      "1500",
            "hideDuration": "300",
            onShown: function() {
                this.setAttribute('role','alert');
            }
        }
    });
    $(document).on('addToCartSuccess', function (e, data) {
        if (data['qty'] > data['qty_add']) {
            let text = UNAS.text.product_added_to_cart_with_qty_problem;

            text = text.replace("[qty_added_to_cart]", "<span class='toast-qty'>" + data['qty_add']);
            text = text.replace("[qty_unit]", data['unit'] + "</span>");

            announceToScreenReader?.('addToCartSuccessWithQtyError',{
                'message':text,
                'qty_of_items': data.qty_of_items
            });
            if (config_plus['cart_redirect'] == 1) {
                text = $.parseHTML(text);
                toastr.warning(text);
            }
        } else {
            /* ha NEM csomagtermék VAGY csomagtermék ÉS az utolsó termék került a kosárba, csak akkor olvassunk fel */
            if (data.package_offer !== null && data.is_last_package_offer_item === false) return;

            announceToScreenReader?.('addToCartSuccess',{
                'qty_of_items': data.qty_of_items
            });
            if (config_plus['cart_redirect'] == 1) {
                toastr.success(UNAS.text.product_added_to_cart);
            }
        }
    });

    $(document).on('removeFromCart removeFromCartBulk', function (e,data) {
        /* ha a removeFromCart esemény Bulk-os, akkor nem csinálunk semmit, mert csak a removeFromCartBulk kell ilyenkor */
        if (data?.is_bulk) return;
        announceToScreenReader?.('removeFromCart',{'qty_of_items': data.qty_of_items});
    });

    $(document).on('autoCompleteListDisplayed', function () {
        initTippy();
    });
    /* OVERLAY onLoad/onClose event */
    $(document).on('onLoad onClose', function (e) {
        if (e.type == 'onLoad') {
            if (!$(e.target).hasClass('cookie-alert')) scrollLock(true);
        } else {
            scrollLock(false);
        }
        tippy.hideAll({duration: 500});
    });
    /* COMPARE POPUP OPENED */
    $(document).on('popupOpen', function(event, array){
        scrollLock(true);
        if (array['popupId'] === 'compare') {
            setTimeout(
                function() {
                    $('table.compare_list_table tbody').width($('.shop_popup_compare').width());
                }, 400
            );
        }
    });
    $(document).on('popupClosed', function () {
        scrollLock(false);
    });
    $(document).on('smartSearchCreate smartSearchOpen', function () {
        let $document = $(this);
        $document.mask({
            loadSpeed: 0,
            zIndex: 1000
        });
        scrollLock(true);
    });
    $(document).on('smartSearchClose', function () {
        scrollLock(false);
        $.mask.close();
        search_smart_autocomplete_blur($('.js-search-input'), true);
    });
}
function initTippy() {
    let tippyElements = document.querySelectorAll("[data-tippy]:not(.binded)");

    tippyElements.forEach((el) => {
        ["focus", "mouseenter", "focusin"].forEach(event => {
            el.addEventListener(event, async (e) => {
                if (el.classList.contains("inited")) return;
                e.preventDefault();

                instantiateTippy(el);
            });
        });
        /* mouse over fix */
        el.addEventListener('mouseleave', () => {
            el.classList.add("mouseleave");
        }, {once:true});
        el.classList.add("binded");

        let blurTimeout;

        ["focusin","click","focusout"].forEach(event => {
            el.addEventListener(event, () => {
                const isTippy = el._tippy;

                if (isTippy) {
                    const isPopper = isTippy.popper;
                    const isPopperTippy = isPopper._tippy;

                    if (event == 'focusin') {
                        clearTimeout(blurTimeout);
                    }
                    if (isPopper) {
                        if (isPopperTippy.state.isShown === false && event != 'focusout') {
                            isPopperTippy.show();
                        } else if (event == 'click' && isTippy && isTippy.reference.nodeName != 'BUTTON' || event == 'focusout') {
                            blurTimeout = setTimeout(() => {
                                isPopperTippy.hide();
                            }, 0);
                        }
                    }
                }
            });
        });
    });

    function instantiateTippy(el) {
        tippy(el, {
            allowHTML: true,
            /*interactive: true,*/
            hideOnClick: false,
            zIndex: 10000,
            maxWidth: "300px",
            onShow: function onShow(instance) {
                const ref = instance.reference;
                ref.setAttribute('aria-live', 'polite');
                ref.setAttribute('aria-expanded', 'true');
                instance.popper.setAttribute('role', 'tooltip');
                instance.popper.hidden = ref.dataset.tippy ? false : true;
                instance.setContent(ref.dataset.tippy);

                function changeTippyText(text, el) {
                    instance.setContent(text);
                    el.attr("data-tippy", text);
                }

                $(document).on('addToFavourites', function (e, product_array) {
                    changeTippyText(UNAS.text.delete_from_favourites, $('.page_artdet_func_favourites_outer_' + product_array['sku_id']));
                });
                $(document).on('removeFromFavourites', function (e, product_array) {
                    changeTippyText(UNAS.text.add_to_favourites, $('.page_artdet_func_favourites_outer_' + product_array['sku_id']));
                });
                $(document).on('addToCompare', function (e, product_array) {
                    changeTippyText(UNAS.text.delete_from_compare, $('.page_art_func_compare_' + product_array['sku_id'] + ', .page_artdet_func_compare_' + product_array['sku_id']));
                });
                $(document).on('removeFromCompare', function (e, product_array) {
                    changeTippyText(UNAS.text.comparison, $('.page_art_func_compare_' + product_array['sku_id'] + ', .page_artdet_func_compare_' + product_array['sku_id']));
                });
            },
            onCreate: function onCreate(instance) {
                const ref = instance.reference;
                ref.classList.add('inited');
                if (["DIV", "SPAN"].includes(ref.tagName) && ref.getAttribute('tabindex') === '0') {
                    ref.setAttribute("role", "button");
                    ref.setAttribute('aria-expanded', 'false');
                }
                if (!ref.classList.contains("mouseleave")) {
                    instance.show();
                }
            },
            onHide(instance) {
                const ref = instance.reference;
                ref.removeAttribute('aria-live');
                ref.setAttribute('aria-expanded', 'false');
            }
        });
    }
}