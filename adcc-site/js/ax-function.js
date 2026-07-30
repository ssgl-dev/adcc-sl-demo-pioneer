function _bodyOnLoad() {
    // _initCalendarInDashboard();
    $('[data-toggle="tooltip"]').tooltip();
    $('[data-toggle="popover"]').popover();
    $('[data-toggle="_popover"]').popover({
        // trigger: 'click',
        // trigger: 'hover',
        trigger: 'focus',
        container: '.body-div',
        html: true,
        template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-body _popover-body"></div></div>',
        content: function () {
            // alert($('#' + $(this).data('content-id')).html());
            return $('#' + $(this).data('content-id')).html();
        }
    });

    setTimeout(function () {
        _loadToViewStartAction();
        _objScrolled($(window), 1, $('._header-container'), '_scrolled');
        _objScrolled($(window), 1, $('._content-container'), '_scrolled');
        // _objScrolled($(window), 1, $('._breadcrumb'), '_scrolled');
        _objScrolled($(window), 100, $('._main-menu'), '_scrolled');
    }, 100)

    // _dummyNgIncludePath();

    $('._icon-tag ._remove').unbind().click(function () {
        // if (confirm('Confirm remove this record?')) {
        $(this).css('border', '1px solid red').parent().remove();
        // }
    })
    _initListTrigger('news-list-trigger');
    _initListTrigger('alerts-list-trigger');
    _initListTrigger('videos-list-trigger');
    _initAAA();
    setTimeout(function () {
        // _initPageTitle();
    }, 100)
    _initSearch();
    // tuning position of bg
    if ($('.full-banner').length > 0) {
        $('._bg').addClass('_bg-home');
    } else {
        $('._bg').removeClass('_bg-home');
    }
}

function _initEventCalendar() {
    if ($('body').hasClass('mobile')) {
        $('.fc-listWeek-button').click();
        $('.fc-dayGridWeek-button').hide();
        $('.fc-dayGridMonth-button').hide();
        $('.fc-view-harness.fc-view-harness-active').css('height', '500px');
    } else {
        $('.fc-dayGridWeek-button').show();
        $('.fc-dayGridMonth-button').show();
    }
    // if ($('body').hasClass('desktop')) {
    //   $('.fc-dayGridMonth-button').click();
    // }
}

function _hlMenu(_id) {
    document.getElementById("menu-" + _id).classList.add("_selected");
}

$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results != null) {
        return results[1];
    } else {
        return null;
    }
}

function _submitSearch() {
    var _tgt = $('._search-bar ._input-text').val();
    var _pathName = window.location.pathname;
    var _path = _pathName.slice(1,6);
    window.location = '/' + _path + '/search-result.html?query=' + _tgt;
}

function _showSubscribeForm() {
    var _obj = $('#subscribe-form');
    var _cs = $('#coming-soon');
    if (_obj.is(":visible")) {
        _obj.hide();
        _cs.show();
    } else {
        _obj.show();
        _cs.hide();
    }
}

function _initSearch() {
    $('._search-bar ._input-text').unbind().keypress(function (e) {
        if (e.which == 13) {
            _submitSearch();
        }
    });
    $('._search-bar ._button').unbind().click(function () {
        _submitSearch();
    });
    $('._search').unbind().click(function () {
        $('._search-bar ._input-text').val('ADCC');
        //test
        _submitSearch();
    });
}

function _initPageTitle() {
    var _hkpf = 'Hong Kong Police Force';
    var _adcc = 'Anti-Deception Coordination Centre (ADCC)';
    if (_getLangFolder() == 'en-hk') {
        $('html').attr('xml:lang', 'en').attr('lang', 'en');
    }
    if (_getLangFolder() == 'zh-hk') {
        _hkpf = '香港警務處';
        _adcc = '反詐騙協調中心 (ADCC)';
        $('html').attr('xml:lang', 'zh-hk').attr('lang', 'zh-hk');
    }
    if (_getLangFolder() == 'zh-cn') {
        _hkpf = '香港警务处';
        _adcc = '反诈骗协调中心 (ADCC)';
        $('html').attr('xml:lang', 'zh-cn').attr('lang', 'zh-cn');
    }
    var _sep = ' | ';
    var _h1Text = '';
    var _h2Text = '';
    var _h1 = $('h1').eq(0);
    var _h2 = $('h2._content-title').eq(0);
    if (_h1.clone().children().remove().end().text() != '') {
        _h1Text = _h1.clone().children().remove().end().text().trim().replace(/\t+/g, '') + _sep;
    }
    if (_h2.clone().children().remove().end().text() != '') {
        _h2Text = _h2.clone().children().remove().end().text().trim().replace(/\t+/g, '') + _sep;
    }
    _alert(_h2Text + _h1Text + _adcc + _sep + _hkpf);
    document.title = _h2Text + _h1Text + _adcc + _sep + _hkpf;
}
var that = null
function getListAtHome(vThat){
    that = vThat
}

