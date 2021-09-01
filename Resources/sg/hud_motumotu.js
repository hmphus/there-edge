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
      let cardsNew = [];
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
            self.cards = self.cards.concat(self.cards.splice(0, self.settings.offset));
          }
          if (self.id == 'hand' && cardsPrev.length > 0) {
            for (let card of self.cards) {
              if (cardsPrev.indexOf(card) < 0 && cardsNew.indexOf(card) < 0) {
                cardsNew.push(card);
              }
            }
            if (cardsNew.length > 0) {
              There.data.messages.addMessage(0, `You have received ${cardsNew.length} new ${cardsNew.length == 1 ? 'card' : 'cards'}.`);
            }
          }
          if (self.id == 'hand' && cardsNew.length == 0 && There.data.game.state == 'pass' && self.cardsUnsorted.length > 0) {
            cardsNew.push(self.cardsUnsorted[self.cardsUnsorted.length - 1]);
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
              if (There.data.game.state.startsWith('pass') && There.data.game.isActivePlayer) {
                return;
              }
              let selected = $(cardDiv).attr('data-selected');
              if (selected != 1) {
                $(self.element).find('.card').attr('data-new', '0').attr('data-selected', '0');
                $(cardDiv).attr('data-selected', '1');
              } else {
                There.setNamedTimer('card-click', 100, function() {
                  $(cardDiv).attr('data-selected', '0');
                });
              }
            }).on('dblclick', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state == 'discard') {
                $(cardDiv).attr('data-new', '0').attr('data-selected', '1');
                There.data.game.discardCard($(cardDiv).attr('data-id'));
              }
            });
          }
        }
        if (self.id == 'hand') {
          const width1 = $(self.element).innerWidth();
          const width2 = $(self.element).find('.card').outerWidth();
          let overlap = 1;
          if (self.cards.length > 2) {
            const excess = ((width2 + overlap) * (self.cards.length - 1) + width2) - width1;
            if (excess > 0) {
              overlap = -Math.min(width2 - 10, excess / (self.cards.length - 1) - overlap);
            }
          }
          $(self.element).find('.card').css('--overlap', `${overlap}px`);
        }
        if (self.id.startsWith('count')) {
          $(self.element).text(self.cards.length);
        }
        There.data.game.clearRevertTimers();
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

