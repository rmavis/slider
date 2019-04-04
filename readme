# Slider

This is a simple class for building a slideshow. It does very little---all styling, animation, etc, is handled in the HTML and CSS.


## Usage

Initialize a new slider by passing Slider a config object:

    var _slider = new Slider({
        slider: element,
        slides: [elements],
        buttons: {
            fw: element,
            bk: element,
        },
        pager: {
            wrap: element,
            dotClass: string,
            activeClass: string,
        },
        events: {
            useKeyboard: boolean,
            beforeAlign: function,
            afterAlign: function,
        },
        align: "(left|center|right|top|middle|bottom)",
        cycle: boolean,
        autoslide: int,
    });

For full config documentation, see the `getDefaultConf` function.

Slider will add event listeners to the `slider` and `buttons` elements. If `pager` is present, it will also create clickable elements that change the slider state. The class list of the active dot will contain both the `dotClass` and `activeClass`.

Alignment of the current slide is set by the `align` property. If none of is given, `center` will be assumed.

If the `autoslide` property is present, it must be the amount of milliseconds to wait before automatically advancing the slides.

Click-and-drag functionality is handled by an external library, such as Swiper. For Swiper, an initialization could be like:

    new Swiper({
        target: slider_wrap_elem,
        onDrag: function (delta) {
            slider_instance.dragBy(delta.x.inc);
        },
        onEnd: function (delta) {
            if (delta.v.run == 'left') {
                slider_instance.goFw();
            } else {
                slider_instance.goBk();
            }
        },
    });

See sample HTML in `sample.html` and CSS in `styles.css`.

For the class's full public API, see the `getPublicProperties` function.


## Dependencies

None.
