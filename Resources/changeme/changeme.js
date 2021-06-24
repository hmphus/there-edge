class ChangeMeSlider {
  constructor(element) {
    let self = this;
    self.element = element;
    self.knob = $(self.element).find('.knob');
    self.width = $(self.element).width();
    self.minimum = $(self.element).data('minimum') ?? 0;
    self.maximum = $(self.element).data('maximum') ?? 100;
    self.value = $(self.element).data('value') ?? self.minimum;
    self.active = false;
    $(self.knob).on('mousedown', function(event) {
      if (event.which == 1) {
        self.active = true;
        self.offsetX = event.pageX - $(self.knob).position().left;
      }
    });
    $(document).on('mousemove', function(event) {
      if (self.active) {
        $(self.knob).css({
          left: Math.min(Math.max(0, event.pageX - self.offsetX), self.width),
        });
      }
    }).on('mouseup', function() {
      if (self.active) {
        self.active = false;
        console.log(self.value);
      }
    });
  }

  get value() {
    let self = this;
    return $(self.knob).position().left / self.width * (self.maximum - self.minimum) + self.minimum;
  }

  set value(value) {
    let self = this;
    $(self.knob).css({
      left: (value - self.minimum) / (self.maximum - self.minimum) * self.width,
    });
  }
}

