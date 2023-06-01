class ChangeMeSlider {
  constructor(element, callback) {
    let self = this;
    self.element = element;
    self.knob = $(self.element).find('.knob');
    self.width = $(self.element).width();
    self.ids = $(self.element).data('id').split(',');
    self.categories = $(self.element).data('category').split(',');
    self.reverse = $(self.element).data('reverse') == 1;
    self.envelopes = $(self.element).data('envelope');
    self.multipliers = $(self.element).data('multiplier');
    self.values = self.ids.map(e => 0);
    self.refresh();
    self.callback = callback;
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
        const previousValues = self.values.slice();
        self.splitValues();
        self.callback(self, previousValues);
      }
    });
    $(self.element).on('mousedown', function(event) {
      if (event.which == 1 && !self.active) {
        $(self.knob).animate({
          left: Math.min(Math.max(0, event.offsetX - 5), self.width),
        }, 200, 'swing', function() {
          const previousValues = self.values.slice();
          self.splitValues();
          self.callback(self, previousValues);
        });
      }
    });
  }

  setValue(id, value) {
    let self = this;
    const index = self.ids.indexOf(id);
    if (index < 0) {
      return;
    }
    self.values[index] = value;
    self.refresh();
  }

  splitValues() {
    let self = this;
    let value = $(self.knob).position().left / self.width;
    if (self.reverse) {
      value = 1.0 - value;
    }
    if (self.envelopes != undefined) {
      for (let index in self.envelopes) {
        const envelope = self.envelopes[index];
        const count = envelope.length - 1;
        const step = 1.0 / count;
        const i0 = Math.floor(value * count);
        const i1 = Math.min(i0 + 1, count);
        const t1 = (value - i0 * step) / step;
        const t0 = 1.0 - t1;
        self.values[index] = (envelope[i0] * t0 + envelope[i1] * t1) * self.multipliers[index];
      }
    } else if (self.values.length == 1) {
      self.values[0] = value;
    } else if (self.values.length == 2) {
      value = (value - 0.5) * 2.0;
      self.values[0] = value < 0.0 ? -value : 0.0;
      self.values[1] = value > 0.0 ? value : 0.0;
    }
  }

  refresh() {
    let self = this;
    let value = 0.0;
    if (self.envelopes != undefined) {
      const envelope = self.envelopes[0];
      const count = envelope.length - 1;
      const step = 1.0 / count;
      value = self.values[0] * self.multipliers[0];
      var i0, i1;
      for (let i = 0; i <= count; i++) {
        i0 = i;
        i1 = Math.min(i + 1, count);
        if (value >= envelope[i0] && value < envelope[i1]) {
          break;
        }
      }
      var t;
      if (i0 == i1) {
        t = 0.0;
      } else {
        t = (value - envelope[i0]) / (envelope[i1] - envelope[i0]);
      }
      value = (i0 + t) * step;
    } else if (self.values.length == 1) {
      value = self.values[0];
    } else if (self.values.length == 2) {
      if (self.values.filter(e => e != 0.0).length > 1) {
        return;
      }
      value = 0.5;
      value -= self.values[0] / 2.0;
      value += self.values[1] / 2.0;
    } else {
      return;
    }
    if (self.reverse) {
      value = 1.0 - value;
    }
    $(self.knob).css({
      left: value * self.width,
    });
  }
}

