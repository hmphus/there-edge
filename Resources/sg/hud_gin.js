class CardSet {
  constructor(id, name, settings) {
    let self = this;
    self.id = id;
    self.name = name;
    self.settings = Object.assign({}, {
      sorted: true,
      selectable: false,
      draggable: false,
      multiple: false,
      grouped: false,
    }, settings ?? {});
    self.element = $(`.cardset[data-id="${self.id}"]`);
    self.cardsText = null;
    self.cardsUnsorted = [];
    self.cards = [];
    self.order = 'suit';
    self.suits = 'shcd';
    self.ranks = 'a23456789tjqk';
    self.dragDivs = [null, null];
    if (self.settings.draggable) {
      $(document).on('mousemove', function(event) {
        if (self.dragDivs[0] != null) {
          if (self.dragDivs[1] == null) {
            if (Math.abs(self.dragX - event.pageX + self.dragOffsetX) < 10) {
              return;
            }
            There.clearNamedTimer('card-click');
            self.beginDrag();
          }
          let x = Math.min(Math.max(self.dragMinX, event.pageX - self.dragOffsetX), self.dragMaxX);
          $(self.dragDivs[1]).css({
            left: x,
          });
          let index1 = self.dragCount + 1 - Math.floor(Math.min(x - self.dragMinX - self.dragMarginX, self.dragMaxX) / (self.dragMaxX - self.dragMinX) * self.dragCount);
          let index2 = $(self.dragDivs[0]).parent().find('.card').index($(self.dragDivs[0]));
          if (index1 != index2) {
            $(self.dragDivs[0]).parent().find('.card').not($(self.dragDivs[0])).eq(index1 - 1).after($(self.dragDivs[0]).detach());
          }
        }
      }).on('mouseup', function() {
        There.clearNamedTimer('card-click');
        if (self.dragDivs[0] != null) {
          if (self.dragDivs[1] != null) {
            self.endDrag();
          }
          self.dragDivs[0] = null;
        }
      });
    }
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cardsNew = [];
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.cardsText != cards) {
        There.clearNamedTimer('card-click');
        self.dragDivs[0] = null;
        self.dragDivs[1] = null;
        self.cardsText = cards;
        if (cards.startsWith('#')) {
          self.cardsUnsorted = Array(Number(self.cardsText.substr(1))).fill('??');
          self.cards = self.cardsUnsorted.concat();
        } else {
          const cardsPrev = self.cards.concat();
          self.cardsUnsorted = self.cardsText.match(/.{1,2}/g) ?? [];
          self.cards = self.cardsUnsorted.concat();
          if (self.settings.sorted) {
            switch (self.order) {
              case 'suit': {
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
                break;
              }
              case 'rank': {
                self.cards.sort(function(a, b) {
                  const rankA = a[0];
                  const rankB = b[0];
                  if (rankA != rankB) {
                    return self.ranks.indexOf(rankA) - self.ranks.indexOf(rankB);
                  }
                  const suitA = a[1];
                  const suitB = b[1];
                  return self.suits.indexOf(suitA) - self.suits.indexOf(suitB);
                });
                break;
              }
              case 'user': {
                break;
              }
            }
          }
          if (self.id == 'hand' && cardsPrev.length > 0 && There.data.game.splitId == null) {
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
              if (self.dragDivs[1] != null) {
                return;
              }
              There.playSound('enabled menu item rollover');
            }).on('mousedown', function(event) {
              if (self.dragDivs[1] != null) {
                return;
              }
              There.playSound('menu item activate');
              if (self.settings.draggable && event.which == 1) {
                self.dragDivs[0] = cardDiv;
                There.setNamedTimer('card-click', 500, function() {
                  self.beginDrag();
                });
                self.dragX = $(self.dragDivs[0]).position().left + parseInt($(self.dragDivs[0]).css('margin-left'));
                self.dragOffsetX = event.pageX - self.dragX;
                let minDiv = $(self.dragDivs[0]).parent().find('.card').last();
                let maxDiv = $(self.dragDivs[0]).parent().find('.card').first();
                self.dragMinX = $(minDiv).position().left + parseInt($(minDiv).css('margin-left'));
                self.dragMaxX = $(maxDiv).position().left + parseInt($(maxDiv).css('margin-left'));
                self.dragMarginX = parseInt($(maxDiv).css('margin-left'));
                self.dragCount = $(self.dragDivs[0]).parent().find('.card').length - 1;
              }
            }).on('click', function() {
              There.clearNamedTimer('card-click');
              if (self.dragDivs[1] != null) {
                return;
              }
              if (There.data.game.state.endsWith('send')) {
                return;
              }
              for (let cardset of Object.values(There.data.cardsets).flat()) {
                if (cardset.id != self.id) {
                  $(cardset.element).find('.card').attr('data-selected', '0');
                }
                $('.middle .button[data-id="group"]').attr('data-action', 'group').text('Group');
              }
              if (self.settings.grouped) {
                let selected = $(cardDiv).attr('data-selected');
                if (selected != 1) {
                  $(self.element).find('.card').attr('data-new', '0').attr('data-selected', '1');
                  $('.middle .button[data-id="group"]').attr('data-action', 'split').text('Split');
                } else {
                  $(self.element).find('.card').attr('data-selected', '0');
                }
              } else if (self.settings.multiple) {
                let selected = $(cardDiv).attr('data-selected');
                if (selected != 1) {
                  $(cardDiv).attr('data-selected', '1').attr('data-new', '0');
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
              if (self.dragDivs[1] != null) {
                return;
              }
              if (There.data.game.state == 'draw') {
                if (self.id == 'deck') {
                  $(cardDiv).attr('data-selected', '1');
                  There.data.game.drawCard('stock');
                }
                if (self.id == 'spot') {
                  $(cardDiv).attr('data-selected', '1');
                  There.data.game.drawCard('discard');
                }
              }
            });
          }
        }
        if (self.id == 'hand') {
          $('.middle .table[data-player="1"] .title .count[data-id="hand"]').text(self.cards.length > 0 ?`(${self.cards.length})` : '');
          $('.left .panel[data-id="game"] .button[data-id="knock"]').text(There.data.game.isActivePlayer && self.cards.length == 1 ? 'Gin' : 'Knock');
        }
        if (self.id == 'deck') {
          $('.middle .table[data-player="1"] .title .count[data-id="deck"]').text(self.cards.length > 0 ?`(${self.cards.length})` : '');
        }
        if (self.id == 'history') {
          const count1 = self.cards.length;
          const count2 = There.data.cardsets.spot?.cards?.length ?? 0;
          let stack = '0';
          if (count1 > 0 && count2 > 0) {
            if (There.data.cardsets.spot.cards[0] == '??') {
              stack = '2';
            } else {
              stack = '1';
            }
          }
          $('.middle .table[data-player="1"] .cardset[data-id="spot"]').attr('data-stack',  stack);
        }
        There.data.game.clearRevertTimers();
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

  sort(order) {
    let self = this;
    if (self.order != order) {
      self.order = order;
      self.cardsText = null;
      if (There.data.channels?.cardset?.data != undefined) {
        There.data.channels.cardset.notify(this);
      }
    }
  }

  beginDrag() {
    let self = this;
    if (self.dragDivs[0] == null || self.dragDivs[1] != null) {
      return;
    }
    self.dragDivs[1] = $(self.dragDivs[0]).clone();
    $(self.dragDivs[0]).attr('data-hidden', '1');
    $(self.dragDivs[1]).attr('data-dragging', '1');
    $(self.dragDivs[1]).css({
      left: self.dragX,
    });
    $(self.dragDivs[0]).parent().prepend($(self.dragDivs[1]));
  }

  endDrag() {
    let self = this;
    if (self.dragDivs[0] == null || self.dragDivs[1] == null) {
      return;
    }
    $(self.dragDivs[0]).attr('data-hidden', '0');
    $(self.dragDivs[1]).remove();
    self.dragDivs[1] = null;
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
    self.drawId = null;
    self.discardId = null;
    self.showIds = null;
    self.groupIds = null;
    self.splitId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      hand: null,
      deck: null,
      spot: null,
      history: null,
      melds: [],
    };
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
        $('.left .panel[data-id="game"] .button[data-id="draw"]').attr('data-enabled', self.isActivePlayer && self.state == 'draw' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="discard"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="knock"]').attr('data-enabled', self.isActivePlayer && self.state == 'discard' ? '1' : '0');
        $('.left .panel[data-id="game"] .button[data-id="show"]').attr('data-enabled', self.isActivePlayer && self.state == 'knock' ? '1' : '0');
        $('.middle .button[data-id="group"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
        for (let player of self.players) {
          let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
          $(tableDiv).find('.player').text(player.name);
          $(tableDiv).find('.stats span[data-id="game"]').text(player.game == null ? '--' : player.game);
        }
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`, {
            selectable: true,
            draggable: true,
            multiple: true,
          });
          There.data.cardsets.deck = new CardSet('deck', `deck`, {
            selectable: true,
            sorted: false,
          });
          There.data.cardsets.spot = new CardSet('spot', `spot`, {
            selectable: true,
            sorted: false,
          });
          There.data.cardsets.history = new CardSet('history', `discardHist`, {
            sorted: false,
          });
          self.players.forEach(function(e, i) {
            for (let letter of 'abcd') {
              There.data.cardsets.melds.push(new CardSet(`meld${letter}${e.id}`, `meld${letter}${i + 1}`, {
                selectable: true,
                sorted: true,
                grouped: true,
              }));
            }
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
            if (self.drawId != null) {
              self.revertDrawCard();
            }
            if (self.discardId != null) {
              self.revertDiscardCard();
            }
            if (self.showIds != null) {
              self.revertShowCards();
            }
            if (self.groupIds != null) {
              self.revertGroupCards();
            }
            if (self.splitId != null) {
              self.revertSplitCards();
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
    self.clearRevertTimers();
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
        case 'prompt': {
          if (!isBlink) {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'draw': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="draw"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'discard': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="discard"]').attr('data-highlighted', '1');
          } else {
            $(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'knock': {
          if (isBlink) {
            $('.left .panel[data-id="game"] .button[data-id="show"]').attr('data-highlighted', '1');
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
    There.clearNamedTimer('card-draw');
    There.clearNamedTimer('card-discard');
    There.clearNamedTimer('card-show');
    There.clearNamedTimer('card-group');
    There.clearNamedTimer('card-split');
    self.drawId = null;
    self.discardId = null;
    self.showIds = null;
    self.groupIds = null;
    self.splitId = null;
  }

  drawCard(deckId) {
    let self = this;
    if (self.state != 'draw' || !self.isActivePlayer) {
      return;
    }
    self.setState('drawsend');
    self.drawId = deckId;
    self.uiid++;
    There.sendEventMessageToClient(7, {
      deck: deckId,
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

  discardCard(id, action) {
    let self = this;
    if (self.state != 'discard' || !self.isActivePlayer) {
      return;
    }
    self.setState('discardsend');
    self.discardId = id;
    self.uiid++;
    There.sendEventMessageToClient(3, {
      action: action,
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

  showCards() {
    let self = this;
    if (self.state != 'knock' || !self.isActivePlayer) {
      return;
    }
    self.setState('knocksend');
    self.discardIds = ['melds'];
    self.uiid++;
    There.sendEventMessageToClient(9, {
      uiid: self.uiid,
    });
    There.setNamedTimer('card-show', 5000, function() {
      self.revertShowCards();
    });
  }

  revertShowCards() {
    let self = this;
    if (self.showIds == null) {
      return;
    }
    There.data.channels.game.notify();
    self.showIds = null;
  }

  groupCards(ids) {
    let self = this;
    if (self.groupIds != null || !self.isActivePlayer) {
      return;
    }
    self.groupIds = ids;
    self.uiid++;
    There.sendEventMessageToClient(3, {
      action: 'meld',
      cardset: `hand${self.players[self.thisPlayer].id}`,
      cards: self.groupIds.map(e => There.data.cardsets.hand.cardsUnsorted.indexOf(e) + 1).join(' '),
      uiid: self.uiid,
    });
    There.setNamedTimer('card-group', 5000, function() {
      self.revertGroupCards();
    });
  }

  revertGroupCards() {
    let self = this;
    if (self.groupIds == null) {
      return;
    }
    self.groupIds = null;
  }

  splitCards(meldId) {
    let self = this;
    if (self.splitId != null || !self.isActivePlayer) {
      return;
    }
    self.splitId = meldId;
    self.uiid++;
    There.sendEventMessageToClient(8, {
      action: 'unmeld',
      meldid: self.splitId.substr(0, self.splitId.length - 1),
      uiid: self.uiid,
    });
    There.setNamedTimer('card-split', 5000, function() {
      self.revertSplitCards();
    });
  }

  revertSplitCards() {
    let self = this;
    if (self.splitId == null) {
      return;
    }
    self.splitId = null;
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

  $('.left .panel[data-id="game"] .button[data-id="draw"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'draw') {
      return;
    }
    let selectedCards1 = There.data.cardsets.deck?.selected ?? [];
    let selectedCards2 = There.data.cardsets.spot?.selected ?? [];
    if (selectedCards1.length + selectedCards2.length != 1) {
      There.data.messages.addMessage(0, `Please select a deck to draw from.`);
      return;
    }
    if (selectedCards1.length == 1) {
      There.data.game.drawCard('stock');
    } else {
      There.data.game.drawCard('discard');
    }
  });

  $('.left .panel[data-id="game"] .button[data-id="discard"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'discard') {
      return;
    }
    let selectedCards = There.data.cardsets.hand?.selected ?? [];
    if (selectedCards.length != 1) {
      There.data.messages.addMessage(0, `Please select one card to discard.`);
      return;
    }
    There.data.game.discardCard(selectedCards[0], 'discard');
  });

  $('.left .panel[data-id="game"] .button[data-id="knock"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'discard') {
      return;
    }
    let selectedCards = There.data.cardsets.hand?.selected ?? [];
    if (selectedCards.length != 1) {
      There.data.messages.addMessage(0, `Please select one card to discard.`);
      return;
    }
    There.data.game.discardCard(selectedCards[0], 'knock');
  });

  $('.left .panel[data-id="game"] .button[data-id="show"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.game.state != 'knock') {
      return;
    }
    There.data.game.showCards();
  });

  $('.middle .button[data-id="sort234"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.cardsets.hand != undefined) {
      There.data.cardsets.hand.sort('suit');
    }
  });

  $('.middle .button[data-id="sort222"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if (There.data.cardsets.hand != undefined) {
      There.data.cardsets.hand.sort('rank');
    }
  });

  $('.middle .button[data-id="group"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    if ($(this).attr('data-action') == 'group') {
      let selectedCards = There.data.cardsets.hand?.selected ?? [];
      if (selectedCards.length < 3) {
        There.data.messages.addMessage(0, `Please select at least 3 cards to group.`);
        return;
      }
      There.data.game.groupCards(selectedCards);
    } else {
      let selectedMelds = There.data.cardsets.melds.filter(e => e.selected.length > 0);
      if (selectedMelds.length < 1) {
        return;
      }
      There.data.game.splitCards(selectedMelds[0].name);
    }
  });
});
