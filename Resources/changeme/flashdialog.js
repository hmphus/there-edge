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
      value = value.toLowerCase();
      $('.dialog').attr('data-id', value);
      if (['savelooksetchangeme', 'renamelooksetchangeme', 'saveoutfitchangeme', 'renameoutfitchangeme'].includes(value)) {
        There.fsCommand('getKeyboardFocus');
      }
    }

    if (name == 'looksettoupdate') {
      $('.panel span[data-id="looksetname"]').text(value);
      $('.panel input[type="text"][data-id="looksetname"]').val(value)[0].select();
    }

    if (name == 'outfittoupdate') {
      $('.panel span[data-id="outfitname"]').text(value);
      $('.panel input[type="text"][data-id="outfitname"]').val(value)[0].select();
    }

    if (name == 'there_ready' && value == 1) {
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
  });

  $('.titlebar .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });
});