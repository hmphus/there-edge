class CardSet {
  constructor(id, name, settings) {
    let self = this;
    self.id = id;
    self.name = name;
    self.settings = Object.assign({}, {
      offset: 0,
      sorted: true,
      selectable: false,
    }, settings ?? {});
    self.element = $(`.cardset[data-id="${self.id}"]`);
    self.cardsText = null;
    self.cardsUnsorted = [];
    self.cards = [];
    self.suits = 'abcde';
    self.ranks = '0123456789rsdwz';
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.id == 'spot' && cards.length == 2) {
        cards = cards[0] + There.data.game.leadSuit;
      }
      if (cards != undefined && self.cardsText != cards) {
        self.cardsText = cards;
        if (cards.startsWith('#')) {
          self.cardsUnsorted = Array(Number(self.cardsText.substr(1))).fill('??');
          self.cards = self.cardsUnsorted.concat();
        } else {
          self.cardsUnsorted = self.cardsText.match(/.{1,2}/g) ?? [];
          self.cards = self.cardsUnsorted.concat();
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
          } else if (self.settings.offset > 0) {
            self.cards = self.cards.concat(self.cards.splice(0, self.settings.offset));
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
              if (There.data.game.state.endsWith('send')) {
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
              if (There.data.game.state == 'play') {
                $(cardDiv).attr('data-selected', '1');
                //There.data.game.playCard($(cardDiv).attr('data-id'));
              }
            });
          }
        }
        if (self.id == 'hand') {
          $('.middle .table[data-player="1"] .title .count[data-id="hand"]').text(self.cards.length > 0 ?`(${self.cards.length})` : '');
        }
        //There.data.game.clearRevertTimers();
      }
    }
  }

  get selected() {
    let self = this;
    return jQuery.map($(self.element).find('.card[data-selected="1"]'), e => $(e).attr('data-id'));
  }

  set selected(id) {
    let self = this;
    if (!self.settings.selectable) {
      return;
    }
    $(self.element).find('.card').attr('data-selected', '0');
    $(self.element).find(`.card[data-id=${id}]`).attr('data-selected', '1');
  }
}

/*class Score {
  constructor(id) {
    let self = this;
    const selector = `.left .panel[data-id="score"] .section[data-team="${id}"]`;
    self.element = $(selector);
    self.playersText = new EllipsisText(`${selector} .players span`);
    self.pointsDiv = $(selector).find('span[data-id="points"]');
    self.bagsDiv = $(selector).find('span[data-id="bags"]');
  }

  set players(text) {
    let self = this;
    self.playersText.value = text;
  }

  set points(value) {
    let self = this;
    $(self.pointsDiv).text(value.toLocaleString());
  }

  set bags(value) {
    let self = this;
    $(self.bagsDiv).text(value.toLocaleString());
  }
}*/

class Game {
  constructor() {
    let self = this;
    self.playId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      hand: null,
      spot: null,
      players: [],
    };
    /*There.data.scores = [
      new Score(1),
      new Score(2),
      new Score(3),
      new Score(4),
    ];*/
    //There.fsCommand('devtools');
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
            hand: e.roundpoints == '' ? null : Number(e.roundpoints),
            game: e.gamepoints == '' ? null : Number(e.gamepoints),
            inGame: e.ingame == 1,
          };
        });
        self.thisPlayer = playerData.player.findIndex(e => e.avoid == There.variables.there_pilotdoid);
        self.players.forEach(function(e, i) {
          e.id = ((i + self.players.length - self.thisPlayer) % self.players.length) + 1;
        });
        self.activePlayer = Number(gameData.currentplayer) - 1;
        self.setState(gameData.state.toLowerCase());
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isReversed = gameData.reverse == 1;
        let leadSuit = gameData.leadsuit.toLowerCase();
        if (self.leadSuit != leadSuit) {
          self.leadSuit = leadSuit;
          if (There.data.channels?.cardset?.data != undefined) {
            There.data.channels.cardset.notify();
          }
        }
        $('.hud').attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="deal"]').attr('data-enabled', self.isActivePlayer && self.state == 'deal' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="discard"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="draw1"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="draw2"]').attr('data-enabled', self.isActivePlayer && self.state == 'draw' ? '1' : '0');
        /*
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
        */
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`, {
            selectable: true,
          });
          There.data.cardsets.spot = new CardSet('spot', `spot`, {
            sorted: false,
          });
          /*
          self.players.forEach(function(e, i) {
            There.data.cardsets.players.push(new CardSet(`played${e.id}`, `played${i + 1}`));
          });
          */
          if (There.data.channels?.cardset?.data != undefined) {
            There.data.channels.cardset.notify();
          }
        }
        self.showIndicators();
      }
    }
    if (name == 'event') {
      for (let event of data.event) {
        const url = new URL(There.data.channels.event.data.event[0].query, 'http://host/');
        if (url.pathname.toLowerCase() == '/uirej') {
          if (url.searchParams.get('uiid') == self.uiid && url.searchParams.get('avoid') == There.variables.there_pilotdoid) {
            /*if (self.state == 'playsend') {
              self.revertPlayCard();
            }*/
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
    if (state == 'endgame' && self.state == undefined) {
      There.playSound('cards game over');
    }
    self.state = state;
    $('.hud').attr('data-gamestate', self.state);
    self.resetIndicators();
    There.clearNamedTimer('card-play');
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
    $('.cardset[data-id^="played"]').attr('data-highlighted', '0');
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
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'discard': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="discard"]').attr('data-highlighted', '1');
            $('.left .panel[data-id="game"] .button[data-id="draw1"]').attr('data-highlighted', '1');
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'draw': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="draw2"]').attr('data-highlighted', '1');
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
});