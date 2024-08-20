There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 375,
      height: 260,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    new ResizeObserver(function(entries) {
      const rect = entries[0].contentRect;
      There.fsCommand('setWidthHeight', {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      });
    }).observe($('.trade')[0]);
  },

  onVariable: function(name, value) {
    if (name == 'there_teleporting') {
      $('.trade').attr(name.replace('there_', 'data-'), value);
    }

    if (name == 'there_ready' && value == 1) {
      There.fetchTradeXml();
    }
  },

  fetchTradeXml: function() {
    There.data.ident = Math.random();
    let query = {
      Oid: There.variables.there_pilotdoid,
      request: There.data.ident,
    };
    if (There.data.version != undefined) {
      query.lastVer = There.data.version;
    }
    There.fetch({
      path: '/VersionedXmlSvc/tradeVerCommand',
      query: query,
      throttle: 60,
      dataType: 'text',
      success: function(text) {
        // The trade XML contains elements with numeric names, which is invalid.
        text = text.replaceAll(/(<\/?)([0-9]+>)/g, '$1Poid$2');
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        There.onTradeXml(xml);
      },
      complete: function() {
        There.setNamedTimer('fetch', 1000, There.fetchTradeXml);
      },
    });
  },

  onTradeXml: function(xml) {
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.version = xmlVersion.childNodes[0].nodeValue;
    const xmlData = xmlAnswer.getElementsByTagName('Trade')[0];
    let data = [];
    for (let i of [1, 2]) {
      const xmlInfo = xmlData.getElementsByTagName(`Trader${i}Info`)[0];
      if (xmlInfo != undefined) {
        let info = {
            doid: Number(xmlInfo.getElementsByTagName('AvatarDoid')[0].childNodes[0].nodeValue),
            name: xmlInfo.getElementsByTagName('AvatarName')[0].childNodes[0].nodeValue,
            state: Number(xmlInfo.getElementsByTagName('State')[0].childNodes[0].nodeValue),
            offers: [],
            therebucks: 0,
        };
        const xmlOffers = xmlData.getElementsByTagName(`Trader${i}Offers`)[0];
        if (xmlOffers != undefined) {
          for (let xmlChild of xmlOffers.childNodes) {
            if (xmlChild.nodeName.startsWith('Poid')) {
              info.offers.push({
                poid: Number(xmlChild.nodeName.substr(4)),
                pid: Number(xmlChild.getElementsByTagName('Pid')[0]?.childNodes[0]?.nodeValue ?? 0),
                name: xmlChild.getElementsByTagName('ObjectName')[0]?.childNodes[0]?.nodeValue ?? '',
                price: Number(xmlChild.getElementsByTagName('OriginalPrice')[0]?.childNodes[0]?.nodeValue ?? 0),
                type: Number(xmlChild.getElementsByTagName('ProductType')[0]?.childNodes[0]?.nodeValue ?? 0),
                date: new Date((xmlChild.getElementsByTagName('PurchaseDate')[0]?.childNodes[0]?.nodeValue ?? '').replace(' ', 'T') + 'Z'),
                isOffered: (xmlChild.getElementsByTagName('Offered')[0]?.childNodes[0]?.nodeValue ?? 0) == 1,
              });
            } else if (xmlChild.nodeName == 'Therebucks') {
              info.therebucks = Number(xmlChild.childNodes[0].nodeValue);
            }
          }
        }
        data.push(info);
      }
    }
    let index = data.findIndex(e => e.doid == There.variables.there_pilotdoid);
    if (index >= 0) {
      const menu = Object.assign({}, There.data.menu);
      There.clearContextMenu();
      let infoGive = data[index];
      let infoTake = data[1 - index];
      $('.trade').attr('data-givestep', infoGive.state).attr('data-takestep', infoTake.state);
      if (infoGive.state == 2) {
        $('.footer .button[data-id="offer"]').attr('data-enabled', '1');
      } else if (infoGive.state == 3) {
        $('.footer .button[data-id="retract"]').attr('data-enabled', '1');
      }
      if (infoGive.state == 3 && (infoTake.state == 3 || infoTake.state == 4)) {
        $('.footer .button[data-id="confirm"]').attr('data-enabled', '1');
      } else {
        $('.footer .button[data-id="confirm"]').attr('data-enabled', '0');
      }
      for (let panel of [{id: 'give', info: infoGive}, {id: 'take', info: infoTake}]) {
        let items = [];
        if (panel.info.therebucks > 0) {
          let spans = [];
          spans.push(`${panel.info.therebucks.toLocaleString()} Therebuck${panel.info.therebucks == 1 ? '' : 's'}`);
          items.push({
            poid: 0,
            spans: spans,
          });
        }
        for (let offer of panel.info.offers) {
          if (offer.isOffered) {
            let spans = [];
            spans.push(offer.name);
            if (!isNaN(offer.date.getDay())) {
              spans.push(`Date Purchased: ${offer.date.getMonth() + 1}/${offer.date.getDate()}/${offer.date.getFullYear()}`);
            }
            items.push({
              poid: offer.poid,
              spans: spans,
            });
          }
        }
        let divItems = $(`.trade .panel[data-id="${panel.id}"] .items`);
        $(divItems).empty();
        if (items.length == 0) {
          $(divItems).attr('data-count', '0');
        } else if (items.length < 4) {
          $(divItems).attr('data-count', '1');
        } else {
          $(divItems).attr('data-count', '2');
        }
        for (let item of items) {
          let divItem = $('<div class="item"></div>');
          $(divItem).data('poid', item.poid);
          for (let span of item.spans) {
            let spanItem = $('<span></span>');
            $(spanItem).text(span);
            $(divItem).append($(spanItem));
          }
          $(divItems).append($(divItem));
          if (panel.id == 'give') {
            $(divItem).on('mouseover', function() {
              const timeout = $('.contextmenu').attr('data-active') == 1 ? 500 : 350;
              There.setNamedTimer('context-menu', timeout, function() {
                if (There.data.menu.poid != item.poid) {
                  There.setupContextMenu(divItem, item.poid);
                }
              });
            }).on('mousemove', function(event) {
              event.stopPropagation();
            });
          }
        }
        if (panel.id == 'give' && menu.poid != undefined) {
          const divItem = $(divItems).find(`.item[data-id=${menu.poid}]`).first();
          if ($(divItem).length > 0) {
            const top = $(divItem).offset().top;
            if (menu.top == top) {
              There.setupContextMenu(divItem, menu.poid);
            }
          }
        }
      }
    }
  },

  clearContextMenu: function() {
    There.clearNamedTimer('context-menu');
    $('.contextmenu').attr('data-active', '0');
    $('.trade .panel .items .item').attr('data-hover', '0');
    There.data.menu = {};
  },

  setupContextMenu: function(divItem, poid) {
    let divContextMenu = $('.contextmenu');
    $(divContextMenu).find('.item').remove();
    $('.trade .panel .items .item').attr('data-hover', '0');
    let divMenuItem = $('<div class="item"></div>');
    let divSound = $('<div class="sound"></div>');
    $(divMenuItem).attr('data-enabled', '1');
    $(divSound).text('Remove');
    $(divMenuItem).append($(divSound)).appendTo($(divContextMenu));

    $(divSound).on('mouseover', function() {
      There.playSound('enabled menu item rollover');
    });
    $(divMenuItem).on('mousedown', function(event) {
      event.stopPropagation();
    }).on('click', function() {
      There.playSound('menu item activate');
      if (poid > 0) {
        There.fsCommand('removeObject', {
          Object: poid,
        });
      } else {
        There.fsCommand('setTherebucks', {
          Amount: 0,
        });
      }
    });
    const maxY = $('.trade').height() - $(divContextMenu).height() - 4;
    const top = $(divItem).offset().top;
    const y = Math.min(top + 7, maxY);
    $(divContextMenu).css('top', y).attr('data-active', '1');
    $(divItem).attr('data-hover', '1');
    There.data.menu = {
      poid: poid,
      top: top,
    };
  },
});