function _initSwiperAtHome() {
    var setTimer = setTimeout(function () {
        var latestAlertsSwiper = new Swiper('#latest-alerts', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            observer:true,
            observeParents:true,
            // centeredSlides: true,
            on:{
                click: function(swiper){
                    that.action(swiper.target.closest('.swiper-slide').getAttribute('data-i'))
                }
            },
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.latest-alerts .swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                414: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 3,
                    slidesPerGroup: 3,
                    spaceBetween: 20,
                },
            },
            navigation: {
                nextEl: '.latest-alerts .swiper-button-next',
                prevEl: '.latest-alerts .swiper-button-prev',
            },
            a11y: {
                prevSlideMessage: getSwiperLang(2),
                nextSlideMessage: getSwiperLang(1),
                paginationBulletMessage: getSwiperLang(3),
            },
        })
        let _play = document.querySelector(".latest-alerts .swiper-button-play");
        let _stop = document.querySelector(".latest-alerts .swiper-button-stop");
        _play.style.display = "none";
        _play.onclick = function () {
            latestAlertsSwiper.autoplay.start();
            _play.style.display = "none";
            _stop.style.display = "inline-flex";
        };
        _stop.onclick = function () {
            latestAlertsSwiper.autoplay.stop();
            _play.style.display = "inline-flex";
            _stop.style.display = "none";
        };
    }, 400);
}

function _alert(_msg) {
    console.log(_msg);
}

function _initAAA() {
    $('._aaa ._aaa-s').unbind().click(function () {
        $('html, body').addClass('_small-font').removeClass('_large-font');
        _ws.set('aaa', 's');
    });
    $('._aaa ._aaa-m').unbind().click(function () {
        $('html, body').removeClass('_small-font').removeClass('_large-font');
        _ws.set('aaa', 'm');
    });
    $('._aaa ._aaa-l').unbind().click(function () {
        $('html, body').addClass('_large-font').removeClass('_small-font');
        _ws.set('aaa', 'l');
    });
    if (_ws.get('aaa') == undefined) {
        _ws.set('aaa', 'm');
    } else {
        if (_ws.get('aaa') == 's') {
            $('html, body').addClass('_small-font').removeClass('_large-font');
        }
        if (_ws.get('aaa') == 'm') {
            $('html, body').removeClass('_small-font').removeClass('_large-font');
        }
        if (_ws.get('aaa') == 'l') {
            $('html, body').addClass('_large-font').removeClass('_small-font');
        }
    }
}

function _initListTrigger(_id) {
    var _this = $("#" + _id);
    if (_this.length >= 1) {
        _this.unbind().click(function () {
            if ($(this).prop("checked")) {
                _ws.set(_id, "true");
            } else {
                _ws.set(_id, "false");
            }
        });
        if (_ws.get(_id) == undefined) {
            _ws.set(_id, "false");
        } else {
            if (_ws.get(_id) == "true") {
                _this.prop("checked", true);
            } else {
                _this.prop("checked", false);
            }
        }
        $("#" + _id + "-icon")
            .unbind()
            .click(function () {
                _this.click();
            });
    }
}

function _initCalendarInDashboard() {
    if ($('#calendar').length > 0) {
        // alert('asdf');
        // document.addEventListener('DOMContentLoaded', function () {
        var calendarEl = document.getElementById('calendar')
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
        })
        calendar.render()
        // })
    }
}

function getQueryVariable(variable) {
    var query = ''
    if (window.location.toString().indexOf('#') != -1) {
        query = window.location.hash.substring(1)
        if (window.location.toString().indexOf('?') != -1) {
            query = query.split('?')[1]
        }
    } else {
        query = window.location.search.substring(1)
    }
    var vars = query.split('&')
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=')
        if (pair[0] == variable) {
            return pair[1]
        }
    }
    return false
}

function _mAction(_type) {
    var _pathName = window.location.pathname;
    var _path = _pathName.slice(1,6);
    switch (_type) {
        case 'subscribe':
            window.location = '/' + _path + '/subscribe.html'
            break
        case 'result':
            window.location = '#/tms-user-result'
            break
        default:
    }
}

