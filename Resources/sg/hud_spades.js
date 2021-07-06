class Game {
  constructor() {
    let self = this;
    self.previousGameStatesCount = 0;
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'player' || name == 'team' || name == 'game') {
      let playerData = There.data.channels?.player?.data;
      let teamData = There.data.channels?.team?.data;
      let gameData = There.data.channels?.game?.data;
      if (playerData != undefined && teamData != undefined && gameData != undefined) {
        self.players = playerData.player.map(function(e, i) {
          return {
            id: i + 1,
            name: e.avname.trim(),
            bid: e.bid == '' ? null : Number(e.bid),
            tricks: e.tricks == '' ? null : Number(e.tricks),
            team: null,
          };
        });
        self.thisPlayer = playerData.player.findIndex(e => e.avoid == There.variables.there_pilotdoid);
        self.teams = teamData.team.map(function(e) {
          let team = {
            id: Number(e.index),
            players: [...Array(4).keys()].map(function(v) {
              return Number(e[`player${v + 1}`] ?? 0) - 1;
            }).filter(v => v >= 0).map(v => self.players[v]),
          };
          team.players.forEach(e => e.team = team);
          return team;
        });
        self.playableCards = Number(gameData.playablecards ?? 1);
        self.activePlayer = Number(gameData.currentplayer) - 1;
        let state = gameData.state.toLowerCase();
        if (self.state != state) {
          self.state = state;
          if (self.state == 'endgame' && self.previousGameStatesCount > 0) {
            There.playSound('cards game over');
          }
          self.previousGameStatesCount++;
        }
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        $('.hud').attr('data-gamestate', self.state).attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
        $('.button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.button[data-id="deal"]').attr('data-enabled', self.isActivePlayer && self.state == 'deal' ? '1' : '0');
        $('.button[data-id="play"]').attr('data-enabled', self.isActivePlayer && self.state == 'play' ? '1' : '0');
        $('.button[data-id="taketrick"]').attr('data-enabled', self.isActivePlayer && self.state == 'taketrick' ? '1' : '0');
        for (let player of self.players) {
          let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
          $(tableDiv).find('.player').text(player.name);
          $(tableDiv).find('.stats span[data-id="bid"]').text(player.bid == null ? '--' : (player.bid == 0 ? 'Nil' : player.bid));
          $(tableDiv).find('.stats span[data-id="tricks"]').text(player.tricks == null ? '--' : player.tricks);
        }
      }
    }
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
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
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
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(2);
  });

  $('.button[data-id="play"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'play') {
      There.data.messages.addMessage(0, `It isn't your turn to play a card.`);
      return;
    }
    if (There.data.game.playersHand?.selectedCards?.length ?? 0 == 0) {
      There.data.messages.addMessage(0, `Please select a card to be played.`);
      return;
    }
  });

  $('.button[data-id="taketrick"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(5);
  });

  $('.button[data-id="bid"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(4, {
      action: 100 + Number($(this).attr('data-index')),
    });
  });
});
