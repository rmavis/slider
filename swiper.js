/*
  SWIPER

  This is a simple class to detect swipes. Its core is largely
  inspired by / adapted from:
  http://www.javascriptkit.com/javatutors/touchevents2.shtml


  USAGE

  To initialize a swiper, pass Swiper an object:

  var swiper = new Swiper({
    target: document.getElementById('whatever'),
    onDrag: someCoolFunction(),
    onEnd: someOtherFunction(),
    distMin: 200,
  });

  Swiper will add mosue and touch event listeners to the `target`
  element. As the user drags around on the element, it will call the
  `onDrag` function, passing it an object that looks like:
  {
    x: {  // The x coordinate.
      start: int,  // The start of the event.
      end: int,  // The end of the event.
      run: int,  // The gross distance traveled.
      mag: int,  // The net distance traveled.
      inc: int,  // The difference between the last event.
    },
    y: {  // The y coordinate.
      start: int,
      end: int,
      run: int,
      mag: int,
      inc: int,
    },
    t: {  // Timestamps.
      start: int,  // When the event started.
      end: int,  // When the event ended.
      run: int,  // The duration.
      inc: int,  // The difference between the last event.
    },
    v: {  // Vector.
      run: string,  // 'left', 'right', 'up', or 'down'
      mag: string,  // same
      over: bool,  // Whether the distance traveled surpassed the `distMin`.
    },
  }

  It will pass the same object to the `onEnd` function when the
  event cancels or ends naturally.


  DEPENDENCIES

  None.


  DETAILS

  #HERE


  TODO
  - test on touch device
  - remove unneeded functions
  - documentation
  - add statements for $conf.log
  - Maybe add a debounce to the events?
*/


