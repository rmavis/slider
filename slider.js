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



    // The return of this function will be merged with the `args`
    // object, and the result of that merge will become `$conf`.
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
            // counter: null,
            // counterItemClass: null,
            keyboardEvents: null,
            align: 'center',
            autoslide: null,
        };
    }


    // Public methods.
    function getPublicProperties() {
        return {
            // Functions.
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



    function init(args) {
        $conf = mergeObjects(getDefaultConf(), args);

        // The `slider` property is required.
        if (($conf.slider) && ($conf.slides)) {
            if ($conf.slides.constructor !== Array) {
                $conf.slides = makeEnumerableArray($conf.slides);
            } 

            $state.activeIndex = 0;

            if ($conf.buttons) {
                addButtonListeners();
            }

            if (($conf.pager) &&
                ($conf.pager.wrap) &&
                ($conf.pager.dotClass)) {
                $elems.pager = $conf.pager.wrap;
                $elems.dots = buildPager($conf.pager.wrap);
            }

            // For the counter.
            // this.counter = null;
            // if ((args.counter) && (args.counterItemClass)) {
            //     this.counterCase = args.counter;
            //     this.counterItemClass = args.counterItemClass;
            //     this.counter = null;
            //     buildCounter();
            // }

            if ($conf.autoslide) {
                startAutoslide();
            }

            addMouseListeners();

            if ($conf.keyboardEvents) {
                addKeyboardListeners();
            }

            alignToActiveSlide();
        }
        else {
            console.log("SLIDER ERROR: cannot `init` without an `element`.");
        }

        return getPublicProperties();
    }





    /*
     * Element-related functions.
     */

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


    // function buildCounter() {
    //     var cCrrnt = document.createElement('div');
    //     var cSlash = document.createElement('div');
    //     var cTotal = document.createElement('div');

    //     cCrrnt.className = this.counterItemClass;
    //     cSlash.className = this.counterItemClass;
    //     cTotal.className = this.counterItemClass;

    //     cCrrnt.innerHTML = ($state.activeIndex + 1);
    //     cSlash.innerHTML = '/';
    //     cTotal.innerHTML = $conf.slides.length;

    //     this.counterCase.appendChild(cCrrnt);
    //     this.counterCase.appendChild(cSlash);
    //     this.counterCase.appendChild(cTotal);

    //     this.counter = cCrrnt;
    // }



    function getLeftAlignedX(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            x -= $conf.slides[o].offsetWidth;
        }

        return x;
    }


    function getCenterAlignedX(index) {
        var x = 0;

        for (var o = 0; o < index; o++) {
            x -= $conf.slides[o].offsetWidth;
        }
        x -= ($conf.slides[index].offsetWidth / 2);
        x += ($conf.slider.parentNode.offsetWidth / 2);

        return x;
    }


    function getRightAlignedX(index) {
        var x = 0;

        for (var o = 0; o <= index; o++) {
            x -= $conf.slides[o].offsetWidth;
        }
        x += ($conf.slider.parentNode.offsetWidth);

        return x;
    }


    function addSlideAtIndex(index, elem) {
        var _slides = [ ],
            append = true;

        for (var o = 0, m = $conf.slides.length; o < m; o++) {
            if (o == index) {
                $conf.slider.insertBefore(elem, $conf.slides[o]);
                _slides.push(elem);
                append = false;
            }
            _slides.push($conf.slides[o]);
        }

        if (append) {
            $conf.slider.insertBefore(elem, $conf.slides[o]);
            _slides.push(elem);
        }

        if (index < $state.activeIndex) {
            $state.activeIndex += 1;
        }

        $conf.slides = _slides;
        $elems.dots = buildPager($conf.pager.wrap);
        alignToActiveSlide();
    }


    function appendSlide(elem) {
        $conf.slides.push(elem);
        $conf.slider.appendChild(elem);
        $elems.dots = buildPager($conf.pager.wrap);
        alignToActiveSlide();
    }


    function prependSlide(elem) {
        $conf.slides.unshift(elem);
        $conf.slider.insertBefore(elem, $conf.slider.firstChild);
        $elems.dots = buildPager($conf.pager.wrap);
        $state.activeIndex += 1;
        alignToActiveSlide();
    }


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

    function addButtonListeners() {
        if ($conf.buttons.fw) {
            $conf.buttons.fw.addEventListener('click', handleForwardButtonClick, false);
        }
        if ($conf.buttons.bk) {
            $conf.buttons.bk.addEventListener('click', handleBackwardButtonClick, false);
        }
    }


    function removeButtonListeners() {
        if ($conf.buttons.fw) {
            $conf.buttons.fw.removeEventListener('click', handleForwardButtonClick);
        }
        if ($conf.buttons.bk) {
            $conf.buttons.bk.removeEventListener('click', handleBackwardButtonClick);
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


    function addMouseListeners() {
        $conf.slider.addEventListener('mouseover', handleMouseover, false);
        $conf.slider.addEventListener('mouseout', handleMouseout, false);
    }


    function removeMouseListeners() {
        $conf.slider.removeEventListener('mouseover', handleMouseover);
        $conf.slider.removeEventListener('mouseout', handleMouseout);
    }


    function addKeyboardListeners() {
        window.addEventListener('keydown', handleKeydown, false);
    }


    function removeKeyboardListeners() {
        window.removeEventListener('keydown', handleKeydown);
    }



    function checkEvent(evt) {
        if (!evt) {var evt = window.event;}
        evt.stopPropagation();
        return evt;
    }


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


    function handleForwardButtonClick(evt) {
        slideForward();

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }


    function handleBackwardButtonClick(evt) {
        slideBackward();

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }


    function handlePagerClick(evt) {
        evt = checkEvent(evt);
        var caller = getCallerFromEvent(evt);
        makeActiveSlide(parseInt(caller.getAttribute('slide-ref')));

        if ($conf.autoslide) {
            resetAutoslide();
        }
    }


    function handleMouseover(evt) {
        if ($conf.autoslide) {
            stopAutoslide();
        }
    }


    function handleMouseout(evt) {
        if ($conf.autoslide) {
            startAutoslide();
        }
    }


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

    function slideForward() {
        if ($state.activeIndex < ($conf.slides.length - 1)) {
            $state.activeIndex += 1;
        }
        else {
            $state.activeIndex = 0;
        }

        alignToActiveSlide();
    }


    function slideBackward() {
        if ($state.activeIndex > 0) {
            $state.activeIndex -= 1;
        }
        else {
            $state.activeIndex = ($conf.slides.length - 1);
        }

        alignToActiveSlide();
    }


    function makeActiveSlide(n) {
        var x = ((n > 0) && (n < $conf.slides.length)) ? n : 0;
        $state.activeIndex = x;
        alignToActiveSlide();
    }


    function alignToActiveSlide() {
        if ($conf.align == 'left') {
            $state.currentX = getLeftAlignedX($state.activeIndex);
        }
        else if ($conf.align == 'right') {
            $state.currentX = getRightAlignedX($state.activeIndex);
        }
        else { // center
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

        // if (this.counter) {
        //     this.counter.innerHTML = ($state.activeIndex + 1);
        // }
    }



    function transformByIncrement(x) {
        $state.currentX += x;
        setTargetTransform($conf.slider, $state.currentX);
    }



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

    function startAutoslide() {
        if (!$state.autoslideId) {
            $state.autoslideId = window.setInterval($state.autoslideId, $conf.autoslide);
        }
    }


    function stopAutoslide() {
        if ($state.autoslideId) {
            window.clearInterval($state.autoslideId);
            $state.autoslideId = null;
        }
    }


    function resetAutoslide() {
        stopAutoslide();
        startAutoslide();
    }





    /*
     * Utility functions.
     */

    function makeEnumerableArray(obj) {
        var arr = [ ];

        for (var o = 0, m = obj.length; o < m; o++) {
            arr.push(obj[o]);
        }

        return arr;
    }


    function mergeObjects(obj1, obj2) {
        if ($conf.log) {
            console.log('Merging this object:');
            console.log(obj1);
            console.log('with this one:');
            console.log(obj2);
        }

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





    // This needs to stay down here.
    return init(args);
}
