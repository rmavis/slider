// Slider :: conf -> api?
// conf, api = see note on `init`
function Slider(args) {
    /*
     * Init, config, etc.
     */

    var $conf = { }, // Retains all the info passed in `args`.
        $elems = { },  // Contains elements created in-class.
        $run = {  // Running/state info.
            activeIndex: null,
            autoslideId: null,
            currentOffset: null,
            getAlignment: null,
            offsetDimension: null,
        };

    // getDefaultConf :: void -> conf
    // conf = An object as defined below.
    // This is the shape of the object expected in the passed `args`.
    function getDefaultConf() {
        return {
            // Element
            slider: null,
            // NodeList or array of Elements
            slides: null,
            // optional
            buttons: {
                // Element
                fw: null,
                // Element
                bk: null,
            },
            // optional
            // If present, all properties must also be present.
            pager: {
                // Element
                wrap: null,
                // string
                dotClass: null,
                // string
                activeClass: null,
            },
            events: {
                // boolean?
                useKeyboard: null,
                // ((int, Element) -> void)?
                beforeAlign: null,
                // ((int, Element) -> void)?
                afterAlign: null,
            },
            // string
            align: 'center',
            // boolean
            cycle: true,
            // boolean?
            autoslide: null,
        };
    }

    // getPublicProperties :: void -> api
    // api = An object as defined below.
    // This object is intended to define Slider's public API.
    function getPublicProperties() {
        return {
            goFw: slideForward,
            goBk: slideBackward,
            goTo: makeActiveSlide,
            align: alignToActiveSlide,
            dragBy: transformByIncrement,
            stopAutoslide: stopAutoslide,
            startAutoslide: startAutoslide,
            resetAutoslide: resetAutoslide,
            append: appendSlide,
            prepend: prependSlide,
            addAt: addSlideAtIndex,
            removeSlide: removeSlide,
        };
    }

    // init :: conf -> api?
    // conf = see note on `getDefaultConf`
    // api = see note on `getPublicProperties`
    function init(conf) {
        $conf = mergeObjects(getDefaultConf(), conf);

        if ((!$conf.slider) || (!$conf.slides)) {
            console.log("SLIDER ERROR: cannot `init` without an `element`.");
            return null;
        }

        if ($conf.slides.constructor !== Array) {
            $conf.slides = makeEnumerableArray($conf.slides);
        } 

        $run.activeIndex = 0;

        if (!setRuntimeAlignmentOffsetConf(getRuntimeAlignmentOffsetConf())) {
            console.log("SLIDER ERROR: invalid alignment '"+$conf.align+"'");
            return null;
        }

        if ($conf.buttons) {
            addButtonListeners($conf.buttons);
        }

        if (($conf.pager) &&
            ($conf.pager.wrap) &&
            ($conf.pager.dotClass)) {
            $elems.pager = $conf.pager.wrap;
            $elems.dots = buildPager($conf.pager.wrap);
        }

        if ($conf.autoslide) {
            startAutoslide();
        }

        addMouseListeners($conf.slider);

        if ($conf.events.useKeyboard) {
            addKeyboardListeners();
        }

        addResizeListeners();
        alignToActiveSlide();

        return getPublicProperties();
    }

    // getRuntimeAlignmentOffsetConf :: void -> aligns?
    // aligns = a 3-item tuple containing:
    //   0 = function
    //   1 = (string) dimension
    //   2 = [(string) dimension]
    //   3 = function
    function getRuntimeAlignmentOffsetConf() {
        if ($conf.align == 'left') {
            return [
                getLeftAlignedOffset,
                'offsetWidth',
                ['marginLeft', 'marginRight'],
                setTargetTransformX,
            ];
        } else if ($conf.align == 'right') {
            return [
                getRightAlignedOffset,
                'offsetWidth',
                ['marginLeft', 'marginRight'],
                setTargetTransformX,
            ];
        } else if ($conf.align == 'center') {
            return [
                getCenterAlignedOffset,
                'offsetWidth',
                ['marginLeft', 'marginRight'],
                setTargetTransformX,
            ];
        } else if ($conf.align == 'top') {
            return [
                getLeftAlignedOffset,
                'offsetHeight',
                ['marginTop', 'marginBottom'],
                setTargetTransformY,
            ];
        } else if ($conf.align == 'bottom') {
            return [
                getRightAlignedOffset,
                'offsetHeight',
                ['marginTop', 'marginBottom'],
                setTargetTransformY,
            ];
        } else if ($conf.align == 'middle') {
            return [
                getCenterAlignedOffset,
                'offsetHeight',
                ['marginTop', 'marginBottom'],
                setTargetTransformY,
            ];
        } else {
            return null;
        }
    }

    // setRuntimeAlignmentOffsetConf :: aligns? -> bool
    // aligns = see `getRuntimeAlignmentOffsetConf`
    function setRuntimeAlignmentOffsetConf(aligns) {
        if ((aligns instanceof Array) &&
            (aligns.length == 4)) {
            $run.getAlignment = aligns[0];
            $run.offsetDimension = aligns[1];
            $run.offsetMargins = aligns[2];
            $run.setTargetTransform = aligns[3];
            return true;
        }
        return false;
    }


    /*
     * Element-related functions.
     */

    // buildPager :: Element -> [Element]
    function buildPager(wrap) {
        wrap.innerHTML = '';

        var dots = [ ];
        for (var o = 0, m = $conf.slides.length; o < m; o++) {
            var dot = document.createElement('div');
            dot.className = $conf.pager.dotClass;
            dot.setAttribute('slide-ref', o);
            wrap.appendChild(dot);
            dots.push(dot);
        }
        addPagerListeners(dots);

        return dots;
    }

    // addSlideAtIndex :: (int, Element) -> void
    function addSlideAtIndex(index, elem) {
        if ($conf.slides.length < index) {
            appendSlide(elem);
        }
        else {
            var _slides = [ ];

            for (var o = 0, m = $conf.slides.length; o < m; o++) {
                if (o == index) {
                    $conf.slider.insertBefore(elem, $conf.slides[o]);
                    _slides.push(elem);
                }
                _slides.push($conf.slides[o]);
            }

            if (index <= $run.activeIndex) {
                $run.activeIndex += 1;
            }

            $conf.slides = _slides;
            $elems.dots = buildPager($conf.pager.wrap);
            alignToActiveSlide();
        }
    }

    // appendSlide :: Element -> void
    function appendSlide(elem) {
        $conf.slides.push(elem);
        $conf.slider.appendChild(elem);
        $elems.dots = buildPager($conf.pager.wrap);
        alignToActiveSlide();
    }

    // prependSlide :: Element -> void
    function prependSlide(elem) {
        addSlideAtIndex(0, elem);
    }

    // removeSlide :: int -> void
    function removeSlide(index) {
        var _slides = [ ];

        for (var o = 0, m = $conf.slides.length; o < m; o++) {
            if (o == index) {
                $conf.slider.removeChild($conf.slider.children[o]);
            }
            else {
                _slides.push($conf.slides[o]);
            }
        }

        $conf.slides = _slides;
        $elems.dots = buildPager($conf.pager.wrap);
        alignToActiveSlide();
    }


    /*
     * Event-related functions.
     */

    // addButtonListeners :: buttons -> void
    // buttons = see `buttons` subobject in `getDefaultConf`
    function addButtonListeners(buttons) {
        if (buttons.fw) {
            buttons.fw.addEventListener('click', handleForwardButtonClick, false);
        }
        if (buttons.bk) {
            buttons.bk.addEventListener('click', handleBackwardButtonClick, false);
        }
    }

    // removeButtonListeners :: buttons -> void
    // buttons = see note on `addButtonListeners`
    function removeButtonListeners() {
        if (buttons.fw) {
            buttons.fw.removeEventListener('click', handleForwardButtonClick);
        }
        if (buttons.bk) {
            buttons.bk.removeEventListener('click', handleBackwardButtonClick);
        }
    }

    function addPagerListeners(dots) {
        for (var o = 0, m = dots.length; o < m; o++) {
            dots[o].addEventListener('click', handlePagerClick, false);
        }
    }

    function removePagerListeners(dots) {
        for (var o = 0, m = dots.length; o < m; o++) {
            dots[o].removeEventListener('click', handlePagerClick);
        }
    }

    // addMouseListeners :: slider -> void
    // slider = see `slider` key of `getDefaultConf`
    function addMouseListeners(slider) {
        slider.addEventListener('mouseover', handleMouseover, false);
        slider.addEventListener('mouseout', handleMouseout, false);
    }

    // removeMouseListeners :: slider -> void
    // slider = see note on `addMouseListeners`
    function removeMouseListeners(slider) {
        slider.removeEventListener('mouseover', handleMouseover);
        slider.removeEventListener('mouseout', handleMouseout);
    }

    // addKeyboardListeners :: void -> void
    function addKeyboardListeners() {
        window.addEventListener('keydown', handleKeydown, false);
    }

    // removeKeyboardListeners :: void -> void
    function removeKeyboardListeners() {
        window.removeEventListener('keydown', handleKeydown);
    }

    var deboucedResizeHandler = debounce(
        function () {
            alignToActiveSlide();
        },
        500
    );

    // addResizeListeners :: void -> void
    function addResizeListeners() {
        window.addEventListener('resize', deboucedResizeHandler);
    }

    // removeResizeListeners :: void -> void
    function removeResizeListeners() {
        window.addEventListener('resize', deboucedResizeHandler);
    }

    // checkEvent :: Event -> Event
    function checkEvent(evt) {
        if (!evt) {var evt = window.event;}
        evt.stopPropagation();
        return evt;
    }

    // handleKeydown :: Event -> void
    function handleKeydown(evt) {
        evt = checkEvent(evt);

        if (evt.keyCode == 37) {  // The left arrow key.
            evt.preventDefault();
            slideBackward();
        }
        else if (evt.keyCode == 39) {  // The right arrow key.
            evt.preventDefault();
            slideForward();
        }

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }

    // handleForwardButtonClick :: Event -> void
    function handleForwardButtonClick(evt) {
        slideForward();

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }

    // handleBackwardButtonClick :: Event -> void
    function handleBackwardButtonClick(evt) {
        slideBackward();

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }

    // handlePagerClick :: Event -> void
    function handlePagerClick(evt) {
        evt = checkEvent(evt);
        var caller = getCallerFromEvent(evt);
        makeActiveSlide(parseInt(caller.getAttribute('slide-ref')));

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }

    // handleMouseout :: Event -> void
    function handleMouseover(evt) {
        if ($conf.autoslide) {
            stopAutoslide();
        }
    }

    // handleMouseout :: Event -> void
    function handleMouseout(evt) {
        if ($conf.autoslide) {
            startAutoslide();
        }
    }

    // getCallerFromEvent :: Event -> Element
    function getCallerFromEvent(evt) {
        var caller = (evt.target) ? evt.target : evt.scrElement;

        while ((caller.className != $conf.pager.dotClass) &&
               (caller != $conf.buttons.fw) &&
               (caller != $conf.buttons.bk) &&
               (caller != document.body)) {
            caller = caller.parentNode;
        }

        return caller;
    }


    /*
     * Slide movement functions.
     */

    // slideForward :: void -> void
    function slideForward() {
        if ($run.activeIndex < ($conf.slides.length - 1)) {
            $run.activeIndex += 1;
        } else if ($conf.cycle) {
            $run.activeIndex = 0;
        }

        alignToActiveSlide();
    }

    // slideBackward :: void -> void
    function slideBackward() {
        if ($run.activeIndex > 0) {
            $run.activeIndex -= 1;
        } else if ($conf.cycle) {
            $run.activeIndex = ($conf.slides.length - 1);
        }

        alignToActiveSlide();
    }

    // makeActiveSlide :: int -> void
    function makeActiveSlide(n) {
        var x = ((n > 0) && (n < $conf.slides.length)) ? n : 0;
        $run.activeIndex = x;
        alignToActiveSlide();
    }

    // alignToActiveSlide :: void -> void
    function alignToActiveSlide() {
        if ($conf.events.beforeAlign) {
            $conf.events.beforeAlign($run.activeIndex, $conf.slides[$run.activeIndex]);
        }

        $run.currentOffset = $run.getAlignment($run.activeIndex);
        $run.setTargetTransform($conf.slider, $run.currentOffset);

        if ($elems.dots) {
            for (var o = 0, m = $elems.dots.length; o < m; o++) {
                if (o == $run.activeIndex) {
                    $elems.dots[o].classList.add($conf.pager.activeClass);
                } else {
                    $elems.dots[o].classList.remove($conf.pager.activeClass);
                }
            }
        }

        if ($conf.events.afterAlign) {
            $conf.events.afterAlign($run.activeIndex, $conf.slides[$run.activeIndex]);
        }
    }

    // getLeftAlignedOffset :: int -> int
    function getLeftAlignedOffset(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o][$run.offsetDimension] + parseInt(style[$run.offsetMargins[0]]) + parseInt(style[$run.offsetMargins[1]]));
        }

        return x;
    }

    // getCenterAlignedOffset :: int -> int
    function getCenterAlignedOffset(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o][$run.offsetDimension] + parseInt(style[$run.offsetMargins[0]]) + parseInt(style[$run.offsetMargins[1]]));
        }
        x -= ($conf.slides[index][$run.offsetDimension] / 2);
        x += ($conf.slider.parentNode[$run.offsetDimension] / 2);

        return x;
    }

    // getRightAlignedOffset :: int -> int
    function getRightAlignedOffset(index) {
        var x = 0;

        for (var o = 0; o <= index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o][$run.offsetDimension] + parseInt(style[$run.offsetMargins[0]]) + parseInt(style[$run.offsetMargins[1]]));
        }
        x += ($conf.slider.parentNode[$run.offsetDimension]);

        return x;
    }

    // transformByIncrement :: int -> void
    function transformByIncrement(x) {
        $run.currentOffset += x;
        $run.setTargetTransform($conf.slider, $run.currentOffset);
    }

    // setTargetTransform :: (Element, int, int) -> void
    function setTargetTransform(elem, x, y) {
        var xpos = (typeof x == 'undefined') ? '0px' : (x+'px');
        var ypos = (typeof y == 'undefined') ? '0px' : (y+'px');

        elem.style.webkitTransform = 'translate(' + xpos +', ' + ypos + ')';
        elem.style.mozTransform = 'translate(' + xpos +', ' + ypos + ')';
        elem.style.msTransform = 'translate(' + xpos +', ' + ypos + ')';
        elem.style.transform = 'translate(' + xpos +', ' + ypos + ')';
    }

    // setTargetTransformX :: (Element, int) -> void
    function setTargetTransformX(elem, x) {
        setTargetTransform(elem, x, 0);
    }

    // setTargetTransformY :: (Element, int) -> void
    function setTargetTransformY(elem, y) {
        setTargetTransform(elem, 0, y);
    }


    /*
     * Autoslide functions.
     */

    // startAutoslide :: void -> void
    function startAutoslide() {
        if (!$run.autoslideId) {
            $run.autoslideId = window.setInterval(slideForward, $conf.autoslide);
        }
    }

    // stopAutoslide :: void -> void
    function stopAutoslide() {
        if ($run.autoslideId) {
            window.clearInterval($run.autoslideId);
            $run.autoslideId = null;
        }
    }

    // resetAutoslide :: void -> void
    function resetAutoslide() {
        stopAutoslide();
        startAutoslide();
    }


    /*
     * Utility functions.
     */

    // makeEnumerableArray :: iterable -> [a]
    // iterable = any object type whose properties can be accessed
    //   with a numeric index
    function makeEnumerableArray(obj) {
        var arr = [ ];
        for (var o = 0, m = obj.length; o < m; o++) {
            arr.push(obj[o]);
        }
        return arr;
    }

    // mergeObjects :: (object, object) -> object
    function mergeObjects(obj1, obj2) {
        var merged = { };

        for (var key in obj1) {
            if (obj1.hasOwnProperty(key)) {
                if (obj2.hasOwnProperty(key)) {
                    if ((obj1[key]) &&
                        (obj1[key].constructor == Object) &&
                        (obj2[key].constructor == Object)) {
                        merged[key] = mergeObjects(obj1[key], obj2[key]);
                    }
                    else {
                        merged[key] = obj2[key];
                    }
                }
                else {
                    merged[key] = obj1[key];
                }
            }
        }

        return merged;
    }

    // via https://davidwalsh.name/function-debounce
    function debounce(func, wait, immediate) {
	    var timeout;

	    return function() {
		    var context = this,
                args = arguments;

		    var later = function() {
			    timeout = null;

			    if (!immediate) {
                    func.apply(context, args);
                }
		    };

		    var callNow = (immediate && !timeout);

		    clearTimeout(timeout);

		    timeout = setTimeout(later, wait);

		    if (callNow) {
                func.apply(context, args);
            }
	    };
    }


    // This needs to stay down here.
    return init(args);
}
