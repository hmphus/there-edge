class Game {
  constructor() {
    let self = this;
    There.data.listeners.push(self);
  }
}

$(document).ready(function() {
  $('.left .logo').on('click', function() {
    if (There.variables.maxpoints != undefined) {
      There.data.messages.addMessage(0, `Playing until ${There.variables.maxpoints} points.`);
    }
    if (There.variables.host != undefined) {
      There.data.messages.addMessage(0, `Player ${There.variables.host} is host.`);
    }
    if (There.variables.round != undefined) {
      There.data.messages.addMessage(0, `Round ${There.variables.round}.`);
    }
  });

  $('.button[data-id="newgame"]').on('click', function() {
    There.sendEventMessageToClient(1);
  });

  $('.button[data-id="rules"]').on('click', function() {
    const rulesPath = There.data.channels?.hudconfig?.data?.rulesurl;
    if (rulesPath != undefined) {
      There.guiCommand({
        action: 'browse',
        url: `https://${There.variables.there_webapps}${rulesPath}`,
      });
    }
  });

  $('.button[data-id="deal"]').on('click', function() {
    There.sendEventMessageToClient(2);
  });

  $('.button[data-id="play"]').on('click', function() {
  });

  $('.button[data-id="taketrick"]').on('click', function() {
    There.sendEventMessageToClient(5);
  });

  $('.button[data-id="bid"]').on('click', function() {
    There.sendEventMessageToClient(4, {
      action: 100 + Number($(this).attr('data-index')),
    });
  });
});
