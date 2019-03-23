/*
  SLIDER

  This is a simple class for building a slideshow. It does very
  little -- all styling, animation, etc, is handled in the HTML and
  CSS.


  USAGE

  Initialize a new slider by passing Slider an object:

  var slider = new Slider({
    slider: element,
    slides: [elements],
    buttons: {
      fw: element,
      bk: element,
    },
    pager: {
      wrap: element,
      dotClass: string,
    },
    align: "(left|center|right)",
    autoslide: int,
  });

  Slider will add event listeners to the `slider` and `button`
  elements. If `pager` is present, it will also create clickable
  elements that change the slider state.

  Alignment of the current slide is set by the `align` property. If
  none of is given, `center` will be assumed.

  If the `autoslide` property is present, it must be the amount of
  milliseconds to wait before automatically advancing the slides.

  Click-and-drag functionality is handled by an outside library. For
  Swiper, an initialization could be like:

  new Swiper({
    target: slider_wrap_elem,
    onDrag: function (delta) {
      slider_instance.dragBy(delta.x.inc);
    },
    onEnd: function (delta) {
      if (delta.v.run == 'left') {
        slider_instance.goFw();
      }
      else {
        slider_instance.goBk();
      }
    },
  });


  DEPENDENCIES

  None.


  DETAILS

  Sample HTML:

  <div id="banner-slides-wrap">
    <div id="banner-slides-slider">
      <div class="banner-slide">
        <h2 class="slide-txt">Slide 1</h2>
      </div><div class="banner-slide">
        <h2 class="slide-txt">Slide 2</h2>
      </div><div class="banner-slide">
        <h2 class="slide-txt">Slide 3</h2>
      </div>
    </div>

    <div id="banner-slides-pager"></div>

    <div id="banner-controls-wrap">
      <div class="banner-slides-control-btn" id="banner-slides-control-bk">Backward</div>
      <div class="banner-slides-control-btn" id="banner-slides-control-fw">Forward</div>
    </div>
  </div>

  Sample CSS:

  #banner-slides-wrap {
    position: relative;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    white-space: nowrap;
  }

  #banner-slides-slider {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    transition: left 0.6s ease;
  }

  .banner-slide {
    display: inline-block;
    position: relative;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }

  #banner-slides-pager {
    display: inline-block;
    postion: absolute;
    left: 50%;
    transform: translate(-50%, 0);
    bottom: 20px;
    text-align: center;
  }

  .banner-pager-dot {
    position: relative;
    display: inline-block;
    margin: 5px;
    padding: 0;
    width: 10px;
    height: 10px;
    border-radius: 20px;
    background-color: #FFFFFF;
    cursor: pointer;
  }

  .banner-pager-dot[active=y] {
    background-color: #FF00FF;
  }

  To remove the stutter/stalls of incremental dragging, add a style rule to the wrap:
    #banner-slides-wrap[draggable] #banner-slides-slider {
        transition: none;
    }

    #HERE


  TODO
  - more documentation
 */

function Slider(args) {
    /*
     * Init, config, etc.
     */

    var $conf = { }, // Retains all the info passed in `args`.
        $elems = { },  // Contains elements created in-class.
        $state = {  // State info.
            activeIndex: null,
            autoslideId: null,
            currentX: null,
        };

    // getDefaultConf :: void -> conf
    // conf = An object as defined below.
    // This is the shape of the object expected in the passed `args`.
    function getDefaultConf() {
        return {
            slider: null,
            slides: null,
            buttons: {
                fw: null,
                bk: null,
            },
            pager: {
                wrap: null,
                dotClass: null,
            },
            keyboardEvents: null,
            align: 'center',
            cycle: true,
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

        $state.activeIndex = 0;

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

        if ($conf.keyboardEvents) {
            addKeyboardListeners();
        }

        addResizeListeners();
        alignToActiveSlide();

        return getPublicProperties();
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

    // getLeftAlignedX :: int -> int
    function getLeftAlignedX(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o].offsetWidth + parseInt(style.marginLeft) + parseInt(style.marginRight));
        }

        return x;
    }

    // getCenterAlignedX :: int -> int
    function getCenterAlignedX(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o].offsetWidth + parseInt(style.marginLeft) + parseInt(style.marginRight));
        }
        x -= ($conf.slides[index].offsetWidth / 2);
        x += ($conf.slider.parentNode.offsetWidth / 2);

        return x;
    }

    // getRightAlignedX :: int -> int
    function getRightAlignedX(index) {
        var x = 0;

        for (var o = 0; o <= index; o++) {
            var style = window.getComputedStyle($conf.slides[o]);
            x -= ($conf.slides[o].offsetWidth + parseInt(style.marginLeft) + parseInt(style.marginRight));
        }
        x += ($conf.slider.parentNode.offsetWidth);

        return x;
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

            if (index <= $state.activeIndex) {
                $state.activeIndex += 1;
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
        if ($state.activeIndex < ($conf.slides.length - 1)) {
            $state.activeIndex += 1;
        }
        else if ($conf.cycle) {
            $state.activeIndex = 0;
        }

        alignToActiveSlide();
    }

    // slideBackward :: void -> void
    function slideBackward() {
        if ($state.activeIndex > 0) {
            $state.activeIndex -= 1;
        }
        else if ($conf.cycle) {
            $state.activeIndex = ($conf.slides.length - 1);
        }

        alignToActiveSlide();
    }

    // makeActiveSlide :: int -> void
    function makeActiveSlide(n) {
        var x = ((n > 0) && (n < $conf.slides.length)) ? n : 0;
        $state.activeIndex = x;
        alignToActiveSlide();
    }

    // alignToActiveSlide :: void -> void
    function alignToActiveSlide() {
        if ($conf.align == 'left') {
            $state.currentX = getLeftAlignedX($state.activeIndex);
        } else if ($conf.align == 'right') {
            $state.currentX = getRightAlignedX($state.activeIndex);
        } else { // center
            $state.currentX = getCenterAlignedX($state.activeIndex);
        }

        setTargetTransform($conf.slider, $state.currentX);

        if ($elems.dots) {
            for (var o = 0, m = $elems.dots.length; o < m; o++) {
                if (o == $state.activeIndex) {
                    $elems.dots[o].setAttribute('slider-active-pager-dot', 'y');
                }
                else {
                    $elems.dots[o].removeAttribute('slider-active-pager-dot');
                }
            }
        }
    }

    // transformByIncrement :: int -> void
    function transformByIncrement(x) {
        $state.currentX += x;
        setTargetTransform($conf.slider, $state.currentX);
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


    /*
     * Autoslide functions.
     */

    // startAutoslide :: void -> void
    function startAutoslide() {
        if (!$state.autoslideId) {
            $state.autoslideId = window.setInterval(slideForward, $conf.autoslide);
        }
    }

    // stopAutoslide :: void -> void
    function stopAutoslide() {
        if ($state.autoslideId) {
            window.clearInterval($state.autoslideId);
            $state.autoslideId = null;
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
