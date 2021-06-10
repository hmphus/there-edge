There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: Number(There.variables.there_windowwidth || 800),
      height: 24,
    });

    There.fsCommand('setWidthHeight', {
      width: Number(There.variables.there_windowwidth || 800),
      height: 24,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    $(document).on('mouseup', function(event) {
      $('.emotionsbar[data-voicetoggle="1"][data-voiceisspeaking="1"] .button[data-id="talk"]').trigger(event);
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_windowwidth') {
      There.fsCommand('setStageWidthHeight', {
        width: Number(value),
        height: 24,
      });

      There.fsCommand('setWidthHeight', {
        width: Number(value),
        height: 24,
      });
    }

    if (name == 'there_ready') {
      There.fetchEmotionsXml();
    }

    if (name == 'there_voicetoggle' || name == 'there_voiceisspeaking' || name == 'there_voicehandfree') {
      $('.emotionsbar').attr(name.replace('there_', 'data-'), value);
    }
  },

  fetchEmotionsXml: function() {
    There.data.ident = Math.random();
    let query = {
      Oid: 0,
      request: There.data.ident,
    }
    if (There.data.version != undefined) {
      query.lastVer = There.data.version;
    }
    There.fetch({
      path: '/VersionedXmlSvc/emotionBarData',
      query: query,
      dataType: 'xml',
      success: There.onEmotionsXml,
      complete: function() {
        There.setNamedTimer('fetch', 1000, There.fetchEmotionsXml);
      },
    });
  },

  onEmotionsXml: function(xml) {
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.version = xmlVersion.childNodes[0].nodeValue;
    const divOrigSelected = $('.emotionsbar .bank[data-selected="1"]').first();
    $('.emotionsbar .banks').empty();
    $('.emotionsbar .emotions').empty();
    const xmlData = xmlAnswer.getElementsByTagName('EmotionsBarData')[0];
    for (let xmlBank of xmlData.getElementsByTagName('Bank')) {
      let divBank = $('<div class="bank"/>');
      $(divBank).text(xmlBank.getElementsByTagName('Title')[0].childNodes[0].nodeValue);
      $(divBank).attr('data-id', xmlBank.getElementsByTagName('Title')[0].childNodes[0].nodeValue.toLowerCase());
      $(divBank).attr('data-selected', xmlBank.getElementsByTagName('Selected')[0].childNodes[0].nodeValue);
      let emotions = [];
      for (let xmlEmotion of xmlBank.getElementsByTagName('Emotion')) {
        emotions.push({
          id: 'emotion',
          text: xmlEmotion.getElementsByTagName('Text')[0].childNodes[0].nodeValue,
          enabled: xmlEmotion.getElementsByTagName('Enabled')[0].childNodes[0].nodeValue,
        });
      }
      $(divBank).data('actions', emotions);
      $(divBank).on('click', function() {
        There.handleEmotionsBank(this);
      }).on('mouseover', function() {
        There.playSound('control rollover');
      }).on('mousedown', function() {
        There.playSound('control down');
      }).on('mouseup', function() {
        There.playSound('control up');
      });
      $('.emotionsbar .banks').append($(divBank));
    }
    if(There.variables.there_voiceenabled == 1) {
      let divBank = $('<div class="bank"/>');
      $(divBank).text('Voice');
      $(divBank).attr('data-id', 'voice');
      $(divBank).attr('data-selected', '0');
      $(divBank).data('actions', [{
        id: 'turnhandsfreeon',
        text: 'Turn Hands-free On',
        enabled: '1',
      }, {
        id: 'turnhandsfreeoff',
        text: 'Turn Hands-free Off',
        enabled: '1',
      }, {
        id: 'talk',
        text: 'Talk [PageDn]',
        enabled: '1',
      }, {
        id: 'turnvoiceon',
        text: 'Turn Voice On',
        enabled: '1',
      }, {
        id: 'turnvoiceoff',
        text: 'Turn Voice Off',
        enabled: '1',
      }, {
        id: 'voicetrainer',
        text: 'Voice Trainer',
        enabled: '1',
      }]);
      $(divBank).on('click', function() {
        There.handleEmotionsBank(this);
      }).on('mouseover', function() {
        There.playSound('control rollover');
      }).on('mousedown', function() {
        There.playSound('control down');
      }).on('mouseup', function() {
        There.playSound('control up');
      });
      $('.emotionsbar .banks').append($(divBank));
    }
    const divNewSelected = $('.emotionsbar .bank[data-selected="1"]').first();
    if (divNewSelected.length > 0) {
      $(divNewSelected).trigger('click');
    } else if (divOrigSelected.length > 0) {
      const id = $(divOrigSelected).attr('data-id');
      $(`.emotionsbar .bank[data-id="${id}"]`).trigger('click');
    }
  },

  handleEmotionsBank: function(divBank) {
    $('.emotionsbar .bank').attr('data-selected', '0');
    $(divBank).attr('data-selected', '1');
    $('.emotionsbar .emotions').empty();
    for (let action of $(divBank).data('actions')) {
      let divButton = $('<div class="button"/>');
      $(divButton).text(action.text);
      $(divButton).attr('data-id', action.id);
      $(divButton).attr('data-enabled', action.enabled);
      if (action.id == 'talk') {
        $(divButton).on('mouseover', function() {
          There.playSound('control rollover');
        }).on('mousedown', function() {
          There.playSound('control down');
          There.guiCommand({
            action: 'voiceTalk',
            toggle: '1',
          });
        }).on('mouseup', function() {
          There.playSound('control up');
          There.guiCommand({
            action: 'voiceTalk',
            toggle: '0',
          });
        });
      } else {
        $(divButton).on('click', function() {
          There.handleEmotionsClick(this);
        }).on('mouseover', function() {
          There.playSound('control rollover');
        }).on('mousedown', function() {
          There.playSound('control down');
        }).on('mouseup', function() {
          There.playSound('control up');
        });
      }
      $('.emotionsbar .emotions').append($(divButton));
    }
  },

  handleEmotionsClick: function(divButton) {
    if ($(divButton).attr('data-enabled') != 1) {
      return;
    }
    switch($(divButton).attr('data-id')) {
      case 'emotion': {
        There.fsCommand('addChatText', {
          text: $(divButton).text(),
        });
        break;
      }
      case 'turnhandsfreeon': {
        There.guiCommand({
          action: 'setpreference',
          pref: 'VoiceHandsFree',
          value: '1',
        });
        break;
      }
      case 'turnhandsfreeoff': {
        There.guiCommand({
          action: 'setpreference',
          pref: 'VoiceHandsFree',
          value: '0',
        });
        break;
      }
      case 'turnvoiceon': {
        There.guiCommand({
          action: 'setpreference',
          pref: 'VoiceToggle',
          value: '1',
        });
        break;
      }
      case 'turnvoiceoff': {
        There.guiCommand({
          action: 'setpreference',
          pref: 'VoiceToggle',
          value: '0',
        });
        break;
      }
      case 'voicetrainer': {
        There.guiCommand({
          action: 'outThereWindow',
          urlTag: 'VoiceTrainerUrl',
          targetName: 'There_Central',
        });
        break;
      }
    }
  },
});

$(document).ready(function() {
  $('.emotionsbar .button').on('mouseover', function(event) {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function(event) {
    There.playSound('control up');
  });

  $('.emotionsbar .button[data-id="help"]').on('click', function() {
    const id = $('.emotionsbar .bank[data-selected="1"]').first().attr('data-id');
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: id == 'voice' ? 'HelpVoiceUrl' : 'HelpEmotionsBarUrl',
    });
  });

  $('.emotionsbar .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  });
});