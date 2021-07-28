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
    self.suits = 'shcd';
    self.ranks = 'akqjt98765432';
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cardsNew = [];
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.cardsText != cards) {
        self.cardsText = cards;
        if (cards.startsWith('#')) {
          self.cardsUnsorted = Array(Number(self.cardsText.substr(1))).fill('??');
          self.cards = self.cardsUnsorted.concat();
        } else {
          const cardsPrev = self.cards.concat();
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
            self.cards = self.cards.concat(self.cards.splice(0, self.settings.offset))
          }
          if (self.id == 'hand' && There.data.game.state.startsWith('pass') && cardsPrev.length > 0) {
            for (let card of self.cards) {
              if (cardsPrev.indexOf(card) < 0 && cardsNew.indexOf(card) < 0) {
                cardsNew.push(card);
              }
            }
            if (cardsNew.length > 0) {
              There.data.messages.addMessage(0, `You have received ${cardsNew.length} new ${cardsNew.length == 1 ? 'card' : 'cards'}.`);
            }
          }
        }
        $(self.element).empty();
        for (let card of self.cards) {
          let cardDiv = $('<div class="card"><span></span><span></span></div>');
          $(cardDiv).attr('data-id', card);
          if (self.id == 'hand' && cardsNew.indexOf(card) >= 0) {
            $(cardDiv).attr('data-new', '1');
          }
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
              if (There.data.game.state == 'pass') {
                let selected = $(cardDiv).attr('data-selected');
                if (selected != 1) {
                  if ($(self.element).find('.card[data-selected="1"]').length < 3) {
                    $(cardDiv).attr('data-selected', '1');
                  }
                } else {
                  $(cardDiv).attr('data-selected', '0');
                }
              } else {
                let selected = $(cardDiv).attr('data-selected');
                if (selected != 1) {
                  $(self.element).find('.card').attr('data-new', '0').attr('data-selected', '0');
                  $(cardDiv).attr('data-selected', '1');
                } else {
                  There.setNamedTimer('card-click', 100, function() {
                    $(cardDiv).attr('data-selected', '0');
                  });
                }
              }
            }).on('dblclick', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state == 'play') {
                $(self.element).find('.card').attr('data-new', '0');
                $(cardDiv).attr('data-selected', '1');
                There.data.game.playCard($(cardDiv).attr('data-id'));
              }
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

  set selected(ids) {
    let self = this;
    if (!self.settings.selectable) {
      return;
    }
    $(self.element).find('.card').attr('data-selected', '0');
    if (ids.constructor.name != 'Array') {
      ids = [ids];
    }
    for (let id of ids) {
      $(self.element).find(`.card[data-id=${id}]`).attr('data-selected', '1');
    }
  }

  detachCard(id) {
    let self = this;
    self.cardsText = null;
    let cardDiv = $(self.element).find(`.card[data-id="${id}"]`).detach();
    $(cardDiv).off('mouseover mousedown click dblclick');
    $(cardDiv).attr('data-selected', '0');
    return cardDiv;
  }

  attachCard(cardDiv) {
    let self = this;
    self.cardsText = null;
    $(self.element).append(cardDiv);
  }
}

class Game {
  constructor() {
    let self = this;
    self.passIds = null;
    self.playId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      hand: null,
      melds: [],
    };
    There.fsCommand('devtools');
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
        $('.hud').attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="deal"]').attr('data-enabled', self.isActivePlayer && self.state == 'deal' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="pass"]').attr('data-enabled', self.isActivePlayer && self.state == 'pass' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="play"]').attr('data-enabled', self.isActivePlayer && self.state == 'play' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="taketrick"]').attr('data-enabled', self.isActivePlayer && self.state == 'taketrick' ? '1' : '0');
        for (let player of self.players) {
          let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
          $(tableDiv).find('.player').text(player.name);
          $(tableDiv).find('.stats span[data-id="game"]').text(player.game == null ? '--' : player.game);
        }
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`, {
            selectable: true,
          });
          self.players.forEach(function(e, i) {
            There.data.cardsets.melds.push(new CardSet(`meld${e.id}`, `melda${i + 1}`, {
              selectable: true,
            }));
          });
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
            if (self.state == 'passsend') {
              self.revertPassCards();
            }
            if (self.state == 'playsend') {
              self.revertPlayCard();
            }
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
    There.clearNamedTimer('card-pass');
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
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'pass': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="pass"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
            $('.left .panel[data-id="game"] .button[data-id="taketrick"]').attr('data-highlighted', '1');
          }
          $(`.cardset[data-id="played${activePlayer.id}"]`).attr('data-highlighted', '1');
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

  passCards(ids) {
    let self = this;
    if (self.state != 'pass' || !self.isActivePlayer) {
      return;
    }
    self.setState('passsend');
    self.passIds = ids;
    for (let id of ids) {
      There.data.cardsets.hand.detachCard(id);
    }
    self.uiid++;
    There.sendEventMessageToClient(6, {
      cardset: `hand${self.players[self.thisPlayer].id}`,
      cards: self.passIds.map(e => There.data.cardsets.hand.cardsUnsorted.indexOf(e) + 1).join(' '),
      uiid: self.uiid,
    });
    There.setNamedTimer('card-pass', 5000, function() {
      self.revertPassCards();
      There.data.messages.addMessage(0, `Please try passing the cards again later.`);
    });
  }

  revertPassCards() {
    let self = this;
    if (self.passIds == null) {
      return;
    }
    There.data.channels.game.notify();
    There.data.channels.cardset.notify();
    There.data.cardsets.hand.selected = self.passIds;
    self.passIds = null;
  }

  playCard(id) {
    let self = this;
    if (self.state != 'play' || !self.isActivePlayer) {
      return;
    }
    self.setState('playsend');
    self.playId = id;
    let cardDiv = There.data.cardsets.hand.detachCard(self.playId);
    There.data.cardsets.players[self.thisPlayer].attachCard(cardDiv);
    self.uiid++;
    There.sendEventMessageToClient(3, {
      cardset: `hand${self.players[self.thisPlayer].id}`,
      cards: There.data.cardsets.hand.cardsUnsorted.indexOf(self.playId) + 1,
      uiid: self.uiid,
    });
    There.setNamedTimer('card-play', 5000, function() {
      self.revertPlayCard();
      There.data.messages.addMessage(0, `Please try playing the card again later.`);
    });
  }

  revertPlayCard() {
    let self = this;
    if (self.playId == null) {
      return;
    }
    There.data.channels.game.notify();
    There.data.channels.cardset.notify();
    There.data.cardsets.hand.selected = self.playId;
    self.playId = null;
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

  $('.left .panel[data-id="game"] .button[data-id="pass"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'pass') {
      There.data.messages.addMessage(0, `It isn't your turn to pass cards.`);
      return;
    }
    let selectedCards = There.data.cardsets.hand?.selected ?? [];
    if (selectedCards.length != 3) {
      There.data.messages.addMessage(0, `Please select 3 cards to be passed.`);
      return;
    }
    There.data.game.passCards(selectedCards);
  });

  $('.left .panel[data-id="game"] .button[data-id="play"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'play') {
      There.data.messages.addMessage(0, `It isn't your turn to play a card.`);
      return;
    }
    let selectedCards = There.data.cardsets.hand?.selected ?? [];
    if (selectedCards.length != 1) {
      There.data.messages.addMessage(0, `Please select a card to be played.`);
      return;
    }
    There.data.game.playCard(selectedCards[0]);
  });

  $('.left .panel[data-id="game"] .button[data-id="taketrick"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(5);
  });
});
