class CardSet {
  constructor(id, name, settings) {
    let self = this;
    self.id = id;
    self.name = name;
    self.settings = Object.assign({}, {
      sorted: true,
      selectable: false,
    }, settings ?? {});
    self.element = $(`.cardset[data-id="${self.id}"]`);
    self.text = '';
    self.cards = [];
    self.suits = 'shcd';
    self.ranks = 'akqjt98765432';
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.text != cards) {
        self.text = cards;
        if (cards.startsWith('#')) {
          self.cards = Array(Number(self.text.substr(1))).fill('??');
        } else {
          self.cards = self.text.match(/.{1,2}/g);
          if (self.settings.sorted) {
            self.cards.sort(function(a, b) {
              const suitA = a[1];
              const suitB = b[1];
              if (suitA != suitB) {
                return self.suits.indexOf(suitA) - self.suits.indexOf(suitB);
              }
              const rankA = a[0];
              const rankB = b[0];
              return self.ranks.indexOf(rankA) - self.ranks.indexOf(rankB);
            });
          }
        }
        $(self.element).empty();
        for (let card of self.cards) {
          let cardDiv = $('<div class="card"><span></span><span></span></div>');
          $(cardDiv).attr('data-id', card);
          $(self.element).prepend($(cardDiv));
          if (self.settings.selectable) {
            $(cardDiv).on('mouseover', function() {
              There.playSound('enabled menu item rollover');
            }).on('mousedown', function(event) {
              There.playSound('menu item activate');
            }).on('click', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state == 'playsend') {
                return;
              }
              let selected = $(cardDiv).attr('data-selected');
              if (selected != 1) {
                $(self.element).find('.card').attr('data-selected', '0');
                $(cardDiv).attr('data-selected', '1');
              } else {
                There.setNamedTimer('card-click', 100, function() {
                  $(cardDiv).attr('data-selected', '0');
                });
              }
            }).on('dblclick', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state == 'playsend') {
                return;
              }
              $(cardDiv).attr('data-selected', '1');
              There.data.game.playCard($(cardDiv).attr('data-id'));
            });
          }
        }
      }
    }
  }

  get selected() {
    let self = this;
    return jQuery.map($(self.element).find('.card[data-selected="1"]'), e => $(e).attr('data-id'));
  }
}

class Game {
  constructor() {
    let self = this;
    self.previousGameStatesCount = 0;
    There.data.listeners.push(self);
    There.data.cardsets = {
      hand: null,
      players: [
        new CardSet('played1', 'played1'),
        new CardSet('played2', 'played2'),
        new CardSet('played3', 'played3'),
        new CardSet('played4', 'played4'),
      ],
      lasttrick: new CardSet('lasttrick', 'lasttrick', {
        sorted: false,
      }),
    };
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
          self.resetIndicators();
          if (self.state == 'endgame' && self.previousGameStatesCount > 0) {
            There.playSound('cards game over');
          }
          self.previousGameStatesCount++;
        }
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        $('.hud').attr('data-gamestate', self.state).attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="deal"]').attr('data-enabled', self.isActivePlayer && self.state == 'deal' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="play"]').attr('data-enabled', self.isActivePlayer && self.state == 'play' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="taketrick"]').attr('data-enabled', self.isActivePlayer && self.state == 'taketrick' ? '1' : '0');
        for (let player of self.players) {
          {
            let playerDiv = $(`.left .panel[data-id="tricks"] .players .player[data-player="${player.id}"]`);
            $(playerDiv).text(player.name);
          }
          {
            let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
            $(tableDiv).find('.player').text(player.name);
            $(tableDiv).find('.stats span[data-id="bid"]').text(player.bid == null ? '--' : (player.bid == 0 ? 'Nil' : player.bid));
            $(tableDiv).find('.stats span[data-id="tricks"]').text(player.tricks == null ? '--' : player.tricks);
          }
        }
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.players[self.thisPlayer].id}`, {
            selectable: true,
          });
          let cardsetData = There.data.channels?.cardset?.data;
          if (cardsetData != undefined) {
            There.data.cardsets.hand.onData('cardset', cardsetData);
          }
        }
        self.showIndicators();
      }
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
    $('.middle .table .turn').attr('data-visible', '0');
    $('.cardset[data-id^="player"]').attr('data-highlighted', '0');
  }

  showIndicators() {
    let self = this;
    let duration = 0;
    let isBlink = false;
    if (self.isActivePlayer && self.state != 'playsend') {
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
        case 'deal': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="deal"]').attr('data-highlighted', '1');
          }
          break;
        }
        case 'bid': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="bid"]').attr('data-highlighted', '1');
          }
          break;
        }
        case 'play': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="play"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'taketrick': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="play"]').attr('data-highlighted', '1');
          }
          $(`.cardset[data-id="player${activePlayer.id}"]`).attr('data-highlighted', '1');
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

  playCard(card) {
    let self = this;
    if (self.state != 'play') {
      return;
    }
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

  $('.left .panel[data-id="game"] .button[data-id="deal"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(2);
  });

  $('.left .panel[data-id="game"] .button[data-id="play"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'play') {
      There.data.messages.addMessage(0, `It isn't your turn to play a card.`);
      return;
    }
    let selectedCard = There.data.cardsets.hand?.selected ?? [];
    if (selectedCard.length == 0) {
      There.data.messages.addMessage(0, `Please select a card to be played.`);
      return;
    }
    There.data.game.playCard(selectedCard[0]);
  });

  $('.left .panel[data-id="game"] .button[data-id="taketrick"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(5);
  });

  $('.left .panel[data-id="game"] .button[data-id="bid"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(4, {
      action: 100 + Number($(this).attr('data-index')),
    });
  });
});
