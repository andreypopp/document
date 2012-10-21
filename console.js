$(function() {

  // Util
  // ---------------

  // Render Underscore templates
  _.tpl = function (tpl, ctx) {
    var source = $('script[name='+tpl+']').html();
    return _.template(source, ctx);
  };


  // Commands
  // ---------------

  var SUBSTANCE_COMMANDS = {
    "document": [
      {
        "name": "Insert Section",
        "op": ["insert", {"id": "UNIQUE_ID", "type": "section", "target": "NODE_ID|front|back", "data": {"content": "SECTION_NAME"}}]
      },
      {
        "name": "Insert Text",
        "op": ["insert", {"id": "UNIQUE_ID", "type": "text", "target": "NODE_ID|front|back", "data": {"content": "CONTENT"}}]
      },
      {
        "name": "Update Text (Delta)",
        "op": ["update", {"id": "NODE_ID", "data": [["ret", 5], ["ins", " world!"]]}]
      },
      {
        "name": "Update Section (Properties)",
        "op": ["update", {"id": "NODE_ID", "data": {"content": "NEW_CONTENT"}}]
      },
      {
        "name": "Move Node(s)",
        "op": ["move", {"nodes": ["NODE_ID", "ANOTHER_NODE_ID"], "target": "TARGET_NODE_ID"}]
      },
      {
        "name": "Delete Node(s)",
        "op": ["delete", {"nodes": ["NODE_ID", "ANOTHER_NODE_ID"]}]
      }
    ],

    "annotation": [
      {
        "name": "Insert Annotation",
        "op": ["insert", {"id": "suggestion:1", "type": "suggestion", "node": "text:2", "pos": [4, 5]}]
      },
      {
        "name": "Update Annotation",
        "op": ["update", {"id": "suggestion:1", "type": "suggestion", "node": "text:2", "pos": [5, 10]}]
      }
    ],

    "comment": [
      {
        "name": "Insert Comment (document)",
        "op": ["insert", {"id": "comment:a", "content": "I like this document!"}]
      },
      {
        "name": "Insert Comment (node)",
        "op": ["insert", {"id": "comment:a", "node": "text:2", "content": "Good argumentation."}]
      },
      {
        "name": "Insert Comment (annotation)",
        "op": ["insert", {"id": "comment:a", "node": "text:2", "annotation": "suggestion:1", "content": "A way of saying helo."}]
      },
      {
        "name": "Update comment",
        "op": ["insert", {"id": "comment:a", "content": "A way of saying hello."}]
      }
    ]
  };



  var Router = Backbone.Router.extend({
    initialize: function() {
      // Using this.route, because order matters
      this.route(':document', 'loadDocument', this.loadDocument);
      this.route('new', 'newDocument', this.newDocument);
      this.route('', 'start', app.start);
    },

    newDocument: function() {
      app.document(Math.uuid());
    },

    loadDocument: function(id) {
      app.document(id);
    }
  });


  // Welcome screen
  // ---------------

  var Start = Backbone.View.extend({
    render: function() {
      this.$el.html(_.tpl('start'));
    }
  });


  // The Mothership
  // ---------------

  var Application = Backbone.View.extend({
    events: {
      'change #file': '_loadDocument'
    },

    _loadDocument: function(e) {
      var file = $('#file').val();
      this.document(file);
    },

    initialize: function (options) {
      // Load some data
      // this.document = new Document();
    },

    // Toggle document view
    document: function(file) {
      var that = this;
      loadDocument(file, function(err, rawDoc) {
        var doc = new Substance.Document(rawDoc);
        that.view = new Document({el: '#document', model: doc });
        that.view.render();
      });
    },

    // Toggle Start view
    start: function() {

    },

    // Render application template
    render: function() {
      this.$el.html(_.tpl('application'));
    }
  });


  // Document Visualization
  // ---------------

  var Document = Backbone.View.extend({
    events: {
      'click .operation': '_checkoutOperation',
      'click .apply-operation': '_applyOperation',
      'change #select_scope': '_selectScope',
      'change #select_example': '_selectExample',
      'click .toggle-output': '_toggleOutput',
      'focus .console textarea': '_makeEditable'
    },

    _makeEditable: function() {
      this.$('#command').removeClass('inactive');
      this.$('.apply-operation').addClass('active');
    },

    _toggleOutput: function(e) {
      var view = $(e.currentTarget).attr('data-output');
      
      this.$('.toggle-output').removeClass('active');
      this.$(e.currentTarget).addClass('active');

      if (view === "visualization") {
        this.render();
      } else if (view === "content") {
        this.$('.output .document').html('<textarea class="json">'+JSON.stringify(this.model.content, null, '  ')+'</textarea>');
      } else {
        this.$('.output .document').html('<textarea class="json">'+JSON.stringify(this.model.model, null, '  ')+'</textarea>');
      }
      return false;
    },

    _selectScope: function() {
      this.scope = $('#select_scope').val();
      this.render();
      return false;
    },

    _selectExample: function() {
      this._makeEditable();
      var index = $('#select_example').val();
      if (index === "") {
        $('#command').val('');
        return;
      }

      var op = SUBSTANCE_COMMANDS[this.scope][index];
      $('#command').val(JSON.stringify(op.op, null, '  '));
      return false;
    },

    _applyOperation: function(e) {
      if (!$(e.currentTarget).hasClass('active')) return;
      var op = JSON.parse(this.$('#command').val());

      this.model.apply(op, {
        user: "demo",
        scope: this.scope
      });

      this.sha = this.model.model.refs['master'];
      this.render();
      return false;
    },

    _checkoutOperation: function(e) {
      var sha = $(e.currentTarget).attr('data-sha');
      // Checkout previous version
      this.model.checkout(sha);
      this.sha = sha;
      this.render(); // Re-render it
    },

    initialize: function (options) {
      this.sha = this.model.model.refs['master'];
      this.scope = 'document';
    },

    // Toggle Start view
    start: function() {
      
    },

    // Render application template
    render: function() {
      var operations = this.model.operations('master');

      this.$el.html(_.tpl('document', {
        sha: this.sha,
        operations: operations,
        nodes: this.model.nodes(),
        document: this.model
      }));

      // Get current op
      var op = this.model.model.operations[this.sha];
      
      if (op) $('#command').val(JSON.stringify(op.op, null, '  '));
      this.renderAnnotations();
      this.renderScope();
    },

    renderAnnotations: function() {
      var that = this;
      _.each(this.model.nodes(), function(node) {
        // console.log('rendering annotations for'+ node.id);
        var annotations = that.model.annotations(node.id);
        // console.log('annotations', annotations);
        _.each(annotations, function(a) {
          // console.log('ann', a.pos);
          var elems = $('div[data-id="'+a.node+'"]').children().slice(a.pos[0], a.pos[0] + a.pos[1]);
          elems.addClass(a.type);
        });
      });
    },

    renderScope: function() {
      this.$('#scope').html(_.tpl('scope', {
        scope: this.scope,
        commands: SUBSTANCE_COMMANDS
      }));
    }
  });

  window.app = new Application({el: '#container'});
  app.render();

  app.document('hello.json');

  // Start responding to routes
  window.router = new Router({});

  Backbone.history.start();
});

// Global helpers
// ---------------

function loadDocument(file, cb) {
  $.getJSON('documents/' + file, function(doc) {
    cb(null, doc);
  });
}