There.init({
  data: {
    sliders: [],
    versions: {},
    wardrobe: {},
  },

  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 200,
      height: 548,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    new ResizeObserver(function(entries) {
      const rect = entries[0].contentRect;
      There.fsCommand('setWidthHeight', {
        width: rect.width,
        height: rect.height,
      });
    }).observe($('.changeme')[0]);

    There.fsCommand('devtools');
  },

  onVariable: function(name, value) {
    if (name == 'there_treatmentsenabled') {
      if (value != $('.changeme').attr('there_treatmentsenabled')) {
        if (value == 0) {
          if ($('.changeme').attr('data-section') != 'wardrobe' && $('.changeme').attr('data-area') != 'looksets') {
            $('.sections .section[data-section="wardrobe"] .tab').trigger('click');
          }
        } else {
          if ($('.changeme').attr('data-section') != 'body') {
            $('.sections .section[data-section="body"] .tab').trigger('click');
          }
        }
      }
    }
    if (name == 'there_teleporting' || name == 'there_treatmentsenabled') {
      $('.changeme').attr(name.replace('there_', 'data-'), value);
    }
    if (name == 'there_ready' && value == 1) {
      There.fetchWardrobeXml('head');
      There.fetchWardrobeXml('face');
      There.fetchWardrobeXml('tops');
      There.fetchWardrobeXml('bottoms');
      There.fetchWardrobeXml('accessories');
      There.fetchWardrobeXml('footwear');
      There.fetchWardrobeXml('outfits');
      There.fetchWardrobeXml('looksets');
    }
  },

  fetchWardrobeXml: async function(area) {
    await There.fetchWardrobeContentsXml(area);
    await There.fetchWardrobeWearsetXml(area);
    if (There.getWardrobeAreaKey($('.changeme').attr('data-area')) == area) {
      There.setupWardrobe();
    }
    There.setNamedTimer(`fetch-wardrobe-${area}`, 1000, function() {
      There.fetchWardrobeXml(area);
    });
  },

  getWardrobeAreaKey: function(area) {
    switch (area) {
      case 'hairstyles':
        return 'head';
      case 'grooming':
      case 'cosmetics':
        return 'face';
      default:
        return area;
    }
  },


  getWardrobeContentsKey: function(area, folder) {
    return `wardrobe_contents_${There.getWardrobeAreaKey(area)}_${folder ?? 1}`;
  },

  fetchWardrobeContentsXml: async function(area, folder) {
    let query = {
      Oid: folder ?? 1,
    };
    const key = There.getWardrobeContentsKey(area, folder);
    if (There.data.versions[key] != undefined) {
      query.LastVer = There.data.versions[key];
    }
    let promises = [];
    await There.fetchAsync({
      path: `/VersionedXmlSvc/${area.charAt(0).toUpperCase()}${area.slice(1)}Contents`,
      query: query,
      dataType: 'xml',
      success: function(xml) {
        promises = There.onWardrobeContentsXml(xml, key, area);
      },
      complete: async function() {
        await Promise.all(promises);
      },
    });
  },

  onWardrobeContentsXml: function(xml, key, area) {
    let promises = [];
    let wardrobe = {
      menus: [],
      entries: [],
    };
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return promises;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.versions[key] = xmlVersion.childNodes[0].nodeValue;
    const xmlContents = xmlAnswer.getElementsByTagName('contents')[0];
    for (let xmlChild of xmlContents.childNodes) {
      switch (xmlChild.nodeName) {
        case 'menu': {
          for (let xmlMenu of xmlChild.getElementsByTagName('item')) {
            let menu = {
              text: xmlMenu.getElementsByTagName('text')[0].childNodes[0].nodeValue,
              behavior: Number(xmlMenu.getElementsByTagName('behavior')[0].childNodes[0].nodeValue),
            };
            menu.key = menu.text.toLowerCase();
            wardrobe.menus.push(menu);
          }
          break;
        }
        case 'status_strings': {
          break;
        }
        case 'item': {
          let entry = {
            type: 'item',
            poid: Number(xmlChild.getElementsByTagName('poid')[0].childNodes[0].nodeValue),
            name: xmlChild.getElementsByTagName('name')[0].childNodes[0].nodeValue,
            icon: xmlChild.getElementsByTagName('icon')[0].childNodes[0].nodeValue.replace(/^ChangeMe\/Icons\/(.*)\.(swf|png)$/i, '$1'),
            unmenus: [],
            unwearable: false,
          };
          for (let xmlDisabled of xmlChild.getElementsByTagName('disabled')) {
            entry.unmenus.push(Number(xmlDisabled.childNodes[0].nodeValue));
          }
          let xmlUnwearable = xmlChild.getElementsByTagName('unwearable')[0];
          if (xmlUnwearable != undefined && xmlUnwearable.childNodes[0].nodeValue == 1) {
            entry.unwearable = true;
          }
          wardrobe.entries.push(entry);
          break;
        }
        case 'drawer': {
          let entry = {
            type: 'drawer',
            uid: Number(xmlChild.getElementsByTagName('uid')[0].childNodes[0].nodeValue),
            name: xmlChild.getElementsByTagName('name')[0].childNodes[0].nodeValue,
            count: Number(xmlChild.getElementsByTagName('num_items')[0].childNodes[0].nodeValue ?? 0),
            open: false,
          };
          wardrobe.entries.push(entry);
          if (There.data.wardrobe[There.getWardrobeContentsKey(area, entry.uid)] == undefined) {
            promises.push(There.fetchWardrobeContentsXml(area, entry.uid));
          }
          break;
        }
      }
    }
    There.data.wardrobe[key] = wardrobe;
    return promises;
  },

  getWardrobeWearsetKey: function(area) {
    return `wardrobe_wearset_${There.getWardrobeAreaKey(area)}`;
  },

  fetchWardrobeWearsetXml: async function(area) {
    let query = {
      Oid: 1,
    };
    const key = There.getWardrobeWearsetKey(area);
    if (There.data.versions[key] != undefined) {
      query.LastVer = There.data.versions[key];
    }
    await There.fetchAsync({
      path: `/VersionedXmlSvc/${area.charAt(0).toUpperCase()}${area.slice(1)}Wearset`,
      query: query,
      dataType: 'xml',
      success: function(xml) {
        There.onWardrobeWearsetXml(xml, key, area);
      },
    });
  },

  onWardrobeWearsetXml: function(xml, key, area) {
    let wardrobe = There.data.wardrobe[There.getWardrobeContentsKey(area)];
    wardrobe.poids = [];
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.versions[key] = xmlVersion.childNodes[0].nodeValue;
    const xmlWearset = xmlAnswer.getElementsByTagName('wearset')[0];
    for (let xmlItem of xmlWearset.getElementsByTagName('item')) {
      wardrobe.poids.push(Number(xmlItem.getElementsByTagName('poid')[0].childNodes[0].nodeValue));
    }
  },

  setupWardrobe: function() {
    const section = $('.changeme').attr('data-section');
    const area = $('.changeme').attr('data-area');
    let divItems;
    if (section == 'wardrobe') {
      divItems = $('.section[data-section="wardrobe"] .items');
    } else if (area == 'looksets') {
      divItems = $('.section[data-section="body"] .items[data-area="looksets"]');
    } else {
      return;
    }
    $(divItems).attr('data-count', '0').find('.item').remove();
    const wardrobe = There.data.wardrobe[There.getWardrobeContentsKey(area)];
    if (wardrobe == undefined) {
      return;
    }
    let maxIndent = 0;
    for (let entry of wardrobe.entries) {
      maxIndent = Math.max(There.setupWardrobeEntry(divItems, section, area, wardrobe, wardrobe.menus, entry, 0), maxIndent);
    }
    $(divItems).find('.item').css('--max-indent', maxIndent);
    const count = $(divItems).find('.item').length;
    if (area == 'outfits' || area == 'looksets') {
      $(divItems).attr('data-count', count < 14 ? '1' : '2');
    } else {
      $(divItems).attr('data-count', count < 5 ? '1' : '2');
    }
  },

  setupWardrobeEntry: function(divItems, section, area, wardrobe, menus, entry, indent) {
    let maxIndent = indent;
    let divItem = $('<div class="item"></div>');
    let divIcon = $('<div class="icon"></div>');
    let divName = $('<div class="name"></div>');
    switch (entry.type) {
      case 'item': {
        $(divItem).attr('data-id', entry.poid);
        $(divItem).attr('data-selected', wardrobe.poids.includes(entry.poid) ? '1' : '0');
        $(divItem).attr('data-unwearable', entry.unwearable ? '1' : '0');
        $(divIcon).css('background-image', `url(iconspng/${entry.icon}.png)`);
        $(divName).text(entry.name);
        break;
      }
      case 'drawer': {
        $(divItem).attr('data-id', entry.uid);
        $(divItem).attr('data-drawer', entry.open ? 'open' : 'closed');
        $(divName).text(entry.name);
        break;
      }
    }
    $(divItem).css('--indent', indent);
    $(divItem).append($(divIcon)).append($(divName)).appendTo($(divItems));
    switch (entry.type) {
      case 'item': {
        $(divItem).on('mouseover', function() {
          const timeout = $('.contextmenu').attr('data-active') == 1 ? 500 : 350;
          There.setNamedTimer('context-menu', timeout, function() {
            if ($('.contextmenu').attr('data-id') != entry.poid) {
              There.setupContextMenu(divItem, section, area, menus, entry);
            }
          });
        }).on('mousemove', function(event) {
          event.stopPropagation();
        }).on('click', function() {
          There.playSound('menu item activate');
        });
        break;
      }
      case 'drawer': {
        $(divItem).on('click', function() {
          There.clearContextMenu();
          There.playSound('control down');
          entry.open = !entry.open;
          There.setupWardrobe();
        });
        if (entry.open) {
          const drawerWardrobe = There.data.wardrobe[There.getWardrobeContentsKey(area, entry.uid)];
          if (drawerWardrobe != undefined) {
            for (let drawerEntry of drawerWardrobe.entries) {
              maxIndent = Math.max(There.setupWardrobeEntry(divItems, section, area, wardrobe, drawerWardrobe.menus, drawerEntry, indent + 1), maxIndent);
            }
          }
        }
        break;
      }
    }
    return maxIndent;
  },

  clearContextMenu: function() {
    There.clearNamedTimer('context-menu');
    $('.contextmenu').attr('data-active', '0').attr('data-id', '');
    $('.sections .section .panel .items .item').attr('data-hover', '0');
  },

  setupContextMenu: function(divItem, section, area, menus, entry) {
    let divContextMenu = $('.contextmenu');
    $(divContextMenu).find('.item').remove();
    $('.sections .section .panel .items .item').attr('data-hover', '0');
    for (let index in menus) {
      let menu = menus[index];
      let enabled = !entry.unmenus.includes(Number(index));
      if (enabled && entry.unwearable && (menu.behavior == 2 || menu.behavior == 3)) {
        enabled = false;
      }
      if (enabled) {
        const selected = $(divItem).attr('data-selected') == 1;
        if (selected && menu.behavior == 2) {
          enabled = false;
        }
        if (!selected && menu.behavior == 3) {
          enabled = false;
        }
      }
      if (enabled && area == 'looksets') {
        if (menu.key == 'give' || menu.key == 'delete') {
          enabled = false;
        }
      }
      let divMenuItem = $('<div class="item"></div>');
      let divSound = $('<div class="sound"></div>');
      $(divMenuItem).attr('data-index', index);
      $(divMenuItem).attr('data-enabled', enabled ? '1' : '0');
      $(divSound).text(menu.text);
      $(divMenuItem).append($(divSound)).appendTo($(divContextMenu));
      if (enabled) {
        $(divSound).on('mouseover', function() {
          There.playSound('enabled menu item rollover');
        });
        $(divMenuItem).on('mousedown', function(event) {
          There.playSound('menu item activate');
          event.stopPropagation();
        });
      } else {
        $(divSound).on('mouseover', function() {
          There.playSound('disabled menu item rollover');
        });
      }
    }
    let maxY = $('.changeme').height() - $(divContextMenu).height() - 4;
    let y = Math.min($(divItem).offset().top + 4, maxY);
    $(divContextMenu).css('top', y).attr('data-active', '1').attr('data-id', entry.poid);
    $(divItem).attr('data-hover', '1');
  },
});

