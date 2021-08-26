There.init({
  data: {
    messages: [],
    saved: [],
  },

  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 800,
      height: 58,
    });

    There.fsCommand('setWidthHeight', {
      width: 800,
      height: 58,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_ready' && value == 1) {
      There.fetchMessagesXml();
    }

    if (name == 'there_msgbaropened') {
      if (value == 1) {
        There.showMessageBar();
        if (There.data.currentIndex == undefined) {
          There.displayMessage(0);
        }
      } else {
        There.hideMessageBar();
      }
    }

    if (name == 'there_proxyversion') {
      There.fetchVersionJson(value);
    }
  },

  fetchVersionJson: function(version) {
    $.ajax({
      url: 'https://www.hmph.us/there/edge/info.json',
      dataType: 'json',
      success: function(json) {
        if (json.version != version) {
          There.data.messages.push({
            id: '0',
            type: 'Info',
            priority: '1',
            text: `ThereEdge ${json.version} is now available for download.`,
            sound: '1',
            timeout: '30.0',
            buttons: [{
              id: '0',
              text: 'View',
              url: json.url,
            }, {
              id: '1',
              text: 'Later',
            }],
          });
          There.displayTopMessage();
        }
      },
    });
  },

  fetchMessagesXml: function() {
    There.data.ident = Math.random();
    let query = {
      Oid: 0,
      request: There.data.ident,
    };
    if (There.data.version != undefined) {
      query.lastVer = There.data.version;
    }
    There.fetch({
      path: '/VersionedXmlSvc/messageBarData',
      query: query,
      dataType: 'xml',
      success: There.onMessagesXml,
      complete: function() {
        There.setNamedTimer('fetch', 1000, There.fetchMessagesXml);
      },
    });
  },

  onMessagesXml: function(xml) {
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    There.data.version = xmlVersion.childNodes[0].nodeValue;
    const xmlData = xmlAnswer.getElementsByTagName('MessageBarData')[0];
    let cancels = [];
    let autoAccepts = [];
    for (let xmlMsg of xmlData.childNodes) {
      switch (xmlMsg.nodeName) {
        case 'CancelMsg': {
          let xmlId = xmlMsg.getElementsByTagName('Id')[0];
          cancels.push({
            id: xmlId.childNodes[0].nodeValue,
          });
          break;
        }
        case 'AutoAcceptedMsg': {
          let xmlType = xmlMsg.getElementsByTagName('Type')[0];
          autoAccepts.push({
            type: xmlType.childNodes[0].nodeValue,
          });
          There.playSound('avatar message one');
          break;
        }
        case 'Msg': {
          let message = {
            id: xmlMsg.getElementsByTagName('Id')[0].childNodes[0].nodeValue,
            type: xmlMsg.getElementsByTagName('Type')[0].childNodes[0].nodeValue,
            priority: xmlMsg.getElementsByTagName('Priority')[0].childNodes[0].nodeValue,
            text: xmlMsg.getElementsByTagName('Text')[0].childNodes[0].nodeValue,
            sound: xmlMsg.getElementsByTagName('Sound')[0].childNodes[0].nodeValue,
            buttons: [],
          };
          let xmlResponse = xmlMsg.getElementsByTagName('Response')[0];
          if (xmlResponse != undefined) {
            for (let xmlResponseNode of xmlResponse.childNodes) {
              switch (xmlResponseNode.nodeName) {
                case 'Button0':
                case 'Button1':
                case 'Button2': {
                  message.buttons.push({
                    id: xmlResponseNode.nodeName.slice(-1),
                    text: xmlResponseNode.childNodes[0].nodeValue,
                  });
                  break;
                }
                case 'Timeout': {
                  message.timeout = xmlResponseNode.childNodes[0].nodeValue;
                  break;
                }
                case 'RespNullId': {
                  message.nullId = xmlResponseNode.childNodes[0].nodeValue;
                  break;
                }
              }
            }
          }
          There.data.messages.push(message);
          break;
        }
      }
    }
    for (let autoAccept of autoAccepts) {
      if (['Receive', 'QuestInfo', 'Im', 'PermDeny', 'PermAllow', 'Summon', 'Info', 'Error'].includes(autoAccept.type)) {
        There.playSound('menu item activate');
      }
    }
    for (let cancel of cancels) {
      const index = There.data.messages.findIndex(m => m.id == cancel.id);
      if (index >= 0) {
        There.data.messages.splice(index, 1);
      }
    }
    There.displayTopMessage();
  },

  displayTopMessage: function() {
    There.limitSavedMessages();
    There.sortMessages();
    There.displayMessage(0);
  },

  limitSavedMessages: function() {
    const overage = There.data.saved.length - 20;
    if (overage > 0) {
      There.data.saved.splice(-overage);
    }
  },

  sortMessages: function() {
    let messages = There.data.messages.map((e, i) => [e, i]);
    messages.sort(function(e1, e2) {
      if (e1[0].priority != e2[0].priority) {
          return e1[0].priority - e2[0].priority;
      }
      return e1[1] - e2[1];
    });
    There.data.messages = messages.map(e => e[0]);
  },

  displayMessage: function(index) {
    There.clearNamedTimer('message');
    There.clearNamedTimer('unflash');
    There.clearNamedInterval('attention');
    There.stopSound();
    There.limitSavedMessages();
    const message = index < There.data.messages.length ? There.data.messages[index] : There.data.saved[index - There.data.messages.length];
    if (message == undefined) {
      delete There.data.currentIndex;
      $('.messagebar .left .icon').attr('data-id', 'Info');
      $('.messagebar .message').text('You have no messages to display.');
      $('.messagebar .message').attr('data-buttoncount', 0);
      $('.messagebar .buttons.big .button').attr('data-id', '').text('');
      $('.messagebar .buttons.arrows .button').attr('data-enabled', '0');
      $('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '1');
      return;
    }
    There.data.currentIndex = index;
    $('.messagebar .left .icon').attr('data-id', message.type);
    if (index < There.data.messages.length || message.response == undefined) {
      $('.messagebar .message').text(message.text);
    } else {
      $('.messagebar .message').text(message.text + message.response);
    }
    if (message.response == undefined) {
      $('.messagebar .message').attr('data-buttoncount', message.buttons.length);
      $('.messagebar .buttons.big .button').attr('data-id', '').text('');
      for (let button of message.buttons) {
        let divButton = $('.messagebar .buttons.big .button').eq(Number(button.id));
        $(divButton).attr('data-id', message.nullId > 0 ? 0 : button.id);
        $(divButton).attr('data-enabled', '1');
        $(divButton).text(button.text);
      }
    } else {
      $('.messagebar .message').attr('data-buttoncount', 0);
      $('.messagebar .buttons.big .button').attr('data-id', '').text('');
    }
    There.data.hasTimeout = false;
    var delay;
    if (index < There.data.messages.length) {
      if (message.timeout > 0) {
        There.data.hasTimeout = true;
        delay = message.timeout * 1000;
      } else if (message.priority == 1) {
        delay = 1000000;
      } else if (There.data.messages.length > 1) {
        delay = 2000;
      } else {
        delay = 5000;
      }
    } else {
      delay = 5000;
    }
    There.setNamedTimer('message', delay, function() {
      if (There.data.messages.length > 0) {
        There.showNextMessage();
      }
    });
    if (index < There.data.messages.length && message.priority < 2) {
      $('.messagebar .buttons.arrows .button').attr('data-enabled', '0');
      $('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '0');
    } else {
      const lastIndex = There.data.messages.length + There.data.saved.length - 1;
      $('.messagebar .buttons.arrows .button[data-id="up"]').attr('data-enabled', index == 0 ? '0': '1');
      $('.messagebar .buttons.arrows .button[data-id="down"]').attr('data-enabled', index == lastIndex ? '0' : '1');
      $('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '1');
    }
    if (index < There.data.messages.length && message.sound) {
      if (message.priority == 0) {
        There.playSound('avatar message one');
      } else {
        There.playSound('system message one');
      }
      if (message.priority < 2) {
        $('.messagebar').attr('data-flash', '0');
        There.setNamedInterval('attention', 2568, function() {
          $('.messagebar').attr('data-flash', '1');
          There.setNamedTimer('unflash', 1000, function() {
            $('.messagebar').attr('data-flash', '0');
          });
          if (message.priority == 0) {
            There.playSound('avatar message one');
          } else {
            There.playSound('system message one');
          }
        });
      }
    }
    if (There.data.messages.length > 0 || There.variables.there_msgbaropened == 1) {
      There.showMessageBar();
    } else {
      There.hideMessageBar();
    }
  },

  handleMessageButton: function(id) {
    const index = There.data.currentIndex;
    if (index == undefined) {
      return;
    }
    const message = There.data.messages[index];
    if (message == undefined) {
      return;
    }
    const button = message.buttons.find(e => e.id == id);
    if (button == undefined) {
      return;
    }
    message.response = message.buttons.length > 1 ? ` You responded "${button.text}".` : '';
    if (message.id != '0') {
      There.fsCommand('messageBarResponse', {
        id: message.id,
        button: button.id,
      });
    } else if (button.url != undefined) {
      There.fsCommand('browser', button.url);
    }
    There.log(`MessageBar: message response sent with id=${message.id} button=${button.id}`);
    There.data.hasTimeout = false;
    There.showNextMessage();
  },

  showPreviousMessage: function() {
    let index = There.data.currentIndex;
    if (index == undefined) {
      return;
    }
    if (index < There.data.messages.length) {
      There.saveMessage(index);
    }
    index--;
    if (index < 0) {
      index = There.data.messages.length + There.data.saved.length - 1;
    }
    There.displayMessage(index);
  },

  showNextMessage: function() {
    let index = There.data.currentIndex;
    if (index == undefined) {
      return;
    }
    const message = There.data.messages[index];
    if (message != undefined && There.data.hasTimeout) {
      There.data.hasTimeout = false;
      message.response = ` Message timed out.`;
      if (message.id != '0') {
        There.fsCommand('messageBarResponse', {
          id: message.id,
          timeout: 1,
        });
      }
      There.log(`MessageBar: message timed out with id=${message.id}`);
    }
    if (index < There.data.messages.length) {
      There.saveMessage(index);
    } else {
      index++;
      if (index >= There.data.messages.length + There.data.saved.length) {
        index = 0;
      }
    }
    There.displayMessage(index);
  },

  saveMessage: function(index) {
    if (index < There.data.messages.length) {
      There.data.saved.unshift(There.data.messages.splice(index, 1)[0]);
    }
  },

  showMessageBar: function() {
    if ($('.messagebar').attr('data-msgbaropened') != 1) {
      $('.messagebar').attr('data-msgbaropened', '1');
      There.clearNamedTimer('animator');
      There.fsCommand('setWidthHeight', {
        width: 800,
        height: 58,
      });
    }
  },

  hideMessageBar: function() {
    if ($('.messagebar').attr('data-msgbaropened') != 0) {
      $('.messagebar').attr('data-msgbaropened', '0');
      There.setNamedTimer('animator', 500, function() {
        There.fsCommand('setWidthHeight', {
          width: 0,
          height: 0,
        });
      });
    }
  },
});

$(document).ready(function() {
  $('.messagebar .button').on('mouseover', function(event) {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function(event) {
    There.playSound('control up');
  });

  $('.messagebar .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpMessageBarUrl',
    });
  });

  $('.messagebar .button[data-id="close"]').on('click', function() {
    if ($(this).attr('data-enabled') != 1) {
      return;
    }
    There.hideMessageBar();
  });

  $('.messagebar .buttons.big .button').on('click', function() {
    if ($(this).attr('data-enabled') != 1) {
      return;
    }
    There.handleMessageButton($(this).attr('data-id'));
  });

  $('.messagebar .buttons.arrows .button[data-id="up"]').on('click', function() {
    if ($(this).attr('data-enabled') != 1) {
      return;
    }
    There.showPreviousMessage();
  });

  $('.messagebar .buttons.arrows .button[data-id="down"]').on('click', function() {
    if ($(this).attr('data-enabled') != 1) {
      return;
    }
    There.showNextMessage();
  });
});
