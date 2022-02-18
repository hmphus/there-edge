There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 200,
      height: 257,
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
    }).observe($('.communicator')[0]);
  },

  onVariable: function(name, value) {
    if (name == 'there_teleporting') {
      $('.communicator').attr(name.replace('there_', 'data-'), value);
    }

    if (name == 'there_ready' && value == 1) {
      There.fetchCommunicatorXml();
    }
  },

  fetchCommunicatorXml: function() {
    There.data.ident = Math.random();
    let query = {
      Oid: 0,
      request: There.data.ident,
    };
    if (There.data.version != undefined) {
      query.LastVer = There.data.version;
    }
    There.fetch({
      path: '/VersionedXmlSvc/communicatorData',
      query: query,
      dataType: 'xml',
      success: function(xml) {
        There.onCommunicatorXml(xml);
      },
      complete: function() {
        There.setNamedTimer('fetch', 1000, There.fetchCommunicatorXml);
      },
    });
  },

  onCommunicatorXml: function(xml) {
    let folder = {
      id: 'root',
      entries: [],
    };
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.version = xmlVersion.childNodes[0].nodeValue;
    const xmlData = xmlAnswer.getElementsByTagName('CommunicatorData')[0];
    There.onCommunicatorFolderXml(xmlData, folder, There.data.folder?.entries ?? [], There.data.folder);
    There.data.folder = folder;
    There.setupCommunicator();
  },

  onCommunicatorFolderXml: function(xml, folder, previousEntries, previousFolder) {
    for (let xmlChild of xml.childNodes) {
      switch (xmlChild.nodeName.toLowerCase()) {
        case 'name': {
          folder.id = xmlChild.childNodes[0].nodeValue.toLowerCase();
          folder.name = xmlChild.childNodes[0].nodeValue;
          if (previousFolder == undefined) {
            previousFolder = previousEntries.find(e => e.type == 'drawer' && e.id == folder.id);
          }
          folder.open = previousFolder?.open ?? false;
          break;
        }
        case 'folder': {
          let entry = {
            type: 'drawer',
            entries: [],
          };
          There.onCommunicatorFolderXml(xmlChild, entry, previousFolder?.entries ?? []);
          folder.entries.push(entry);
          break;
        }
        case 'avatar': {
          let entry = {
            type: 'avatar',
            id: xmlChild.getElementsByTagName('Doid')[0].childNodes[0].nodeValue,
            name: xmlChild.getElementsByTagName('Name')[0].childNodes[0].nodeValue,
            group: xmlChild.getElementsByTagName('Group')[0].childNodes[0].nodeValue.toLowerCase(),
            status: xmlChild.getElementsByTagName('Avail')[0].childNodes[0].nodeValue.toLowerCase(),
            client: xmlChild.getElementsByTagName('ClientType')[0].childNodes[0].nodeValue.toLowerCase(),
          };
          switch (entry.group) {
            case 'buddy': {
              entry.menus = [{
                text: 'IM',
                action: 'im',
              }, {
                text: 'Summon',
                action: 'summon',
              }, {
                text: 'Email',
                action: 'email',
              }, {
                text: 'View Profile',
                action: 'profile',
              }, {
                text: 'Remove',
                action: 'removeBuddy',
              }];
              break;
            }
            case 'none': {
              entry.menus = [{
                text: 'IM',
                action: 'im',
              }, {
                text: 'Summon',
                action: 'summon',
              }, {
                text: 'Email',
                action: 'email',
              }, {
                text: 'Add to Buddies',
                action: 'addBuddy',
              }, {
                text: 'View Profile',
                action: 'profile',
              }, {
                text: 'Ignore',
                action: 'addIgnore',
              }];
              break;
            }
            default: {
              entry.menus = [];
              break;
            }
          }
          folder.entries.push(entry);
          break;
        }
      }
    }
  },

  setupCommunicator: function() {
    let divItems = $('.communicator .items');
    $(divItems).find('.item').remove();
    let maxIndent = 0;
    for (let entry of There.data.folder.entries) {
      maxIndent = Math.max(There.setupCommunicatorEntry(divItems, entry, 0), maxIndent);
    }
    $(divItems).find('.item').css('--max-indent', maxIndent);
  },

  setupCommunicatorEntry: function(divItems, entry, indent) {
    let maxIndent = indent;
    let divItem = $('<div class="item"></div>');
    let divIcon = $('<div class="icon"></div>');
    let divName = $('<div class="name"></div>');
    $(divItem).attr('data-type', entry.type);
    $(divItem).attr('data-id', entry.id);
    $(divName).text(entry.name);
    switch (entry.type) {
      case 'avatar': {
        $(divItem).attr('data-status', entry.status);
        $(divItem).attr('data-client', entry.client);
        if (There.data.menu?.id == entry.id) {
          $(divItem).attr('data-hover', '1');
        }
        break;
      }
      case 'drawer': {
        $(divItem).attr('data-id', entry.uid);
        $(divItem).attr('data-drawer', entry.open ? 'open' : 'closed');
        $(divName).text(entry.name);
        break;
      }
    }
    $(divItem).data('entry', entry);
    $(divItem).css('--indent', indent);
    $(divItem).append($(divIcon)).append($(divName)).appendTo($(divItems));
    switch (entry.type) {
      case 'avatar': {
        $(divItem).on('mouseover', function() {
          const timeout = $('.contextmenu').attr('data-active') == 1 ? 500 : 350;
          There.setNamedTimer('context-menu', timeout, function() {
            if (There.data.menu.id != entry.id) {
              There.setupContextMenu(divItem, entry);
            }
          });
        }).on('mousemove', function(event) {
          event.stopPropagation();
        }).on('dblclick', function() {
          There.playSound('menu item activate');
          There.clearContextMenu();
          There.guiCommand({
            av: entry.id,
            action: 'im',
          });
        });
        break;
      }
      case 'drawer': {
        $(divItem).on('click', function() {
          There.clearContextMenu();
          There.playSound('control down');
          entry.open = !entry.open;
          There.setupCommunicator();
        });
        if (entry.open) {
          for (let drawerEntry of entry.entries) {
            maxIndent = Math.max(There.setupCommunicatorEntry(divItems, drawerEntry, indent + 1), maxIndent);
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
    $('.communicator .items .item').attr('data-hover', '0');
    There.data.menu = {};
  },

  setupContextMenu: function(divItem, entry) {
    let divContextMenu = $('.contextmenu');
    $(divContextMenu).find('.item').remove();
    $('.communicator .items .item').attr('data-hover', '0');
    for (let index in entry.menus) {
      const menu = entry.menus[index];
      let enabled = true;
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
          There.clearContextMenu();
          let query = {
            av: entry.id,
            action: menu.action,
          };
          if (menu.action == 'email') {
            query.originCode = 7;
          }
          if (menu.action == 'addIgnore') {
            query.avName = entry.name;
          }
          There.guiCommand(query);
        });
      } else {
        $(divSound).on('mouseover', function() {
          There.playSound('disabled menu item rollover');
        });
      }
    }
    const maxY = $('.communicator').height() - $(divContextMenu).height() - 4;
    const top = $(divItem).offset().top;
    const y = Math.min(top + 4, maxY);
    $(divContextMenu).css('top', y).attr('data-active', '1');
    $(divItem).attr('data-hover', '1');
    There.data.menu = {
      id: entry.id,
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
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.communicator').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.communicator').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpCommunicatorUrl',
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.footer .button[data-id="buddy"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.guiCommand({
      action: 'addBuddy',
    });
  });

  $('.footer .button[data-id="organize"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.guiCommand({
      action: 'organizer',
      folder: 'people',
    });
  });

  $('.titlebar .buttons .button').on('mousedown', function() {
    There.clearContextMenu();
  });

  $('.contextmenu').on('mousemove', function(event) {
    There.clearNamedTimer('context-menu');
    event.stopPropagation();
  });

  $('.communicator').on('mouseleave', function(event) {
    There.setNamedTimer('context-menu', 500, function() {
      There.clearContextMenu();
    });
  }).on('mousemove', function() {
    There.setNamedTimer('context-menu', 350, function() {
      There.clearContextMenu();
    });
  });

  $('.communicator .items').on('scroll', function() {
    There.clearContextMenu();
  });
});