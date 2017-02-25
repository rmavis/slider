/*
  SLIDER
  This is a dumb class for building a slideshow.
  It does very little. It's all configured in your HTML and CSS.



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
  </div>


  <div id="banner-controls-wrap">
    <div class="banner-slides-control-btn" id="banner-slides-control-bk">Backward</div>
    <div class="banner-slides-control-btn" id="banner-slides-control-fw">Forward</div>
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



  To initialize the slideshow, pass an object to Slider:

  var sldr = new Slider({
    element: document.getElementById('banner-slides-slider'),
    slidesClass: 'banner-slide',
    btnFw: document.getElementById('banner-slides-control-fw'),
    btnBk: document.getElementById('banner-slides-control-bk'),
    pager: document.getElementById('banner-slides-pager'),
    pagerItemClass: 'banner-pager-dot',
    counter: document.getElementById('banner-slides-counter'),
    counterItemClass: 'banner-counter-item',
    autoslide: 3500
  });


  Optionally, if Swiper.js is also present, you can add the "swiper" attribute
  to the Slider's parameter:
    swiper: document.getElementById('banner-slides-wrap')

  To remove the stutter/stalls of incremental dragging, add a style rule to the wrap:
    #banner-slides-wrap[draggable] #banner-slides-slider {
        transition: none;
    }


  Slider collects the slides -- specified by the 'slidesClass' -- under the 'element',
  adds event listeners to the 'btnFw' and 'btnBk' elements,
  optionally creates a string of callers in the 'pager' element and gives them the 'pagerItemClass',
  also optionally creates a three-item counter display (current, slash, total) and gives those
  the class specified in 'counterItemClass', and sets a counter to the first element in the
  'element'.

  When the forward- or btnBk is clicked, the counter is incremented or decremented,
  the 'left' value of the 'element' is set to -(counter * 100)%,
  and the corresponding caller in the 'pager' is made 'active',
  and the displayed counter value is updated.
  The work of animating the transition is offloaded to the CSS transition.

  If 'autoslide' is specified, its value is the number of milliseconds that will be passed to
  setInterval(). Slider's slideForward() will be called on that interval.

  If the 'swiper' is specified, then a new instance of Swiper is created. The callback method
  from Swiper is a method similar to Slider's own handleEvent() -- it reacts according to the
  object Swiper returns.

 */



function Slider(args) {

    var $conf = { }, // Retains all the info passed in `args`.
        $elems = { },  // Contains elements created in-class.
        $state = {  // State info.
            activeIndex: null,
            autoslideId: null,
            currentX: null,
        };



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
            swiper: null,
        };
    }



    function getStartState() {
        return {
            buttons: {
                forward: null,
                backward: null,
            },
            swiper: null,
        };
    }


    function getPublicProperties() {
        return {
            goFwd: slideForward,
            goBk: slideBackward,
            goTo: makeActiveSlide,
            dragBy: transformByIncrement,
            stopAutoslide: stopAutoslide,
            startAutoslide: startAutoslide,
            resetAutoslide: resetAutoslide,
        };
    }



    function init(args) {
        $conf = mergeObjects(getDefaultConf(), args);

        if ($conf.slider) {
            $state.activeIndex = 0;

            // For the buttons.
            if ($conf.buttons) {
                addButtonListeners();
            }

            // For the pager.
            if (($conf.pager) && ($conf.pager.wrap) && ($conf.pager.dotClass)) {
                $elems.dots = buildPager(args.pager.wrap);
                addPagerListeners();
            }

            // For the swiper.
            if (args.swiper) {
                $conf.swiper = new Swiper({
                    element: $conf.slider,
                    onDrag: handleSwipeEvent,  // #HERE
                    onEnd: handleSwipeEvent  // #HERE
                });
            }

            // For the counter.
            // this.counter = null;
            // if ((args.counter) && (args.counterItemClass)) {
            //     this.counterCase = args.counter;
            //     this.counterItemClass = args.counterItemClass;
            //     this.counter = null;
            //     buildCounter();
            // }

            // Auto-sliding.
            if ($conf.autoslide) {
                startAutoslide();
                // this.autoslideSecs = parseInt(args.autoslide) || 3500;
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
        var dots = [ ];

        for (var o = 0, m = $conf.slides.length; o < m; o++) {
            var dot = document.createElement('div');
            dot.className = $conf.pager.dotClass;
            dot.setAttribute('slide-ref', o);
            wrap.appendChild(dot);
            dots.push(dot);
        }

        return dots;
    }


    function buildCounter() {
        var cCrrnt = document.createElement('div');
        var cSlash = document.createElement('div');
        var cTotal = document.createElement('div');

        cCrrnt.className = this.counterItemClass;
        cSlash.className = this.counterItemClass;
        cTotal.className = this.counterItemClass;

        cCrrnt.innerHTML = ($state.activeIndex + 1);
        cSlash.innerHTML = '/';
        cTotal.innerHTML = $conf.slides.length;

        this.counterCase.appendChild(cCrrnt);
        this.counterCase.appendChild(cSlash);
        this.counterCase.appendChild(cTotal);

        this.counter = cCrrnt;
    }



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


    function addPagerListeners() {
        for (var o = 0, m = $elems.dots.length; o < m; o++) {
            $elems.dots[o].addEventListener('click', handlePagerClick, false);
        }
    }


    function removePagerListeners() {
        for (var o = 0, m = $elems.dots.length; o < m; o++) {
            $elems.dots[o].removeEventListener('click', handlePagerClick);
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
            slideBackward();
        }
        else if (evt.keyCode == 39) {  // The right arrow key.
            slideForward();
        }

        if (this.autoslide) {resetAutoslide();}
    }


    function handleForwardButtonClick(evt) {
        slideForward();
        if ($conf.autoslide) {resetAutoslide();}
    }


    function handleBackwardButtonClick(evt) {
        slideBackward();
        if ($conf.autoslide) {resetAutoslide();}
    }


    function handlePagerClick(evt) {
        evt = checkEvent(evt);
        var caller = getCallerFromEvent(evt);
        makeActiveSlide(parseInt(caller.getAttribute('slide-ref')));
        if ($conf.autoslide) {resetAutoslide();}
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


    function handleSwipeEvent(swipeobj) {
        if (swipeobj.swipeDir) {
            if (swipeobj.swipeDir == 'left') {
                slideForward();
            }
            else if (swipeobj.swipeDir == 'right') {
                slideBackward();
            }

            if (this.autoslide) {resetAutoslide();}
        }

        else if (swipeobj.endT) {
            alignToActiveSlide();
            if (this.autoslide) {resetAutoslide();}
        }


        else if ((swipeobj.magDir == 'left') || (swipeobj.magDir == 'right')) {
            if (this.autoslide) {stopAutoslide();}
            transformByIncrement(swipeobj.runX);
        }
    }




    function getCallerFromEvent(evt) {
        var caller = (evt.target) ? evt.target : evt.scrElement;

        while ((caller != document.body) &&
               (caller != $conf.buttons.fw) &&
               (caller != $conf.buttons.bk) &&
               (caller.className != $conf.pager.dotClass)) {
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