There.init({
  data: {
    sliders: {},
    versions: {},
    looks: {},
    contents: {},
    wearsets: {},
    menu: {},
    undo: [],
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
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      });
    }).observe($('.changeme')[0]);

    $('.section[data-section="body"] .editor[data-area="skin"] .items .item').on('click', function() {
      There.playSound('control down');
      const previousIndex = Number($(this).parent().find('.item[data-selected="1"]').attr('data-index') ?? 1);
      $(this).parent().find('.item').attr('data-selected', '0');
      $(this).attr('data-selected', '1');
      There.handleAvatarLooks('featurecolor', [{
        command: 'setFeatureColorIndex',
        query: {
          index: $(this).attr('data-index'),
          bodyChangeCategory: 'skincolor',
        },
        undoQuery: {
          index: previousIndex,
          bodyChangeCategory: 'skincolor',
        },
      }]);
    });

    There.variables.welcometreatmentsdialog = '1';
    There.fsCommand('registerFlashProp', {
      var: 'welcomeTreatmentsDialog',
      val: There.variables.welcometreatmentsdialog,
    });

    There.variables.leavetreatmentsdialog = '1';
    There.fsCommand('registerFlashProp', {
      var: 'leaveTreatmentsDialog',
      val: There.variables.leavetreatmentsdialog,
    });
  },

  onVariable: function(name, value) {
    if (value.endsWith('=')) {
      value = value.slice(0, -1);
      There.variables[name] = value;
    }

    if (name == 'there_treatmentsenabled') {
      if (value != $('.changeme').attr('there_treatmentsenabled')) {
        if (value == 0) {
          if ($('.changeme').attr('data-section') != 'wardrobe' && $('.changeme').attr('data-area') != 'looksets') {
            $('.sections .section[data-section="wardrobe"] .tab').trigger('click');
          }
          There.clearUndo();
        } else {
          if ($('.changeme').attr('data-section') != 'body') {
            $('.sections .section[data-section="body"] .tab').trigger('click');
          }
        }
        if (There.data.startup == undefined) {
          There.data.startup = $('.changeme').attr('data-section');
        }
        if (value == 1 && There.variables.welcometreatmentsdialog == 1) {
          There.createChildWindow('helpopened', 'There_welcomeDialog', 'cameracontrolhelp');
        }
        if (value == 0) {
          if (There.data.startup == 'body') {
            There.fsCommand('closeWindow');
          }
          if (There.variables.there_savelooksetdialogopened == 1) {
            There.closeChildWindow('There_saveDialogResult');
          }
        }
      }
    }

    if (name == 'there_userrequestsleave' && value == 1) {
      There.variables.there_userrequestsleave = '0';
      There.requestLeaveSpa();
    }

    if (name == 'there_savedialogresult') {
      if (value == 'saveLooksetResult_1') {
        There.variables.there_savelooksetdialogopened = '0';
        There.variables.there_savedialogresult = '';
        There.clearUndo();
      } else if (value == 'saveLooksetResult_0') {
        There.variables.there_savelooksetdialogopened = '0';
        There.variables.there_savedialogresult = '';
      }
    }

    if (name == 'there_teleporting' || name == 'there_treatmentsenabled') {
      $('.changeme').attr(name.replace('there_', 'data-'), value);
    }

    if (name == 'there_ready' && value == 1) {
      There.fetchAvatarLooksXml();
      There.fetchWardrobeXml('wardrobe', 'head');
      There.fetchWardrobeXml('wardrobe', 'face');
      There.fetchWardrobeXml('wardrobe', 'tops');
      There.fetchWardrobeXml('wardrobe', 'bottoms');
      There.fetchWardrobeXml('wardrobe', 'accessories');
      There.fetchWardrobeXml('wardrobe', 'footwear');
      There.fetchWardrobeXml('wardrobe', 'outfits');
      There.fetchWardrobeXml('body', 'looksets');
    }
  },

  getAvatarLooksKey: function() {
    return 'avatar_looks';
  },

  fetchAvatarLooksXml: async function() {
    let query = {
      Oid: There.variables.there_pilotdoid,
    };
    const key = There.getAvatarLooksKey();
    if (There.data.versions[key] != undefined) {
      query.LastVer = There.data.versions[key];
    }
    await There.fetchAsync({
      path: `/VersionedXmlSvc/avatarLooks`,
      query: query,
      dataType: 'xml',
      success: function(xml) {
        There.onAvatarLooksXml(xml, key);
      },
    });
    const init = $('.changeme').attr('data-gender') == '';
    There.setupAvatarLooks(init);
    if (init) {
      There.setupWardrobe();
    }
    There.setNamedTimer('fetch-avatar-looks', 1000, function() {
      There.fetchAvatarLooksXml();
    });
  },

  onAvatarLooksXml: function(xml, key) {
    let promises = [];
    let looks = {
      doid: null,
      skeleton: null,
      attributes: {},
    };
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return promises;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.versions[key] = xmlVersion.childNodes[0].nodeValue;
    const xmlLooks = xmlAnswer.getElementsByTagName('AvatarLooks')[0];
    for (let xmlChild of xmlLooks.childNodes) {
      switch (xmlChild.nodeName) {
        case 'Doid': {
          looks.doid = Number(xmlChild.childNodes[0].nodeValue);
          break;
        }
        case 'Skeleton': {
          looks.skeleton = xmlChild.childNodes[0].nodeValue;
          break;
        }
        case 'FeatureColorIndex': {
          looks.featureColorIndex = Number(xmlChild.childNodes[0].nodeValue);
          break;
        }
        case 'Phenomorph': {
          const name = xmlChild.getElementsByTagName('Name')[0].childNodes[0].nodeValue;
          const value = Number(xmlChild.getElementsByTagName('Value')[0].childNodes[0].nodeValue);
          looks.attributes[name.toLowerCase()] = {
            name: name,
            value: value,
            setter: 'setPhenomorphWeight',
          };
          break;
        }
        case 'Sibling': {
          const name = xmlChild.getElementsByTagName('Name')[0].childNodes[0].nodeValue;
          const value = Number(xmlChild.getElementsByTagName('Value')[0].childNodes[0].nodeValue);
          looks.attributes[name.toLowerCase()] = {
            name: name,
            value: value,
            setter: 'setSiblingWeight',
          };
          break;
        }
      }
    }
    There.data.looks = looks;
  },

  setupAvatarLooks: function(init) {
    const looks = There.data.looks;
    if (init) {
      if (looks.skeleton == 'ft0') {
        $('.slider[data-category="upperbody"]').attr('data-id', 'phenod,phenoa').data('envelope', [
          [0.0, 0.01, 0.02, 0.03, 0.08, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0],
          [-1.0, -0.8, -0.6, -0.4, -0.3, -0.1, -0.04, -0.03, -0.02, -0.01, -0.0],
        ]).data('multiplier', [1, -1]);
      }
      if (looks.skeleton == 'mt0') {
        $('.slider[data-category="upperbody"]').attr('data-id', 'phenod').data('envelope', [
          [0.0, 0.01, 0.02, 0.03, 0.08, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0],
        ]).data('multiplier', [1]);
      }
      $('.slider[data-category="muscularity"]').attr('data-id', 'sibc').data('envelope', [
        [-0.5, -0.4, -0.3, -0.2, -0.1, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
      ]).data('multiplier', [1]);
      $('.slider').each(function(index, element) {
        const slider = new ChangeMeSlider(element, function(slider, previousValues) {
          let commands = [];
          for (let category of slider.categories) {
            commands.push(...slider.ids.map(function(id, index) {
              let attribute = There.data.looks.attributes[`${category == 'hair' ? 'hair_' : ''}${id}`];
              if (attribute == undefined) {
                return null;
              }
              attribute.value = slider.values[index];
              return {
                command: attribute.setter,
                query: {
                  name: attribute.name,
                  weight: attribute.value,
                  bodyChangeCategory: category,
                },
                undoQuery: {
                  name: attribute.name,
                  weight: previousValues[index],
                  bodyChangeCategory: category,
                },
              };
            }).filter(e => e != null));
          }
          if (commands.length > 0) {
            There.handleAvatarLooks(slider.ids.join(','), commands);
          }
        });
        for (let id of slider.ids) {
          There.data.sliders[id] = slider;
        }
      });
    }
    $('.changeme').attr('data-gender', {
      'ft0': 'female',
      'mt0': 'male',
    }[looks.skeleton]);
    let divSkinItems = $('.section[data-section="body"] .editor[data-area="skin"] .items');
    $(divSkinItems).find('.item').attr('data-selected', '0');
    $(divSkinItems).find(`.item[data-index="${looks.featureColorIndex}"]`).attr('data-selected', '1');
    for (let name in looks.attributes) {
      const slider = There.data.sliders[name];
      if (slider != undefined) {
        slider.setValue(name, looks.attributes[name].value);
      }
    }
  },

  handleAvatarLooks: function(key, commands) {
    There.pushUndo(key, commands.map(function(command) {
      return {
        command: command.command,
        query: command.undoQuery,
      };
    }));
    There.fsCommand('beginChangingAvatarLooks');
    for (let command of commands) {
      There.fsCommand(command.command, command.query);
    }
    There.fsCommand('endChangingAvatarLooks');
  },

  fetchWardrobeXml: function(section, area) {
    There.fetchWardrobeContentsXml(section, area);
    There.fetchWardrobeWearsetXml(section, area);
  },

  getWardrobeAreaKey: function(area) {
    return {
      'hairstyles': 'head',
      'facial': 'face',
    }[area] ?? area;
  },

  getWardrobeContentsKey: function(area, folder) {
    return `wardrobe_contents_${There.getWardrobeAreaKey(area)}_${folder ?? 1}`;
  },

  fetchWardrobeContentsXml: async function(section, area, folder) {
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
        promises = There.onWardrobeContentsXml(xml, key, section, area);
      },
      complete: async function() {
        await Promise.all(promises);
      },
    });
    if (folder == undefined) {
      There.updateWardrobe(section, area);
      There.setNamedTimer(`fetch-wardrobe-contents-${area}`, 1000, function() {
        There.fetchWardrobeContentsXml(section, area);
      });
    }
  },

  onWardrobeContentsXml: function(xml, key, section, area) {
    let promises = [];
    let contents = {
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
            contents.menus.push(menu);
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
          contents.entries.push(entry);
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
          contents.entries.push(entry);
          if (There.data.contents[There.getWardrobeContentsKey(area, entry.uid)] == undefined) {
            promises.push(There.fetchWardrobeContentsXml(section, area, entry.uid));
          }
          break;
        }
      }
    }
    for (let entry of contents.entries) {
      entry.menus = contents.menus;
    }
    There.data.contents[key] = contents;
    return promises;
  },

  getWardrobeWearsetKey: function(area) {
    return `wardrobe_wearset_${There.getWardrobeAreaKey(area)}`;
  },

  fetchWardrobeWearsetXml: async function(section, area) {
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
    There.updateWardrobe(section, area);
    There.setNamedTimer(`fetch-wardrobe-wearset-${area}`, 1000, function() {
      There.fetchWardrobeWearsetXml(section, area);
    });
  },

  onWardrobeWearsetXml: function(xml, key, area) {
    let wearset = {
      poids: [],
    };
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.versions[key] = xmlVersion.childNodes[0].nodeValue;
    const xmlWearset = xmlAnswer.getElementsByTagName('wearset')[0];
    for (let xmlItem of xmlWearset.getElementsByTagName('item')) {
      wearset.poids.push(Number(xmlItem.getElementsByTagName('poid')[0].childNodes[0].nodeValue));
    }
    if (There.data.wearsets[key] != undefined) {
      // The 3D client is missing the feature from ThereIM that sends update notifications to chat sessions.
      $.ajax({
        url: 'https://www.hmph.us/there/api/changeme/update/',
        method: 'POST',
        data: {
          avatar_id: There.variables.there_pilotdoid,
          area: area,
        },
      });
    }
    There.data.wearsets[key] = wearset;
  },

  updateWardrobe: function(section, area) {
    if ($('.changeme').attr('data-section') != section) {
      return;
    }
    if (There.getWardrobeAreaKey($('.changeme').attr('data-area')) != area) {
      return;
    }
    There.setupWardrobe();
  },

  setupWardrobe: function(resetScroll) {
    const gender = $('.changeme').attr('data-gender');
    if (gender == '') {
      return;
    }
    const section = $('.changeme').attr('data-section');
    if (section == '') {
      return;
    }
    const area = $('.changeme').attr('data-area');
    if (area == '') {
      return;
    }
    const menu = Object.assign({}, There.data.menu);
    if (menu.section == section && menu.area == area) {
      There.clearContextMenu();
    }
    let divItems;
    if (section == 'wardrobe') {
      divItems = $('.section[data-section="wardrobe"] .items');
    } else if (area == 'looksets') {
      divItems = $('.section[data-section="body"] .items[data-area="looksets"]');
    } else {
      return;
    }
    $(divItems).attr('data-count', '0').find('.item').remove();
    if (resetScroll) {
      $(divItems).scrollLeft(0).scrollTop(0);
    }
    const contents = There.data.contents[There.getWardrobeContentsKey(area)];
    if (contents == undefined) {
      return;
    }
    const wearset = There.data.wearsets[There.getWardrobeWearsetKey(area)];
    if (wearset == undefined) {
      return;
    }
    let maxIndent = 0;
    for (let entry of contents.entries) {
      maxIndent = Math.max(There.setupWardrobeEntry(divItems, section, area, contents, wearset, entry, 0), maxIndent);
    }
    $(divItems).find('.item').css('--max-indent', maxIndent);
    const count = $(divItems).find('.item').length;
    if (area == 'outfits' || area == 'looksets') {
      $(divItems).attr('data-count', count < 14 ? '1' : '2');
    } else {
      $(divItems).attr('data-count', count < 5 ? '1' : '2');
    }
    if (menu.section == section && menu.area == area) {
      const divItem = $(divItems).find(`.item[data-id=${menu.poid}]`).first();
      if ($(divItem).length > 0) {
        const top = $(divItem).offset().top;
        if (menu.top == top) {
          There.setupContextMenu(divItem, section, area, $(divItem).data('entry'));
        }
      }
    }
  },

  setupWardrobeEntry: function(divItems, section, area, contents, wearset, entry, indent) {
    let maxIndent = indent;
    let divItem = $('<div class="item"></div>');
    let divIcon = $('<div class="icon"></div>');
    let divText = $('<div class="text"></div>');
    let divName = $('<div class="name"></div>');
    let divStatus = $('<div class="status"></div>');
    $(divText).append($(divName)).append($(divStatus));
    entry.wearing = false;
    switch (entry.type) {
      case 'item': {
        entry.wearing = wearset.poids.includes(entry.poid);
        $(divItem).attr('data-id', entry.poid);
        $(divItem).attr('data-selected', entry.wearing ? '1' : '0');
        $(divItem).attr('data-unwearable', entry.unwearable ? '1' : '0');
        $(divIcon).css('background-image', `url(https://www.hmph.us/there/changeme/${entry.poid}/${entry.icon}.png)`);
        $(divName).text(entry.name);
        if (entry.unwearable) {
          $(divStatus).text('Cannot be worn');
        } else if (entry.wearing) {
          $(divStatus).text('Wearing');
        } else {
          $(divStatus).text('In gear');
        }
        break;
      }
      case 'drawer': {
        $(divItem).attr('data-id', entry.uid);
        $(divItem).attr('data-drawer', entry.open ? 'open' : 'closed');
        $(divName).text(entry.name);
        if (entry.count == 0) {
          $(divStatus).text('Empty');
        } else if (entry.count == 1) {
          $(divStatus).text('1 item');
        } else {
          $(divStatus).text(`${entry.count.toLocaleString('en-us')} items`);
        }
        break;
      }
    }
    $(divItem).data('entry', entry);
    $(divItem).css('--indent', indent);
    $(divItem).append($(divIcon)).append($(divText)).appendTo($(divItems));
    switch (entry.type) {
      case 'item': {
        $(divItem).on('mouseover', function() {
          const timeout = $('.contextmenu').attr('data-active') == 1 ? 500 : 350;
          There.setNamedTimer('context-menu', timeout, function() {
            if (There.data.menu.poid != entry.poid) {
              There.setupContextMenu(divItem, section, area, entry);
            }
          });
        }).on('mousemove', function(event) {
          event.stopPropagation();
        }).on('click', function() {
          if (!entry.unwearable) {
            let index = -1;
            if (entry.wearing) {
              index = entry.menus.findIndex(e => e.behavior == 3);
            } else {
              index = entry.menus.findIndex(e => e.behavior == 2);
            }
            if (index >= 0 && !entry.unmenus.includes(index)) {
              There.playSound('menu item activate');
              There.fsCommand('activePobAction', {
                poid: entry.poid,
                action: entry.menus[index].text,
              });
            }
          }
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
          const drawerContents = There.data.contents[There.getWardrobeContentsKey(area, entry.uid)];
          if (drawerContents != undefined) {
            for (let drawerEntry of drawerContents.entries) {
              maxIndent = Math.max(There.setupWardrobeEntry(divItems, section, area, contents, wearset, drawerEntry, indent + 1), maxIndent);
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
    $('.contextmenu').attr('data-active', '0');
    $('.sections .section .panel .items .item').attr('data-hover', '0');
    There.data.menu = {};
  },

  setupContextMenu: function(divItem, section, area, entry) {
    let divContextMenu = $('.contextmenu');
    $(divContextMenu).find('.item').remove();
    $('.sections .section .panel .items .item').attr('data-hover', '0');
    for (let index in entry.menus) {
      const menu = entry.menus[index];
      let enabled = !entry.unmenus.includes(Number(index));
      if (enabled && entry.unwearable && (menu.behavior == 2 || menu.behavior == 3)) {
        enabled = false;
      }
      if (enabled) {
        if (entry.wearing && menu.behavior == 2) {
          enabled = false;
        }
        if (!entry.wearing && menu.behavior == 3) {
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
          event.stopPropagation();
        }).on('click', function() {
          There.playSound('menu item activate');
          There.fsCommand('activePobAction', {
            poid: entry.poid,
            action: menu.text,
          });
          if (area == 'looksets') {
            There.clearUndo();
          }
        });
      } else {
        $(divSound).on('mouseover', function() {
          There.playSound('disabled menu item rollover');
        });
      }
    }
    const maxY = $('.changeme').height() - $(divContextMenu).height() - 4;
    const top = $(divItem).offset().top;
    const y = Math.min(top + 4, maxY);
    $(divContextMenu).css('top', y).attr('data-active', '1');
    $(divItem).attr('data-hover', '1');
    There.data.menu = {
      section: section,
      area: area,
      poid: entry.poid,
      top: top,
    };
  },

  clearUndo: function() {
    There.data.undo = [];
    $('.footer .button[data-id="undo"]').attr('data-enabled', '0');
  },

  pushUndo: function(key, commands) {
    const section = $('.changeme').attr('data-section');
    const area = $('.changeme').attr('data-area');
    const subarea = $('.changeme').attr('data-subarea');
    if (section != 'body' || area == '') {
      return;
    }
    if (There.data.undo.length > 0 && There.data.undo[There.data.undo.length - 1].key == key) {
      return;
    }
    There.data.undo.push({
      key: key,
      commands: commands,
      section: section,
      area: area,
      subarea: subarea,
    });
    $('.footer .button[data-id="undo"]').attr('data-enabled', '1');
  },

  popUndo: function() {
    let undo = There.data.undo.pop();
    if (undo == undefined) {
      return;
    }
    $('.changeme').attr('data-section', undo.section);
    $('.changeme').attr('data-area', undo.area);
    $('.changeme').attr('data-subarea', undo.subarea);
    There.fsCommand('beginChangingAvatarLooks');
    for (let command of undo.commands) {
      There.fsCommand(command.command, command.query);
    }
    There.fsCommand('endChangingAvatarLooks');
    if (There.data.undo.length == 0) {
      $('.footer .button[data-id="undo"]').attr('data-enabled', '0');
    }
  },

  createChildWindow: function(name, id, type, query) {
    if (name != null) {
      name = name.toLowerCase();
      if (There.variables[name] == 1) {
        return;
      }
      There.variables[name] = '1';
    }
    There.fsCommand('newChildPluginWindow', Object.assign({}, {
      id: id,
      url: `http://${There.variables.there_resourceshost}/Resources/ChangeMe/flashDialog.swf`,
      type: type,
    }, query ?? {}));
  },

  closeChildWindow: function(id) {
    There.fsCommand('closeChildPluginWindow', {
      id: id,
    });
  },

  requestLeaveSpa: function() {
    if (There.data.undo.length > 0 && There.variables.leavetreatmentsdialog == 1) {
      There.createChildWindow('there_leavetreatmentsdialogopened', 'There_leaveTreatmentsDialogOpened', 'leavetreatments');
    } else {
      There.fsCommand('requestChangeMeLeave');
      There.fsCommand('closeWindow');
    }
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

  $('.slider').on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  });

  $('.slider .knob').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
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
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpChangeMeUrl',
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
    if (There.variables.there_treatmentsenabled == 1) {
      There.requestLeaveSpa();
    } else {
      There.fsCommand('closeWindow');
    }
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
    There.setupWardrobe(true);
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

  $('.section[data-section="body"] .spa .link').on('click', function() {
    There.fsCommand('browser', {
      urlGen: 'SpaListUrl',
    });
  });

  if ($('.changeme').attr('data-section') == '') {
    $('.section[data-section="wardrobe"] .tab').trigger('click');
  }

  $('.footer .button[data-id="undo"]').on('click', function() {
    There.popUndo();
  });

  $('.footer .button[data-id="save"]').on('click', function() {
    const section = $('.changeme').attr('data-section');
    if (section == 'wardrobe') {
      There.createChildWindow(null, 'There_ignored', 'saveOutfitChangeMe', {
        pilotDOID: There.variables.there_pilotdoid,
      });
    } else if (section == 'body' && There.variables.there_treatmentsenabled == 1) {
      const contents = There.data.contents[There.getWardrobeContentsKey('looksets')];
      const wearset = There.data.wearsets[There.getWardrobeWearsetKey('looksets')];
      if (contents != undefined && wearset != undefined) {
        const entry = contents.entries.find(e => e.type == 'item' && wearset.poids.includes(e.poid));
        if (entry != undefined) {
          There.createChildWindow('there_savelooksetdialogopened', 'There_saveDialogResult', 'saveLooksetChangeMe', {
            looksetToUpdate: entry.name,
            looksetToUpdatePOID: entry.poid,
          });
        }
      }
    }
  });

  $('.footer .button[data-id="shop"]').on('click', function() {
    let gender = {
      'male': 'Men',
      'female': 'Women',
    }[$('.changeme').attr('data-gender')];
    if (gender == undefined) {
      return;
    }
    let area = {
      'hairstyles': 'Head',
      'facial': 'Face',
      'accessories': 'Accessories',
      'tops': 'Tops',
      'bottoms': 'Bottoms',
      'footwear': 'Footwear',
    }[$('.changeme').attr('data-area')] ?? '';
    There.fsCommand('browser', {
      target: 'There_Catalog',
      urlGen: `Catalog${gender}${area}Url`,
    });
  });

  $('.footer .button[data-id="organize"]').on('click', function() {
    There.guiCommand({
      action: 'organizer',
      folder: 'wardrobe',
    });
  });
});