$(function (e) {
    $(this).mousedown(function (e) {
        if (e.ctrlKey) {
            if (e.which == 3) {
                window.location.reload()
            }
        }
        if (e.altKey) {
            if (e.which == 3) {

            }
        }
    })
    $(this).keyup(function (e) {
        var _num = 48
        if (e.altKey) {
            if (e.which >= 48 && e.which <= 59) {
                // alt 1-9
                _num = e.which - 48
                if (_num === 1) {
                } else if (_num === 2) {
                } else if (_num === 3) {
                } else if (_num === 4) {
                } else if (_num === 5) {
                } else if (_num === 6) {
                } else if (_num === 7) {
                } else if (_num === 8) {
                } else if (_num === 9) {
                }
            }
        }
    })
    _initRWD();
    // _dummyMouseKey();
})

function _isChecked(_cId) {
    if (_ws.get(_cId) === undefined) {
        return 'checked';
    }
    return (_ws.get(_cId) === 'true' ? 'checked' : '');
}

function _initMainMenu(_id) {
// 2023/07 ----------------
  $("#" + _id)
    .find("ul > li")
    .each(function () {
      if ($(this).find("ul").length != 0) {
        $(this).addClass("_has-child");
        $(this).click(function () {
          $(this).toggleClass("_opened");
        });
      }
    });

  var _a = $("#" + _id).find("ul > li > a");
  _a.unbind().click(function () {
    if ($(this).next().prop("tagName") == "UL") {
      // console.log("UL");
    } else {
      $("#" + "mobile-menu-trigger").prop("checked", false);
    }
  });
  // 2023/07 ----------------
  $("._main-menu .icon-menu")
    .unbind()
    .click(function (_this) {
      $("#" + "mobile-menu-trigger").click();
    });
  $("._main-menu .icon-close")
    .unbind()
    .click(function (_this) {
      $("#" + "mobile-menu-trigger").click();
    });
  $("._main-menu ._mask")
    .unbind()
    .click(function (_this) {
      $("#" + "mobile-menu-trigger").click();
    });
  // 2023/07 ----------------
  $("._lang em")
    .unbind()
    .mouseover(function (_this) {
      $("#" + "mobile-menu-trigger").prop("checked", false);
    });
  // 2023/07----------------
}

function _initColorModeTrigger(_id) {
    var _t = $('#' + _id);
    $('#_blackWhiteMode, #_colorMode').unbind().click(function () {
        _ws.set('colorMode', this.id);
    });
    if (_ws.get('colorMode') === undefined) {
        $('#' + _id).click();
    } else {
        $('#' + _ws.get('colorMode')).click();
    }
}

function _initMenuTrigger(_id) {
    var _t = $('#' + _id);
    $('#_topMenu, #_sideBar, #_accordion').unbind().click(function () {
        _ws.set('menuType', this.id);
    });
    if (_ws.get('menuType') === undefined) {
        $('#' + _id).click();
    } else {
        $('#' + _ws.get('menuType')).click();
    }
}

function _initRWD() {
    var _bp = [[768, 'mobile'], [960, 'tablet'], [1280, 'desktop'], [1920, 'wide']];

    function _resize() {
        var _r = 'mobile';
        $(_bp).each(function (_i, _elem) {
            if ($(window).width() >= _elem[0]) {
                try {
                    _r = _bp[_i + 1][1]; // next item
                } catch (e) {
                    _r = 'wide';
                }
            }
        })
        $('body').removeClass('mobile tablet desktop wide').addClass(_r);
        _initEventCalendar();
    }

    $(window).resize(function () {
        _resize();
        if ($('body').hasClass('mobile')) {
            $('#_sideBar').click();
        }
        ;
    });
    _resize();
}

