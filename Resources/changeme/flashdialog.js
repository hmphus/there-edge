There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 260,
      height: 192,
    });

    There.fsCommand('setWidthHeight', {
      width: 260,
      height: 192,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    There.fsCommand('registerFlashProp', {
      var: 'welcomeTreatmentsDialog',
      val: 1,
    });

    There.fsCommand('registerFlashProp', {
      var: 'leaveTreatmentsDialog',
      val: 1,
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_teleporting') {
      $('.dialog').attr(name.replace('there_', 'data-'), value);
    }

    if (name == 'type') {
      $('.dialog').attr('data-id', value.toLowerCase());
      There.updateButtonState();
      There.updateButtonActions();
    }

    if (name == 'looksettoupdate') {
      $('.panel span[data-id="looksetname"]').text(value);
      $('.panel input[type="text"][data-id="looksetname"]').val(value);
      There.updateButtonState();
    }

    if (name == 'outfittoupdate') {
      $('.panel span[data-id="outfitname"]').text(value);
      $('.panel input[type="text"][data-id="outfitname"]').val(value);
      There.updateButtonState();
    }

    if (name == 'there_ready' && value == 1) {
      There.fsCommand('getKeyboardFocus');
      There.fetch({
        path: '/ChangeMe/GetLooksetPricing',
        query: {
          avoid: There.variables.there_pilotdoid,
          homedoid: There.variables.there_pilotdoid,
        },
        dataType: 'xml',
        success: function(xml) {
          There.onLooksetPricingXml(xml);
        },
      });
    }
  },

  onLooksetPricingXml: function(xml) {
    const xmlChangeMe = xml.getElementsByTagName('ChangeMe')[0];
    const xmlLooksetPrice = xmlChangeMe.getElementsByTagName('looksetprice')[0];
    const price = xmlLooksetPrice.childNodes[0].nodeValue;
    if (price != undefined) {
      $('.panel span[data-id="price"]').text(Number(price).toLocaleString());
    }
    // There is also a "looksetrefreshprice", but at this point it is unlikely to be used.
  },

  updateButtonState: function() {
    const type = $('.dialog').attr('data-id');
    switch (type) {
      case 'savelooksetchangeme': {
        const text = $('.modes[data-id="savelooksetchangeme"] .panel input[type="text"]').val();
        const mode = $('.modes[data-id="savelooksetchangeme"]').attr('data-mode');
        $('.footer .button[data-id="save"]').attr('data-enabled', text != '' || mode == 'save' ? '1' : '0');
        break;
      }
      case 'renamelooksetchangeme': {
        const text = $('.panel[data-id="renamelooksetchangeme"] input[type="text"]').val();
        $('.footer .button[data-id="ok"]').attr('data-enabled', text != '' ? '1' : '0');
        break;
      }
      case 'saveoutfitchangeme': {
        const text = $('.panel[data-id="saveoutfitchangeme"] input[type="text"]').val();
        $('.footer .button[data-id="save"]').attr('data-enabled', text != '' ? '1' : '0');
        break;
      }
      case 'renameoutfitchangeme': {
        const text = $('.panel[data-id="renameoutfitchangeme"] input[type="text"]').val();
        $('.footer .button[data-id="ok"]').attr('data-enabled', text != '' ? '1' : '0');
        break;
      }
    }
  },

  updateButtonActions: function() {
    const type = $('.dialog').attr('data-id');
    switch (type) {
      case 'cameracontrolhelp': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('setFlashProp', {
            var: 'welcomeTreatmentsDialog',
            val: $('.panel[data-id="cameracontrolhelp"] input[type="checkbox"]').prop('checked') ? 1 : 0,
          });
          There.fsCommand('closeWindow', 'welcomeDialogResult_0');
        });
        break;
      }
      case 'leavetreatments': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="yes"]').off('click').on('click', function() {
          There.fsCommand('setFlashProp', {
            var: 'leaveTreatmentsDialog',
            val: $('.panel[data-id="leavetreatments"] input[type="checkbox"]').prop('checked') ? 1 : 0,
          });
          There.fsCommand('requestChangeMeLeave');
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="no"]').off('click').on('click', function() {
          There.fsCommand('setFlashProp', {
            var: 'leaveTreatmentsDialog',
            val: $('.panel[data-id="leavetreatments"] input[type="checkbox"]').prop('checked') ? 1 : 0,
          });
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'savelooksetchangeme': {
        const mode = $('.modes[data-id="savelooksetchangeme"]').attr('data-mode');
        switch (mode) {
          case 'save': {
            $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
              There.fsCommand('closeWindow', 'saveLooksetResult_0');
            });
            $('.footer .button[data-id="save"]').off('click').on('click', function() {
              There.fetch({
                path: '/ChangeMe/ReconfigureOldLookset',
                query: {
                  avoid: There.variables.there_pilotdoid,
                  poid: There.variables.looksettoupdatepoid,
                  homedoid: There.variables.looksettoupdatepoid,
                },
                dataType: 'xml',
                success: function(xml) {
                  There.onChangeMeResultXml(xml);
                },
              });
            });
            $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
              There.fsCommand('closeWindow', 'saveLooksetResult_0');
            });
            break;
          }
          case 'saveas': {
            $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
              There.fsCommand('closeWindow', 'saveLooksetResult_0');
            });
            $('.footer .button[data-id="save"]').off('click').on('click', function() {
              const text = $('.modes[data-id="savelooksetchangeme"] .panel input[type="text"]').val();
              if (text == '') {
                return;
              }
              There.fetch({
                path: '/ChangeMe/BuyConfigureNewLookset',
                query: {
                  avoid: There.variables.there_pilotdoid,
                  homedoid: There.variables.there_pilotdoid,
                  name: text,
                },
                dataType: 'xml',
                success: function(xml) {
                  There.onChangeMeResultXml(xml);
                },
              });
            });
            $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
              There.fsCommand('closeWindow', 'saveLooksetResult_0');
            });
            break;
          }
        }
        break;
      }
      case 'renamelooksetchangeme': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="ok"]').off('click').on('click', function() {
          const text = $('.panel[data-id="renamelooksetchangeme"] input[type="text"]').val();
          if (text == '') {
            return;
          }
          There.fetch({
            path: '/ChangeMe/RenameLookset',
            query: {
              avoid: There.variables.there_pilotdoid,
              poid: There.variables.looksettoupdatepoid,
              homedoid: There.variables.looksettoupdatepoid,
              oldname: There.variables.looksettoupdate,
              name: text,
            },
            dataType: 'xml',
            success: function(xml) {
              There.onChangeMeResultXml(xml);
            },
          });
        });
        $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'deletelooksetchangeme': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="ok"]').off('click').on('click', function() {
          There.fetch({
            path: '/pobman/deletepob',
            query: {
              poid: There.variables.looksettoupdatepoid,
              homedoid: There.variables.looksettoupdatepoid,
            },
            dataType: 'xml',
            success: function(xml) {
              There.onPobManResultXml(xml);
            },
          });
        });
        $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'saveoutfitchangeme': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="save"]').off('click').on('click', function() {
          const text = $('.panel[data-id="saveoutfitchangeme"] input[type="text"]').val();
          if (text == '') {
            return;
          }
          There.fetch({
            path: '/ChangeMe/BuyConfigureNewOutfit',
            query: {
              avoid: There.variables.there_pilotdoid,
              homedoid: There.variables.there_pilotdoid,
              name: text,
            },
            dataType: 'xml',
            success: function(xml) {
              There.onChangeMeResultXml(xml);
            },
          });
        });
        $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'renameoutfitchangeme': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="ok"]').off('click').on('click', function() {
          const text = $('.panel[data-id="renameoutfitchangeme"] input[type="text"]').val();
          if (text == '') {
            return;
          }
          There.fetch({
            path: '/ChangeMe/RenameOutfit',
            query: {
              avoid: There.variables.there_pilotdoid,
              poid: There.variables.outfittoupdatepoid,
              homedoid: There.variables.outfittoupdatepoid,
              oldname: There.variables.outfittoupdate,
              name: text,
            },
            dataType: 'xml',
            success: function(xml) {
              There.onChangeMeResultXml(xml);
            },
          });
        });
        $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'deleteoutfitchangeme': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        $('.footer .button[data-id="ok"]').off('click').on('click', function() {
          There.fetch({
            path: '/pobman/deletepob',
            query: {
              poid: There.variables.outfittoupdatepoid,
              homedoid: There.variables.outfittoupdatepoid,
            },
            dataType: 'xml',
            success: function(xml) {
              There.onPobManResultXml(xml);
            },
          });
        });
        $('.footer .button[data-id="cancel"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', '0');
        });
        break;
      }
      case 'thankyou': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', 'saveLooksetResult_1');
        });
        $('.footer .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', 'saveLooksetResult_1');
        });
        break;
      }
      case 'error': {
        $('.titlebar .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', 'saveLooksetResult_0');
        });
        $('.footer .button[data-id="close"]').off('click').on('click', function() {
          There.fsCommand('closeWindow', 'saveLooksetResult_0');
        });
        break;
      }
    }
  },

  onChangeMeResultXml: function(xml) {
    There.fsCommand('devtools');
    console.log(xml);
  },

  onPobManResultXml: function(xml) {
    There.fsCommand('devtools');
    console.log(xml);
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

  $('.modes .tab').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('click', function() {
    $(this).parents('.modes').attr('data-mode', $(this).attr('data-id'));
    There.updateButtonState();
    There.updateButtonActions();
  });

  $('.titlebar .button[data-id="close"]').on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.panel input[type="text"]').on('keydown keyup change input cut paste', function() {
    There.updateButtonState();
  });
});