$(document).ready(function() {
  $('.titlebar').on('mousedown', function(event) {
    There.fsCommand('beginDragWindow');
    There.clearContextMenu();
    event.preventDefault();
    event.stopPropagation();
  });

  $('.titlebar .button, .footer .button').on('mouseover', function() {
    if ($(this).attr('data-id') == 'save') {
      There.playSound('save button');
    } else {
      There.playSound('control rollover');
    }
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.areas .area, .sections .section .tab').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  });

  $('.subareas .subarea').on('mouseover', function() {
    There.playSound('enabled menu item rollover');
  });

  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.changeme').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.changeme').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="help"]').on('click', function() {
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.sections .section .tab').on('click', function() {
    const section = $(this).parent().data('section');
    $('.changeme').attr('data-section', section);
    if (section == 'wardrobe') {
      $('.areas .area[data-section="wardrobe"][data-area="hairstyles"]').trigger('click');
    }
    if (section == 'body') {
      $('.areas .area[data-section="body"][data-area="head"]').trigger('click');
    }
  });

  $('.areas .area').on('click', function() {
    const area = $(this).data('area');
    $('.changeme').attr('data-area', area);
    $('.sections .section .panel .title').text($(this).data('title'));
    if (area == 'face') {
      $('.changeme').attr('data-subarea', 'eyes-ears');
    }
    There.setupWardrobe();
  });

  $('.subareas').on('mousedown', function(event) {
    $('.subareas').attr('data-active', '1');
    event.stopPropagation();
  });

  $('.subareas .subarea').on('click', function(event) {
    const subarea = $(this).data('subarea');
    $('.changeme').attr('data-subarea', subarea);
    $('.subareas').attr('data-active', '0');
    There.playSound('menu item activate');
    event.stopPropagation();
  });

  $('.changeme').on('mousedown', function() {
    $('.subareas').attr('data-active', '0');
  });

  $('.sections .section[data-section="body"] .panel .editor[data-area="skin"] .item').on('click', function() {
    $(this).parent().find('.item').attr('data-selected', '0');
    $(this).attr('data-selected', '1');
  });

  $('.titlebar .buttons .button, .sections .section .tab, .footer .button, .areas .area').on('mousedown', function() {
      There.clearContextMenu();
  });

  $('.contextmenu').on('mousemove', function(event) {
    There.clearNamedTimer('context-menu');
    event.stopPropagation();
  });

  $('.changeme').on('mouseleave', function(event) {
    There.setNamedTimer('context-menu', 500, function() {
      There.clearContextMenu();
    });
  }).on('mousemove', function() {
    There.setNamedTimer('context-menu', 350, function() {
      There.clearContextMenu();
    });
  });

  $('.section[data-section="wardrobe"] .items, .section[data-section="body"] .items[data-area="looksets"]').on('scroll', function() {
    There.clearContextMenu();
  });

  $('.section[data-section="wardrobe"] .tab').trigger('click');

  $('.slider').each(function(index, element) {
    There.data.sliders.push(new ChangeMeSlider(element));
  });

  $('.footer .button[data-id="undo"]').on('click', function() {
  });

  $('.footer .button[data-id="save"]').on('click', function() {
  });

  $('.footer .button[data-id="shop"]').on('click', function() {
  });

  $('.footer .button[data-id="organize"]').on('click', function() {
  });
});