function _randId(_x) {
    var _xP = '-'
    var _xS = '-'
    return _xP + _x + Math.floor(Math.random() * 900000 + 1) + _xS
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function _backAction(_type) {
    if (_type !== undefined) {
        window.location = _type
    } else {
        window.history.back()
    }
}

function _downloadFile(num) {
    if (num === 1) {
        if (confirm('Start downloading the PDF file.')) {
            //window.open("doc/doc_dummy.pdf", '_blank');
            _pdf('../doc/doc_dummy.pdf', 'view')
        }
    } else if (num === 2) {
        if (confirm('Start downloading the Excel file.')) {
            window.open('doc/doc_dummy.xls', '_blank')
        }
    } else if (num === 99) {
        if (confirm('Start downloading the Question Template')) {
            window.open('doc/question_template.xls', '_blank')
        }
    } else {
        window.open('doc/doc_dummy.pdf', '_blank')
    }
}

function _initBootstrap() {
    //	alert('_initBootstrap');
    // $('[data-toggle="tooltip"]').tooltip()
    //	$('.dropdown-toggle').dropdown();
}

var _ws = {
    set: function (_name, _value) {
        if (typeof Storage !== 'undefined') {
            try {
                sessionStorage.setItem(_name, _value)
            } catch (err) {
                //console.log(err.message);
            }
        } else {
            //console.log('Sorry! No Web Storage support...');
        }
    },
    get: function (_name) {
        try {
            return sessionStorage[_name]
        } catch (err) {
            //console.log(err.message);
        }
    },
    remove: function (_name) {
        try {
            sessionStorage.removeItem(_name)
        } catch (err) {
            //console.log(err.message);
        }
    }
}

function _getLangFolder() {
    var _href = window.location.href.toString()
    if (_href.indexOf('en-hk') != -1) {
        return 'en-hk'
    }
    if (_href.indexOf('zh-hk') != -1) {
        return 'zh-hk'
    }
    if (_href.indexOf('zh-cn') != -1) {
        return 'zh-cn'
    }
    return 'en-hk'
}

function getSwiperLang(index) {
    var lang = _getLangFolder();
    if (lang === 'en-hk') {
        if (index === 1) {
            return 'Next slide'
        } else if (index === 2) {
            return 'Previous slide'
        } else {
            return 'Go to slide {{index}}'
        }
    } else if (lang === 'zh-hk') {
        if (index === 1) {
            return '下一頁'
        } else if (index === 2) {
            return '上一頁'
        } else {
            return '轉到 {{index}}'
        }
    } else {
        if (index === 1) {
            return '下一页'
        } else if (index === 2) {
            return '上一页'
        } else {
            return '转到 {{index}}'
        }
    }
}

function _getLang() {
    var _body = $('body')
    if (_body.hasClass('lang-en')) {
        return 'en'
    }
    if (_body.hasClass('lang-tc')) {
        return 'tc'
    }
    if (_body.hasClass('lang-sc')) {
        return 'sc'
    }
}

function _changeLang(_to) {
    var _href = window.location.href
    var _curLang = _getLangFolder()
    _href = _href
        .toString()
        .replace('/' + _curLang + '/', '/' + _to + '/')
    window.location = _href
    // window.location.reload()
}

function _loadToViewStartAction() {
    $('.ani-load').addClass('ani-start').removeClass('ani-load');
}

function _scrollToViewStartAction() {
    var _s = $('.scroll-to-view');
    var _tgtTop = 0;
    var _tgtBtm = 0;
    var _scrolled = 0;
    var _wh = $(window).height();

    function _scrollAction() {
        _scrolled = $(this).scrollTop();
        _s.each(function (i) {
            _thisTop = $(this).position().top;
            _thisBottom = _thisTop + $(this).height();
            _thisMiddle = _thisTop + $(this).height() * 0.5;

            if (_thisMiddle > _scrolled + _wh * 0.1 &&
                _thisMiddle < _scrolled + _wh * 0.9) {
                $(this).addClass('scrolled-to-view');
            } else {
                $(this).removeClass('scrolled-to-view');
            }
        })
    }

    $(window).scroll(function () {
        _scrollAction();
    });

    _scrollAction();
}

function _objScrolled(_obj, _objScrolled, _tgt, _cssClass) {
    function _scrollAction() {
        _thisScrolled = $(this).scrollTop();
        if (_thisScrolled > _objScrolled) {
            // console.log(_thisScrolled + '_add_' + _objScrolled);
            _tgt.addClass(_cssClass);
        } else {
            // console.log(_thisScrolled + '_remove_' + _objScrolled);
            _tgt.removeClass(_cssClass);
        }
    }

    _obj.scroll(function () {
        _scrollAction();
    });
}

$(function () {
    _bodyOnLoad();
    // _loadToViewStartAction();
    // _scrollToViewStartAction();
})

function _backAction() {
    window.history.back();
}

function _reloadAction() {
    window.location.reload();
}


function _action(_type, _id, _downloadfile) {
    switch (_type) {
        case 'related-news-list':
            window.location = 'related-news.html'
            break
        case 'videos-list':
            window.location = 'videos.html'
            break
        case 'events-list':
            window.location = 'event.html'
            break
        case 'events-page-list':
            window.location = '../event.html'
            break
        case 'alerts-list':
            window.location = 'alerts.html'
            break
        // case 'fightPopup':
        //   $('#modalFight').modal('show')
        //   break
        case 'eventPopup':
            $('#modalEvent').modal('show')
            break
        // default:
        // code block
    }
}

function _menuAction(_menuName) {
    window.location ='/'+ _getLangFolder()+'/' + _menuName + '.html'
    $('#menu-' + _menuName).addClass('_selected');
}

function _eventAction(_id) {
    $('#modalEventBody').load('event-details/event-' + _id + '.html');
    $('#modalEvent').modal('show');
    // window.location = 'event-detail.php?post=event-2021-04-08-1';
}