$(document).ready(function() {
  $('.titlebar').on('mousedown', function(event) {
    if (event.which == 1) {
      There.fsCommand('beginDragWindow');
    }
    There.clearContextMenu();
    event.preventDefault();
    event.stopPropagation();
  });

  $('.titlebar .button').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.footer .button').on('mouseover', function() {
    There.playSound('save button');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.trade').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.trade').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpTradeUrl',
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
    There.fsCommand('changeState', {
      AvatarState: 5,
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.footer .button[data-id="offer"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.fsCommand('changeState', {
      AvatarState: 3,
    });
  });

  $('.footer .button[data-id="retract"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.fsCommand('changeState', {
      AvatarState: 2,
    });
  });

  $('.footer .button[data-id="confirm"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.fsCommand('changeState', {
      AvatarState: 4,
    });
    $('.footer .button[data-id="retract"]').attr('data-enabled', '0');
    $('.footer .button[data-id="confirm"]').attr('data-enabled', '0');
  });

  $('.titlebar .buttons .button').on('mousedown', function() {
    There.clearContextMenu();
  });

  $('.contextmenu').on('mousemove', function(event) {
    There.clearNamedTimer('context-menu');
    event.stopPropagation();
  });

  $('.trade').on('mouseleave', function(event) {
    There.setNamedTimer('context-menu', 500, function() {
      There.clearContextMenu();
    });
  }).on('mousemove', function() {
    There.setNamedTimer('context-menu', 350, function() {
      There.clearContextMenu();
    });
  });

  $('.trade .panel .items').on('scroll', function() {
    There.clearContextMenu();
  });
});