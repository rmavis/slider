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
    forwardButton: document.getElementById('banner-slides-control-fw'),
    backwardButton: document.getElementById('banner-slides-control-bk'),
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
  adds event listeners to the 'forwardButton' and 'backwardButton' elements,
  optionally creates a string of callers in the 'pager' element and gives them the 'pagerItemClass',
  also optionally creates a three-item counter display (current, slash, total) and gives those
  the class specified in 'counterItemClass', and sets a counter to the first element in the
  'element'.

  When the forward- or backwardButton is clicked, the counter is incremented or decremented,
  the 'left' value of the 'element' is set to -(counter * 100)%,
  and the corresponding caller in the 'pager' is made 'active',
  and the displayed counter value is updated.
  The work of animating the transition is offloaded to the CSS transition.

  If 'autoslide' is specified, its value is the number of milliseconds that will be passed to
  setInterval(). Slider's goForwardOne() will be called on that interval.

  If the 'swiper' is specified, then a new instance of Swiper is created. The callback method
  from Swiper is a method similar to Slider's own handleEvent() -- it reacts according to the
  object Swiper returns.

 */



function Slider(params) {

    this.init = function(pobj) {
        if (pobj.element) {
            this.target = pobj.element;

            this.slideClassName = pobj.slidesClass;
            this.slideWidth = null;
            this.activeSlide = 0;
            this.slides = this.getSlides();

            this.fwBtn = pobj.forwardButton || null;
            this.bkBtn = pobj.backwardButton || null;

            this.evt = null;
            this.caller = null;


            // For the swiper.

            this.swiper = null;

            if (pobj.swiper) {
                this.swiper = new Swiper({
                    element: pobj.swiper,
                    onDrag: this.handleSwipeEvent.bind(this),
                    onEnd: this.handleSwipeEvent.bind(this)
                });
            }


            // For the pager.

            this.pager = null;
            this.pagerItemClass = null;
            this.pagerItemActiveAttr = null;
            this.pagerItemActiveVal = null;

            if ((pobj.pager) && (pobj.pagerItemClass)) {
                this.pager = pobj.pager;
                this.pagerItemClass = pobj.pagerItemClass;
                this.pagerItemActiveAttr = 'active';
                this.pagerItemActiveVal = 'y';
                this.buildPager();
            }


            // For the counter.

            this.counter = null;

            if ((pobj.counter) && (pobj.counterItemClass)) {
                this.counterCase = pobj.counter;
                this.counterItemClass = pobj.counterItemClass;
                this.counter = null;
                this.buildCounter();
            }


            // Auto-sliding.

            this.autoslide = null;
            this.autoslideSecs = null;
            this.autoslideIntervalID = null;

            if (pobj.autoslide) {
                this.autoslide = true;
                this.autoslideSecs = parseInt(pobj.autoslide) || 3500;
                if (this.slides.length > 1) {this.startAutoslide();}
            }


            // keyboard events. Just back and forth.
            this.keyboardEvents = pobj.keyboardEvents || null;


            this.addListeners();
        }

        else {
            // console.log("Slider was passed an invalid target element.");
            return false;
        }
    };



    this.getSlides = function() {
        var ret = this.target.getElementsByClassName(this.slideClassName);
        if (ret.length) {this.slideWidth = ret[0].offsetWidth;}
        return ret;
    };



    this.addListeners = function() {
        if ((this.fwBtn) && (this.bkBtn)) {
            this.fwBtn.addEventListener('click', this, false);
            this.bkBtn.addEventListener('click', this, false);
        }

        this.target.addEventListener('mouseover', this, false);
        this.target.addEventListener('mouseout', this, false);

        if (this.keyboardEvents) {
            window.addEventListener('keydown', this, false);
        }
    };



    this.removeListeners = function() {
        if ((this.fwBtn) && (this.bkBtn)) {
            this.fwBtn.removeEventListener('click', this);
            this.bkBtn.removeEventListener('click', this);
        }

        this.target.removeEventListener('mouseover', this);
        this.target.removeEventListener('mouseout', this);

        if (this.keyboardEvents) {
            window.removeEventListener('keydown', this);
        }
    };



    this.handleEvent = function(evt) {
        if (!evt) {var evt = window.event;}
        this.evt = evt;
        this.evt.stopPropagation();

        this.getCallerFromEvent();

        var eventType = this.evt.type;
        if (eventType == 'click') {
            if (this.caller == this.fwBtn) {
                this.goForwardOne();
            }
            else if (this.caller == this.bkBtn) {
                this.goBackwardOne();
            }
            else if (this.isCallerAPager()) {
                this.gotoThisSlide(this.caller.getAttribute('slide'));
            }
            else {
                // console.log("Unrecognized target: " + this.caller.id);
            }
            if (this.autoslide) {this.resetAutoslide();}
        }

        else if ((eventType == 'mouseover') && (this.autoslide)) {
            this.stopAutoslide();
        }

        else if ((eventType == 'mouseout') && (this.autoslide)) {
            this.startAutoslide();
        }

        else if (eventType == 'keydown') {
            if (this.evt.keyCode == 37) {  // The left arrow key.
                this.goBackwardOne();
            }
            else if (this.evt.keyCode == 39) {  // The right arrow key.
                this.goForwardOne();
            }
            if (this.autoslide) {this.resetAutoslide();}
        }

        else {
            // console.log("Unhandled event type: " + eventType);
        }

        // If this isn't called, Swiper won't handle the event.
        if (this.swiper) {this.swiper.handleEvent(this.evt);}
    };



    this.handleSwipeEvent = function(swipeobj) {
        if (swipeobj.swipeDir) {
            if (swipeobj.swipeDir == 'left') {
                this.goForwardOne();
            }
            else if (swipeobj.swipeDir == 'right') {
                this.goBackwardOne();
            }

            if (this.autoslide) {this.resetAutoslide();}
        }

        else if (swipeobj.endT) {
            this.gotoActiveSlide();
            if (this.autoslide) {this.resetAutoslide();}
        }


        else if ((swipeobj.magDir == 'left') || (swipeobj.magDir == 'right')) {
            if (this.autoslide) {this.stopAutoslide();}
            this.incrementalSlide(swipeobj.runX);
        }
    };




    this.getCallerFromEvent = function() {
        this.caller = (this.evt.target) ? this.evt.target : this.evt.scrElement;

        while ((this.caller != document.body) &&
               (this.caller != this.fwBtn) &&
               (this.caller != this.bkBtn) &&
               (!this.isCallerAPager())) {
            this.caller = this.caller.parentNode;
        }
    };



    this.isCallerAPager = function() {
        return elemHasClass(this.caller, this.pagerItemClass);
    };



    this.goForwardOne = function() {
        this.activeSlide = parseInt(this.activeSlide);

        if (this.activeSlide == (this.slides.length - 1)) {
            this.activeSlide = 0;
        }
        else {
            this.activeSlide += 1;
        }

        this.gotoActiveSlide();
    };


    this.goBackwardOne = function() {
        this.activeSlide = parseInt(this.activeSlide);

        if (this.activeSlide == 0) {
            this.activeSlide = (this.slides.length - 1);
        }
        else {
            this.activeSlide -= 1;
        }

        this.gotoActiveSlide();
    };


    this.gotoThisSlide = function(n) {
        var x = ((n > 0) && (n < this.slides.length)) ? n : 0;
        this.activeSlide = parseInt(x);
        this.gotoActiveSlide();
    };



    this.gotoActiveSlide = function() {
        this.setTargetLeftPosition(-(this.activeSlide * 100));

        if (this.pager) {
            var dots = this.pager.getElementsByClassName(this.pagerItemClass);
            for (var i = 0; i < dots.length; i++) {
                if (i == this.activeSlide) {
                    dots[i].setAttribute(this.pagerItemActiveAttr, this.pagerItemActiveVal);
                }
                else {
                    dots[i].removeAttribute(this.pagerItemActiveAttr);
                }
            }
        }

        if (this.counter) {
            this.counter.innerHTML = (this.activeSlide + 1);
        }
    };



    this.incrementalSlide = function(runX) {
        var pctX = (-(this.activeSlide * 100) + Math.round((runX / this.slideWidth) * 100));
        this.setTargetLeftPosition(pctX);
    };



    this.setTargetLeftPosition = function(x) {
        var xpos = x + '%';
        setCssTransform(this.target, xpos, '0%');
    };



    this.buildPager = function() {
        for (var i = 0; i < this.slides.length; i++) {
            var pagit = document.createElement('div');
            pagit.className = this.pagerItemClass;
            pagit.setAttribute('slide', i);
            pagit.addEventListener('click', this, false);
            this.pager.appendChild(pagit);
        }
        this.gotoActiveSlide();
    };



    this.buildCounter = function() {
        var cCrrnt = document.createElement('div');
        var cSlash = document.createElement('div');
        var cTotal = document.createElement('div');

        cCrrnt.className = this.counterItemClass;
        cSlash.className = this.counterItemClass;
        cTotal.className = this.counterItemClass;

        cCrrnt.innerHTML = (this.activeSlide + 1);
        cSlash.innerHTML = '/';
        cTotal.innerHTML = this.slides.length;

        this.counterCase.appendChild(cCrrnt);
        this.counterCase.appendChild(cSlash);
        this.counterCase.appendChild(cTotal);

        this.counter = cCrrnt;
    };



    this.startAutoslide = function() {
        if (!this.autoslideIntervalID) {
            var f = this.goForwardOne.bind(this);
            this.autoslideIntervalID = window.setInterval(f, this.autoslideSecs);
            // console.log("Starting autoslide with " + this.autoslideSecs + " and intervalID " + this.autoslideIntervalID);
        }
    }

    this.stopAutoslide = function() {
        if (this.autoslideIntervalID) {
            // console.log("Ending autoslide with " + this.autoslideSecs + " and intervalID " + this.autoslideIntervalID);
            window.clearInterval(this.autoslideIntervalID);
            this.autoslideIntervalID = null;
        }
    }

    this.resetAutoslide = function() {
        this.stopAutoslide();
        this.startAutoslide();
    }




    /* This needs to stay down here. */
    this.init(params);
}
