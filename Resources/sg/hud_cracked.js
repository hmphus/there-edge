class Game {
  constructor() {
    let self = this;
    self.uiid = 1000;
    There.data.listeners.push(self);
  }

  onVariable(name, value) {
    let self = this;
    if (name == 'challengetext') {
      $('.middle .section:nth-of-type(1) .title').text(value);
    }
  }

  onData(name, data) {
    let self = this;
    if (name == 'player' || name == 'game') {
      let playerData = There.data.channels?.player?.data;
      let gameData = There.data.channels?.game?.data;
      if (playerData != undefined && gameData != undefined) {
        self.players = playerData.player.map(function(e, i) {
          return {
            id: null,
            name: e.avname.trim(),
            round: e.roundpoints == '' ? null : Number(e.roundpoints),
            game: e.gamepoints == '' ? null : Number(e.gamepoints),
            last: {
              word: e.lastword.trim().toLowerCase(),
              play: e.lastplay.trim().toLowerCase(),
              points: e.lastwordpoints == '' ? null : Number(e.lastwordpoints),
              status: e.lastwordstatus == '' ? 0 : Number(e.lastwordstatus),
            },
            isLeader: Number(gameData.leader) - 1 == i,
            isDealer: Number(gameData.dealer) - 1 == i,
            isHost: Number(gameData.host) - 1 == i,
            isLoser: Number(gameData.loser) - 1 == i,
          };
        });
        self.activePlayer = Number(gameData.currentplayer) - 1;
        self.thisPlayer = playerData.player.findIndex(e => e.avoid == There.variables.there_pilotdoid);
        self.players.forEach(function(e, i) {
          e.id = ((i + self.players.length - self.thisPlayer) % self.players.length) + 1;
        });
        const activePlayer = self.players[self.activePlayer];
        const thisPlayer = self.players[self.thisPlayer];
        self.setState(gameData.state.toLowerCase());
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        $('.hud').attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
        $('.hud').attr('data-isdealer', self.isDealer ? '1' : '0');
        $('.hud').attr('data-ishost', self.isHost ? '1' : '0');
        $('.hud').attr('data-timer', gameData.timerstate);
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="start"]').attr('data-enabled', self.isActivePlayer && self.state == 'start' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="submit"]').attr('data-enabled', self.isActivePlayer && self.state == 'play' ? '1' : '0');
        $('.middle .section:nth-of-type(1) .title').css('--color', gameData.challengecolor.length == 6 ? `#${gameData.challengecolor}` : '');
        $('.middle .section:nth-of-type(1) input[type="text"]').attr('data-status', thisPlayer.last.status);
        $('.middle .section:nth-of-type(2) .title').text(gameData.round == 0 ? '' : `Round ${gameData.round}`);
        for (let player of self.players) {
          let boardDiv = $(`.middle .section:nth-of-type(3) .board[data-player="${player.id}"]`);
          $(boardDiv).attr('data-status', player.isLoser ? '2' : (player.id == activePlayer.id ? player.last.status : '0'));
          $(boardDiv).find('.icon').attr('data-id', player.last.play);
          $(boardDiv).find('.player').text(player.name).attr('data-leader', player.isLeader ? '1' : '0').attr('data-host', player.isHost ? '1' : '0');
          $(boardDiv).find('.word').text(player.last.word.substr(0, 1).toUpperCase() + player.last.word.substr(1));
          $(boardDiv).find('.points').text((player.last.points ?? 0) == 0 ? '' : player.last.points.toLocaleString());
          $(boardDiv).find('.score').text((player.game ?? 0) == 0 ? '' : player.game.toLocaleString());
        }
        self.showIndicators();
      }
    }
    if (name == 'event') {
      for (let event of data.event) {
        const url = new URL(There.data.channels.event.data.event[0].query, 'http://host/');
        if (url.pathname.toLowerCase() == '/uirej') {

          if (url.searchParams.get('uiid') == self.uiid && url.searchParams.get('avoid') == There.variables.there_pilotdoid) {
          }
        }
      }
    }
  }

  setState(state) {
    let self = this;
    if (self.state == state) {
      return;
    }
    if (state == 'endgame' && self.state != undefined) {
      There.playSound('cards game over');
    }
    self.state = state;
    $('.hud').attr('data-gamestate', self.state);
    self.resetIndicators();
    self.clearRevertTimers();
    if (self.state == 'start') {
      $('.middle .section:nth-of-type(1) input[type="text"]').val('');
    }
    if (self.state == 'play') {
      requestAnimationFrame(function() {
        There.fsCommand('getKeyboardFocus');
      });
    }
  }

  resetIndicators() {
    let self = this;
    self.blinkCount = 0;
    self.clearIndicators();
  }

  clearIndicators() {
    let self = this;
    $('.left .panel[data-id="game"] .button').attr('data-highlighted', '0');
    $('.middle .section:nth-of-type(3) .board .turn').attr('data-visible', '');
  }

  showIndicators() {
    let self = this;
    let duration = 0;
    let isBlink = false;
    if (self.isActivePlayer && !self.state.endsWith('send')) {
      if (self.blinkCount % 2 == 0) {
        duration = 2000;
        isBlink = false;
      } else {
        duration = 150;
        isBlink = true;
        if (self.blinkCount < 6 || self.blinkCount % 10 == 5) {
          There.playSound('cards your turn')
        }
      }
      self.blinkCount++;
    }
    self.clearIndicators();
    if (self.activePlayer >= 0) {
      const activePlayer = self.players[self.activePlayer];
      switch (self.state) {
        case 'start': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="start"]').attr('data-highlighted', '1');
            $(`.middle .section:nth-of-type(3) .board[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '0');
          } else {
            $(`.middle .section:nth-of-type(3) .board[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'play': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="submit"]').attr('data-highlighted', '1');
            $(`.middle .section:nth-of-type(3) .board[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '0');
          } else {
            $(`.middle .section:nth-of-type(3) .board[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
      }
    }
    if (duration == 0) {
      There.clearNamedTimer('turn-indicator');
    } else {
      There.setNamedTimer('turn-indicator', duration, function() {
        self.showIndicators();
      });
    }
  }

  clearRevertTimers() {
    let self = this;
  }
}

$(document).ready(function() {
  $('.left .panel[data-id="game"] .button[data-id="newgame"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(1);
  });

  $('.left .panel[data-id="game"] .button[data-id="rules"]').on('click', function() {
    const rulesPath = There.data.channels?.hudconfig?.data?.rulesurl;
    if (rulesPath != undefined) {
      There.guiCommand({
        action: 'browse',
        url: `https://${There.variables.there_webapps}${rulesPath}`,
      });
    }
  });

  $('.left .panel[data-id="game"] .button[data-id="start"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(2);
  });

  $('.left .panel[data-id="game"] .button[data-id="submit"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    const value = $('.middle .section:nth-of-type(1) input[type="text"]').val().toLowerCase();
    if (value == '') {
      There.data.messages.addMessage(0, `Please type your word in the box.`);
      return;
    }
    There.sendEventMessageToClient(10, {
      arg: value,
    });
  });

  $('.middle .section:nth-of-type(1) input[type="text"]').on('keypress', function(event) {
    if (event.which == 13) {
      $('.left .panel[data-id="game"] .button[data-id="submit"]').trigger('click');
    }
  });
});