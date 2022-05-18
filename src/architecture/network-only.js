/* Export */
module.exports = Network

/* Import */
var methods = require('../methods/methods')
var Connection = require('./connection')
var config = require('../config')
var Node = require('./node')

/*******************************************************************************
                                 NETWORK
*******************************************************************************/

function Network (input, output) {
  if (typeof input === 'undefined' || typeof output === 'undefined') {
    throw new Error('No input or output size given');
  }

  this.input = input;
  this.output = output;

  // Store all the node and connection genes
  this.nodes = []; // Stored in activation order
  this.connections = [];
  this.gates = [];
  this.selfconns = [];
  this.stop = false; // early terminate flag for training

  // Regularization
  this.dropout = 0;

  // Create input and output nodes
  var i;
  for (i = 0; i < this.input + this.output; i++) {
    var type = i < this.input ? 'input' : 'output';
    this.nodes.push(new Node(type));
  }

  // Connect input nodes with output nodes directly
  for (i = 0; i < this.input; i++) {
    for (var j = this.input; j < this.output + this.input; j++) {
      // https://stats.stackexchange.com/a/248040/147931
      var weight = Math.random() * this.input * Math.sqrt(2 / this.input);
      this.connect(this.nodes[i], this.nodes[j], weight);
    }
  }
}

Network.prototype = {
  /**
   * Activates the network
   */
  activate: function (input, training) {
    var output = [];

    // Activate nodes chronologically
    for (var i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].type === 'input') {
        this.nodes[i].activate(input[i]);
      } else if (this.nodes[i].type === 'output') {
        var activation = this.nodes[i].activate();
        output.push(activation);
      } else {
        if (training) this.nodes[i].mask = Math.random() < this.dropout ? 0 : 1;
        this.nodes[i].activate();
      }
    }

    return output;
  },

  /**
   * Clear the context of the network
   */
  clear: function () {
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].clear();
    }
  },

  /**
   * Connects the from node to the to node
   */
  connect: function (from, to, weight) {
    var connections = from.connect(to, weight);

    for (var i = 0; i < connections.length; i++) {
      var connection = connections[i];
      if (from !== to) {
        this.connections.push(connection);
      } else {
        this.selfconns.push(connection);
      }
    }

    return connections;
  },

  /**
   * Disconnects the from node from the to node
   */
  disconnect: function (from, to) {
    // Delete the connection in the network's connection array
    var connections = from === to ? this.selfconns : this.connections;

    for (var i = 0; i < connections.length; i++) {
      var connection = connections[i];
      if (connection.from === from && connection.to === to) {
        if (connection.gater !== null) this.ungate(connection);
        connections.splice(i, 1);
        break;
      }
    }

    // Delete the connection at the sending and receiving neuron
    from.disconnect(to);
  },

  /**
   * Gate a connection with a node
   */
  gate: function (node, connection) {
    if (this.nodes.indexOf(node) === -1) {
      throw new Error('This node is not part of the network!');
    } else if (connection.gater != null) {
      if (config.warnings) console.warn('This connection is already gated!');
      return;
    }
    node.gate(connection);
    this.gates.push(connection);
  },

  /**
   * Convert the network to a json object
   */
  toJSON: function () {
    var json = {
      nodes: [],
      connections: [],
      input: this.input,
      output: this.output,
      dropout: this.dropout
    };

    // So we don't have to use expensive .indexOf()
    var i;
    for (i = 0; i < this.nodes.length; i++) {
      this.nodes[i].index = i;
    }

    for (i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      let tojson = node.toJSON();
      tojson.index = i;
      json.nodes.push(tojson);

      if (node.connections.self.weight !== 0) {
        let tojson = node.connections.self.toJSON();
        tojson.from = i;
        tojson.to = i;

        tojson.gater = node.connections.self.gater != null ? node.connections.self.gater.index : null;
        json.connections.push(tojson);
      }
    }

    for (i = 0; i < this.connections.length; i++) {
      let conn = this.connections[i];
      let tojson = conn.toJSON();
      tojson.from = conn.from.index;
      tojson.to = conn.to.index;

      tojson.gater = conn.gater != null ? conn.gater.index : null;

      json.connections.push(tojson);
    }

    return json;
  },

  /**
   * Sets the value of a property for every node in this network
   */
  set: function (values) {
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].bias = values.bias || this.nodes[i].bias;
      this.nodes[i].squash = values.squash || this.nodes[i].squash;
    }
  },

  /**
   * Creates a standalone function of the network which can be run without the
   * need of a library
   */
  standalone: function () {
    var present = [];
    var activations = [];
    var states = [];
    var lines = [];
    var functions = [];

    var i;
    for (i = 0; i < this.input; i++) {
      var node = this.nodes[i];
      activations.push(node.activation);
      states.push(node.state);
    }

    lines.push('for(var i = 0; i < input.length; i++) A[i] = input[i];');

    // So we don't have to use expensive .indexOf()
    for (i = 0; i < this.nodes.length; i++) {
      this.nodes[i].index = i;
    }

    for (i = this.input; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      activations.push(node.activation);
      states.push(node.state);

      var functionIndex = present.indexOf(node.squash.name);

      if (functionIndex === -1) {
        functionIndex = present.length;
        present.push(node.squash.name);
        functions.push(node.squash.toString());
      }

      var incoming = [];
      for (var j = 0; j < node.connections.in.length; j++) {
        var conn = node.connections.in[j];
        var computation = `A[${conn.from.index}] * ${conn.weight}`;

        if (conn.gater != null) {
          computation += ` * A[${conn.gater.index}]`;
        }

        incoming.push(computation);
      }

      if (node.connections.self.weight) {
        let conn = node.connections.self;
        let computation = `S[${i}] * ${conn.weight}`;

        if (conn.gater != null) {
          computation += ` * A[${conn.gater.index}]`;
        }

        incoming.push(computation);
      }

      var line1 = `S[${i}] = ${incoming.join(' + ')} + ${node.bias};`;
      var line2 = `A[${i}] = F[${functionIndex}](S[${i}])${!node.mask ? ' * ' + node.mask : ''};`;
      lines.push(line1);
      lines.push(line2);
    }

    var output = [];
    for (i = this.nodes.length - this.output; i < this.nodes.length; i++) {
      output.push(`A[${i}]`);
    }

    output = `return [${output.join(',')}];`;
    lines.push(output);

    var total = '';
    total += `var F = [${functions.toString()}];\r\n`;
    total += `var A = [${activations.toString()}];\r\n`;
    total += `var S = [${states.toString()}];\r\n`;
    total += `function activate(input){\r\n${lines.join('\r\n')}\r\n}`;

    return total;
  },
}

/**
 * Convert a json object to a network
 */
Network.fromJSON = function (json) {
  var network = new Network(json.input, json.output);
  network.dropout = json.dropout;
  network.nodes = [];
  network.connections = [];

  var i;
  for (i = 0; i < json.nodes.length; i++) {
    network.nodes.push(Node.fromJSON(json.nodes[i]));
  }

  for (i = 0; i < json.connections.length; i++) {
    var conn = json.connections[i];

    var connection = network.connect(network.nodes[conn.from], network.nodes[conn.to])[0];
    connection.weight = conn.weight;

    if (conn.gater != null) {
      network.gate(network.nodes[conn.gater], connection);
    }
  }

  return network;
};