class Game {
  constructor() {
    let self = this;
    self.discardId = null;
    self.drawId = null;
    self.drawIds = null;
    self.answerId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      hand: null,
      spot: null,
      players: [],
    };
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
        $('.hud').attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0').attr('data-isreversed', self.isReversed ? '1' : '0');
        $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost ? '1' : '0');
        $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="deal"]').attr('data-enabled', self.isActivePlayer && self.state == 'deal' ? '1' : '0');
        $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="discard"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw1"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw2"]').attr('data-enabled', self.isActivePlayer && self.state == 'draw' ? '1' : '0');
        for (let player of self.players) {
          {
            let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
            $(tableDiv).attr('data-ingame', player.inGame ? '1' : '0');
            $(tableDiv).find('.player').text(player.name);
            $(tableDiv).find('.info .score').text(player.game == null ? '--' : player.game.toLocaleString());
          }
        }
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`, {
            selectable: true,
          });
          There.data.cardsets.spot = new CardSet('spot', `spot`, {
            sorted: false,
          });
          self.players.forEach(function(e, i) {
            There.data.cardsets.players.push(new CardSet(`count${e.id}`, `hand${i + 1}`));
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
            if (self.discardId != null) {
              self.revertDiscardCard();
            }
            if (self.drawId != null) {
              self.revertDiscardCard();
            }
            if (self.drawIds != null) {
              self.revertDiscardCards();
            }
            if (self.answerId != null) {
              self.revertAnswerPrompt();
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
    if (state == 'endgame' && self.state != undefined) {
      There.playSound('cards game over');
    }
    self.state = state;
    $('.hud').attr('data-gamestate', self.state);
    self.resetIndicators();
    self.clearRevertTimers();
  }

  resetIndicators() {
    let self = this;
    self.blinkCount = 0;
    self.clearIndicators();
  }

  clearIndicators() {
    let self = this;
    $('.left .panel[data-id="game"] .layer[data-id="game"] .button').attr('data-highlighted', '0');
    $('.left .panel[data-id="game"] .layer[data-id="prompt"] .cardset').attr('data-highlighted', '0');
    $('.left .panel[data-id="game"] .layer[data-id="pass"] .button').attr('data-highlighted', '0');
    $('.middle .table .turn').attr('data-visible', '0');
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
        case 'deal': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="deal"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'discard': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="discard"]').attr('data-highlighted', '1');
            $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw1"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'draw': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw2"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'prompt': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .layer[data-id="prompt"] .cardset').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'pass': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .layer[data-id="pass"] .button[data-id="discard"]').attr('data-highlighted', '1');
            $('.left .panel[data-id="game"] .layer[data-id="pass"] .button[data-id="pass"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
    There.clearNamedTimer('card-discard');
    There.clearNamedTimer('card-draw');
    There.clearNamedTimer('card-answer');
    self.discardId = null;
    self.drawId = null;
    self.drawIds = null;
    self.answerId = null;
  }

  discardCard(id) {
    let self = this;
    if (self.state != 'discard' || !self.isActivePlayer) {
      return;
    }
    self.setState('discardsend');
    self.discardId = id;
    self.uiid++;
    There.sendEventMessageToClient(3, {
      action: 'discard',
      cardset: `hand${self.players[self.thisPlayer].id}`,
      cards: There.data.cardsets.hand.cardsUnsorted.indexOf(self.discardId) + 1,
      uiid: self.uiid,
    });
    There.setNamedTimer('card-discard', 5000, function() {
      self.revertDiscardCard();
    });
  }

  revertDiscardCard() {
    let self = this;
    if (self.discardId == null) {
      return;
    }
    There.data.channels.game.notify();
    self.discardId = null;
  }

  drawCard() {
    let self = this;
    if (self.state != 'discard' || !self.isActivePlayer) {
      return;
    }
    self.setState('discardsend');
    self.drawId = 1;
    self.uiid++;
    There.sendEventMessageToClient(7, {
      uiid: self.uiid,
    });
    There.setNamedTimer('card-draw', 5000, function() {
      self.revertDrawCard();
    });
  }

  revertDrawCard() {
    let self = this;
    if (self.drawId == null) {
      return;
    }
    There.data.channels.game.notify();
    self.drawId = null;
  }

  drawCards() {
    let self = this;
    if (self.state != 'draw' || !self.isActivePlayer) {
      return;
    }
    self.setState('drawsend');
    self.drawIds = [1];
    self.uiid++;
    There.sendEventMessageToClient(7, {
      uiid: self.uiid,
    });
    There.setNamedTimer('card-draw', 5000, function() {
      self.revertDrawCards();
    });
  }

  revertDrawCards() {
    let self = this;
    if (self.drawIds == null) {
      return;
    }
    There.data.channels.game.notify();
    self.drawIds = null;
  }

  answerPrompt(id) {
    let self = this;
    if ((self.state != 'prompt' && self.state != 'pass') || !self.isActivePlayer) {
      return;
    }
    self.setState(`${self.state}send`);
    self.answerId = id;
    self.uiid++;
    There.sendEventMessageToClient(9, {
      action: id,
      uiid: self.uiid,
    });
    There.setNamedTimer('card-answer', 5000, function() {
      self.revertAnswerPrompt();
    });
  }

  revertAnswerPrompt() {
    let self = this;
    if (self.answerId == null) {
      return;
    }
    There.data.channels.game.notify();
    self.answerId = null;
  }

  callOne() {
    let self = this;
    self.uiid++;
    There.sendEventMessageToClient(9, {
      action: 105,
      uiid: self.uiid,
    });
  }
}

$(document).ready(function() {
  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="newgame"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(1);
  });

  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="rules"]').on('click', function() {
    const rulesPath = There.data.channels?.hudconfig?.data?.rulesurl;
    if (rulesPath != undefined) {
      There.guiCommand({
        action: 'browse',
        url: `https://${There.variables.there_webapps}${rulesPath}`,
      });
    }
  });

  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="deal"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(2);
  });

  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="discard"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'discard') {
      return;
    }
    let selectedCards = There.data.cardsets.hand?.selected ?? [];
    if (selectedCards.length != 1) {
      There.data.messages.addMessage(0, `Please select a card to discard.`);
      return;
    }
    There.data.game.discardCard(selectedCards[0]);
  });

  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw1"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'discard') {
      return;
    }
    There.data.game.drawCard();
  });

  $('.left .panel[data-id="game"] .layer[data-id="game"] .button[data-id="draw2"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'draw') {
      return;
    }
    There.data.game.drawCards();
  });

  $('.left .panel[data-id="game"] .layer[data-id="prompt"] .card').on('mouseover', function() {
    There.playSound('enabled menu item rollover');
  }).on('mousedown', function(event) {
    There.playSound('menu item activate');
  }).on('click', function() {
    if (There.data.game.state != 'prompt') {
      return;
    }
    There.data.game.answerPrompt($(this).attr('data-answer'));
  });

  $('.left .panel[data-id="game"] .layer[data-id="pass"] .button[data-id="discard"]').on('click', function() {
    if (There.data.game.state != 'pass') {
      return;
    }
    There.data.game.answerPrompt(100);
  });

  $('.left .panel[data-id="game"] .layer[data-id="pass"] .button[data-id="pass"]').on('click', function() {
    if (There.data.game.state != 'pass') {
      return;
    }
    There.data.game.answerPrompt(101);
  });

  $('.middle .button[data-id="one"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.callOne();
  });
});
