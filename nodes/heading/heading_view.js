"use strict";

var _ = require('underscore');
var util = require('substance-util');
var html = util.html;
var View = require('substance-application').View;
var Surface = require('substance-surface');

// Substance.Heading
// ==========================================================================

var Heading = function(node) {
  View.call(this);
  this.node = node;

  this.$el.addClass('content-node heading');
  this.$el.attr('id', this.node.id);
};

Heading.Prototype = function() {
  // Rendering
  // =============================
  //

  this.render = function() {
    this.$el.html(html.tpl('text', this.node));
    this.renderContent();
    return this;
  };

  this.dispose = function() {
    console.log('disposing text view');
    this.stopListening();
  };

  this.renderContent = function() {
    this.$('.content').empty();
    this.insert(0, this.node.content);
  };

  this.insert = function(pos, str) {
    var content = this.$('.content')[0];

    // TODO: explain why this whitespace thingie is necessary
    var chars = str.split('');
    var charEls = _.map(chars, function(ch) {
      if (ch === " ") ch = " ";
      return $('<span>'+ch+'</span>')[0];
    });

    var spans = content.childNodes;
    var i;
    if (pos >= spans.length) {
      for (i = 0; i < charEls.length; i++) {
        content.appendChild(charEls[i]);
      }
    } else {
      var refNode = spans[pos];
      for (i = 0; i < charEls.length; i++) {
        content.insertBefore(charEls[i], refNode);
      }
    }
  };

  this.delete = function(pos, length) {
    var content = this.$('.content')[0];
    var spans = content.childNodes;
    for (var i = length - 1; i >= 0; i--) {
      content.removeChild(spans[pos+i]);
    }
  };
};

Heading.Prototype.prototype = View.prototype;
Heading.prototype = new Heading.Prototype();

// Register
// Surface.registerContentType("heading", Heading);

module.exports = Heading;