function Swiper(params) {

    /*
     * Init, config, etc.
     */

    var $conf = { },
        $delta = { };



    function getDefaultConf() {
        return {
            // The target element.
            target: null,
            // Limit the swipe direction to left/right or up/down.
            // Valid values are `x`, `y`, or falsy. If a truthy value
            // is present and is not `y`, then `x` will be assumed.
            dirLim: null,
            // The minimum number of pixels traveled required to
            // register the swipe direction.
            distMin: 150,
            // The number of pixels the swipe can deviate from a
            // trajectory before changing trajectories.
            distDevLimit: 100,
            // The maximum number of milliseconds a swipe can take.
            // This is not currently checked.
            runTimeMax: false,
            // Neither is this.
            runTimeMin: 100,
            // A function to fire as the swipe occurs.
            onDrag: false,
            // A function to fire when the swipe ends.
            onEnd: false,
            // Want to see messages in the console?
            log: false,
        };
    }



    function getNewDeltas() {
        return {
            x: {
                start: 0,
                end: 0,
                run: 0,
                mag: 0,
                inc: 0,
            },

            y: {
                start: 0,
                end: 0,
                run: 0,
                mag: 0,
                inc: 0,
            },

            t: {
                start: 0,
                end: 0,
                run: 0,
                inc: 0,
            },

            v: {
                run: null,
                mag: null,
                over: false,
            },
        };
    }



    function getPublicProperties() {
        return {
            set: setConfProperty,
            stats: getCurrentDeltas,
            stop: stopTracking,
        };
    }



    function stopTracking() {
        removeListeners($conf.target);
    }



    function getCurrentDeltas() {
        return $delta;
    }



    function setConfProperty(key, val) {
        if ($conf.hasOwnProperty(key)) {
            $conf[key] = val;
            return true;
        }
        else {
            return false;
        }
    }



    function init(arg) {
        $conf = mergeObjects(getDefaultConf(), arg);

        if ($conf.target) {
            addListeners($conf.target);
        }
        else {
            console.log("SWIPER ERROR: no `target` element given.")
        }

        return getPublicProperties();
    }





    /*
     * Swipe functions.
     */

    function startSwipe(evt) {
        $delta = getNewDeltas();

        $delta.t.start = new Date().getTime();

        $delta.x.start = evt.clientX;
        $delta.y.start = evt.clientY;

        trackChanges(evt);

        setElemDraggable($conf.target);
    }



    function trackSwipe(evt) {
        if (trackChanges(evt)) {
            if ($conf.onDrag) {
                $conf.onDrag($delta);
            }
        }
    }



    function endSwipe(evt) {
        trackChanges(evt);

        $delta.t.end = new Date().getTime();

        unsetElemDraggable($conf.target);

        if ($conf.onEnd) {
            $conf.onEnd($delta);
        }
    }



    function trackChanges(evt) {
        // The change since the last change tracked.
        var _delta = {
            x: (evt.clientX - $delta.x.end),
            y: (evt.clientY - $delta.y.end),
        };
        _delta.absX = Math.abs(_delta.x);
        _delta.absY = Math.abs(_delta.y);

        // If there hasn't been a change, don't bother.
        if ((_delta.absX > 0) || (_delta.absY > 0)) {
            // The magnitude must be signed. Left/right and up/down only
            // make sense if it's signed.
            $delta.x.mag = (evt.clientX - $delta.x.start);
            $delta.y.mag = (evt.clientY - $delta.y.start);

            // Increment the run before setting the new ends because the
            // previous ends are needed to calculate the run.
            $delta.x.run += _delta.absX;
            $delta.y.run += _delta.absY;

            // The difference between the current end and the last.
            $delta.x.inc = (evt.clientX - $delta.x.end);
            $delta.y.inc = (evt.clientY - $delta.y.end);

            // Just record the new end points.
            $delta.x.end = evt.clientX;
            $delta.y.end = evt.clientY;

            var _t = new Date().getTime();
            $delta.t.inc = (_t - $delta.t.run);
            $delta.t.run = (_t - $delta.t.start);

            if ($conf.dirLim) {
                if ($conf.dirLim == 'y') {
                    $delta.v.run = (_delta.y < 0) ? 'up' : 'down';
                    $delta.v.mag = ($delta.y.mag < 0) ? 'up' : 'down';
                    var dist_check = $delta.y.mag;
                }
                else {
                    $delta.v.run = (_delta.x < 0) ? 'left' : 'right';
                    $delta.v.mag = ($delta.x.mag < 0) ? 'left' : 'right';
                    var dist_check = $delta.x.mag;
                }
            }
            else {
                $delta.v.run = checkDirection(
                    [_delta.x, 'left', 'right'],
                    [_delta.y, 'up', 'down']
                )[1];

                var _check = checkDirection(
                    [$delta.x.mag, 'left', 'right'],
                    [$delta.y.mag, 'up', 'down']
                );
                var dist_check = _check[0];
                $delta.v.mag = _check[1];
            }

            $delta.v.over = (Math.abs(dist_check) > $conf.distMin) ? true : false;

            return true;
        }
        else {
            return false;
        }
    }



    // Pass this two three-item arrays. Each array must contain a
    // value in its 0th spot, direction names in its 1st and 2nd.
    // The 1st direction should be the result when the direction is
    // negative (left, up). It returns a two-item array containing,
    // 0th, the greater distance, and, 1st, the matching direction.
    function checkDirection(dirA, dirB) {
        if (Math.abs(dirB[0]) < Math.abs(dirA[0])) {
            return [dirA[0], (dirA[0] < 0) ? dirA[1] : dirA[2]];
        }
        else {
            return [dirB[0], (dirB[0] < 0) ? dirB[1] : dirB[2]];
        }
    }





    /*
     * Event-related functions.
     */

    function addListeners(elem) {
        elem.addEventListener('touchstart', handleTouchStart, false);
        elem.addEventListener('mousedown', handleMouseDown, false);

        elem.addEventListener('touchmove', handleTouchMove, false);
        elem.addEventListener('mousemove', handleMouseMove, false);

        elem.addEventListener('touchend', handleTouchEnd, false);
        elem.addEventListener('mouseup', handleMouseUp, false);

        elem.addEventListener('touchcancel', handleTouchEnd, false);
        elem.addEventListener('mouseout', handleMouseOut, false);
    }


    function removeListeners(elem) {
        elem.removeEventListener('touchstart', handleTouchStart);
        elem.removeEventListener('mousedown', handleMouseDown);

        elem.removeEventListener('touchmove', handleTouchMove);
        elem.removeEventListener('mousemove', handleMouseMove);

        elem.removeEventListener('touchend', handleTouchEnd);
        elem.removeEventListener('mouseup', handleMouseUp);

        elem.removeEventListener('touchcancel', handleTouchEnd);
        elem.removeEventListener('mouseout', handleMouseOut);
    }


    function checkEvent(evt) {
        if (!evt) {var evt = window.event;}
        evt.stopPropagation();
        return evt;
    }


    function handleTouchStart(evt) {
        evt = checkEvent(evt);
        startSwipe(evt.changedTouches[0]);
    }


    function handleMouseDown(evt) {
        evt = checkEvent(evt);
        evt.preventDefault();
        startSwipe(evt);
    }


    function handleTouchMove(evt) {
        evt = checkEvent(evt);
        evt.preventDefault();

        // Send the touch object instead of the event. Touch objects
        // have `client(X|Y)` properties, which `trackChanges` needs.
        trackSwipe(evt.changedTouches[0]);
    }


    function handleMouseMove(evt) {
        if (isDragging($conf.target)) {
            evt = checkEvent(evt);
            evt.preventDefault();
            trackSwipe(evt);
        }
    }


    function handleTouchEnd(evt) {
        endSwipe(checkEvent(evt));
    }


    function handleMouseUp(evt) {
        if (isDragging($conf.target)) {
            endSwipe(checkEvent(evt));
        }
    }


    function handleMouseOut(evt) {
        evt = checkEvent(evt);

        if ((isDragging($conf.target)) &&
            (isMouseOffTarget(evt, $conf.target))) {
            endSwipe(evt);
        }
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



    // function shouldPreventDefault(evt) {
    //     var tagName = evt.target.tagName;

    //     // This could be expanded.
    //     var badTags = ['IMG'];

    //     for (var i = 0; i < badTags.length; i++) {
    //         if (badTags[i] == tagName) {
    //             return true;
    //         }
    //     }

    //     return false;
    // }



    function setElemDraggable(elem) {
        elem.setAttribute('draggable', 'draggable');
    }



    function unsetElemDraggable(elem) {
        elem.removeAttribute('draggable');
    }



    function isDragging(elem) {
        return (elem.getAttribute('draggable'));
    }



    function isMouseOffTarget(evt, elem) {
        var targ = null;

        if (evt.type == 'mouseout') {
            targ = evt.relatedTarget || evt.fromElement;
        }
        else if (evt.type == 'mouseover') {
            targ = evt.target;
        }

        if (targ) {
            while ((targ != elem) &&
                   (targ != document) &&
                   (targ != document.body)) {
                targ = targ.parentNode;
            }
        }

        return (targ !== elem);
    }





    // This needs to stay down here.
    return init(params);
}
