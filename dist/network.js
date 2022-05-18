/*!
 * The MIT License (MIT)
 * 
 * Copyright 2017 Thomas Wagenaar <wagenaartje@protonmail.com>. Copyright for
 * portions of Neataptic are held by Copyright 2017 Juan Cazala - cazala.com, as a
 * part of project Synaptic.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE
 * 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["neataptic"] = factory();
	else
		root["neataptic"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 26);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

/*******************************************************************************
                                  METHODS
*******************************************************************************/

var methods = {
  activation: __webpack_require__(4),
  mutation: __webpack_require__(9),
  selection: __webpack_require__(10),
  crossover: __webpack_require__(11),
  cost: __webpack_require__(12),
  gating: __webpack_require__(13),
  connection: __webpack_require__(14),
  rate: __webpack_require__(15)
};

/** Export */
module.exports = methods;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

/*******************************************************************************
                                      CONFIG
*******************************************************************************/

// Config
var config = {
  warnings: false
};

/* Export */
module.exports = config;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/* Export */
module.exports = Node;

/* Import */
var methods = __webpack_require__(0);
var Connection = __webpack_require__(3);
var config = __webpack_require__(1);

/*******************************************************************************
                                         NODE
*******************************************************************************/

function Node (type) {
  this.bias = (type === 'input') ? 0 : Math.random() * 0.2 - 0.1;
  this.squash = methods.activation.LOGISTIC;
  this.type = type || 'hidden';

  this.activation = 0;
  this.state = 0;
  this.old = 0;

  // For dropout
  this.mask = 1;

  // For tracking momentum
  this.previousDeltaBias = 0;

  // Batch training
  this.totalDeltaBias = 0;

  this.connections = {
    in: [],
    out: [],
    gated: [],
    self: new Connection(this, this, 0)
  };

  // Data for backpropagation
  this.error = {
    responsibility: 0,
    projected: 0,
    gated: 0
  };
}

Node.prototype = {
  /**
   * Activates the node
   */
  activate: function (input) {
    // Check if an input is given
    if (typeof input !== 'undefined') {
      this.activation = input;
      return this.activation;
    }

    this.old = this.state;

    // All activation sources coming from the node itself
    this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

    // Activation sources coming from connections
    var i;
    for (i = 0; i < this.connections.in.length; i++) {
      var connection = this.connections.in[i];
      this.state += connection.from.activation * connection.weight * connection.gain;
    }

    const clamp = (x) => {
      const max = Number.MAX_VALUE;

      return x === Infinity
        ? Number.MAX_VALUE
        : x === -Infinity
        ? -Number.MAX_VALUE
        : x;
    }

    // Squash the values received
    this.activation = clamp(this.squash(this.state) * this.mask);
    this.derivative = clamp(this.squash(this.state, true));

    // Update traces
    var nodes = [];
    var influences = [];

    for (i = 0; i < this.connections.gated.length; i++) {
      let conn = this.connections.gated[i];
      let node = conn.to;

      let index = nodes.indexOf(node);
      if (index > -1) {
        influences[index] += conn.weight * conn.from.activation;
      } else {
        nodes.push(node);
        influences.push(conn.weight * conn.from.activation +
          (node.connections.self.gater === this ? node.old : 0));
      }

      // Adjust the gain to this nodes' activation
      conn.gain = this.activation;
    }

    for (i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];

      // Elegibility trace
      connection.elegibility = this.connections.self.gain * this.connections.self.weight *
        connection.elegibility + connection.from.activation * connection.gain;

      // Extended trace
      for (var j = 0; j < nodes.length; j++) {
        let node = nodes[j];
        let influence = influences[j];

        let index = connection.xtrace.nodes.indexOf(node);

        if (index > -1) {
          connection.xtrace.values[index] = node.connections.self.gain * node.connections.self.weight *
            connection.xtrace.values[index] + this.derivative * connection.elegibility * influence;
        } else {
          // Does not exist there yet, might be through mutation
          connection.xtrace.nodes.push(node);
          connection.xtrace.values.push(this.derivative * connection.elegibility * influence);
        }
      }
    }

    return this.activation;
  },

  /**
   * Activates the node without calculating elegibility traces and such
   */
  noTraceActivate: function (input) {
    // Check if an input is given
    if (typeof input !== 'undefined') {
      this.activation = input;
      return this.activation;
    }

    // All activation sources coming from the node itself
    this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

    // Activation sources coming from connections
    var i;
    for (i = 0; i < this.connections.in.length; i++) {
      var connection = this.connections.in[i];
      this.state += connection.from.activation * connection.weight * connection.gain;
    }

    // Squash the values received
    this.activation = this.squash(this.state);

    for (i = 0; i < this.connections.gated.length; i++) {
      this.connections.gated[i].gain = this.activation;
    }

    return this.activation;
  },

  /**
   * Back-propagate the error, aka learn
   */
  propagate: function (rate, momentum, update, target) {
    momentum = momentum || 0;
    rate = rate || 0.3;

    // Error accumulator
    var error = 0;

    // Output nodes get their error from the enviroment
    if (this.type === 'output') {
      this.error.responsibility = this.error.projected = target - this.activation;
    } else { // the rest of the nodes compute their error responsibilities by backpropagation
      // error responsibilities from all the connections projected from this node
      var i;
      for (i = 0; i < this.connections.out.length; i++) {
        let connection = this.connections.out[i];
        let node = connection.to;
        // Eq. 21
        error += node.error.responsibility * connection.weight * connection.gain;
      }

      // Projected error responsibility
      this.error.projected = this.derivative * error;

      // Error responsibilities from all connections gated by this neuron
      error = 0;

      for (i = 0; i < this.connections.gated.length; i++) {
        let conn = this.connections.gated[i];
        let node = conn.to;
        let influence = node.connections.self.gater === this ? node.old : 0;

        influence += conn.weight * conn.from.activation;
        error += node.error.responsibility * influence;
      }

      // Gated error responsibility
      this.error.gated = this.derivative * error;

      // Error responsibility
      this.error.responsibility = this.error.projected + this.error.gated;
    }

    if (this.type === 'constant') return;

    // Adjust all the node's incoming connections
    for (i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];

      let gradient = this.error.projected * connection.elegibility;

      for (var j = 0; j < connection.xtrace.nodes.length; j++) {
        let node = connection.xtrace.nodes[j];
        let value = connection.xtrace.values[j];
        gradient += node.error.responsibility * value;
      }

      // Adjust weight
      let deltaWeight = rate * gradient * this.mask;
      connection.totalDeltaWeight += deltaWeight;
      if (update) {
        connection.totalDeltaWeight += momentum * connection.previousDeltaWeight;
        connection.weight += connection.totalDeltaWeight;
        connection.previousDeltaWeight = connection.totalDeltaWeight;
        connection.totalDeltaWeight = 0;
      }
    }

    // Adjust bias
    var deltaBias = rate * this.error.responsibility;
    this.totalDeltaBias += deltaBias;
    if (update) {
      this.totalDeltaBias += momentum * this.previousDeltaBias;
      this.bias += this.totalDeltaBias;
      this.previousDeltaBias = this.totalDeltaBias;
      this.totalDeltaBias = 0;
    }
  },

  /**
   * Creates a connection from this node to the given node
   */
  connect: function (target, weight) {
    var connections = [];
    if (typeof target.bias !== 'undefined') { // must be a node!
      if (target === this) {
        // Turn on the self connection by setting the weight
        if (this.connections.self.weight !== 0) {
          if (config.warnings) console.warn('This connection already exists!');
        } else {
          this.connections.self.weight = weight || 1;
        }
        connections.push(this.connections.self);
      } else if (this.isProjectingTo(target)) {
        throw new Error('Already projecting a connection to this node!');
      } else {
        let connection = new Connection(this, target, weight);
        target.connections.in.push(connection);
        this.connections.out.push(connection);

        connections.push(connection);
      }
    } else { // should be a group
      for (var i = 0; i < target.nodes.length; i++) {
        let connection = new Connection(this, target.nodes[i], weight);
        target.nodes[i].connections.in.push(connection);
        this.connections.out.push(connection);
        target.connections.in.push(connection);

        connections.push(connection);
      }
    }
    return connections;
  },

  /**
   * Disconnects this node from the other node
   */
  disconnect: function (node, twosided) {
    if (this === node) {
      this.connections.self.weight = 0;
      return;
    }

    for (var i = 0; i < this.connections.out.length; i++) {
      let conn = this.connections.out[i];
      if (conn.to === node) {
        this.connections.out.splice(i, 1);
        let j = conn.to.connections.in.indexOf(conn);
        conn.to.connections.in.splice(j, 1);
        if (conn.gater !== null) conn.gater.ungate(conn);
        break;
      }
    }

    if (twosided) {
      node.disconnect(this);
    }
  },

  /**
   * Make this node gate a connection
   */
  gate: function (connections) {
    if (!Array.isArray(connections)) {
      connections = [connections];
    }

    for (var i = 0; i < connections.length; i++) {
      var connection = connections[i];

      this.connections.gated.push(connection);
      connection.gater = this;
    }
  },

  /**
   * Removes the gates from this node from the given connection(s)
   */
  ungate: function (connections) {
    if (!Array.isArray(connections)) {
      connections = [connections];
    }

    for (var i = connections.length - 1; i >= 0; i--) {
      var connection = connections[i];

      var index = this.connections.gated.indexOf(connection);
      this.connections.gated.splice(index, 1);
      connection.gater = null;
      connection.gain = 1;
    }
  },

  /**
   * Clear the context of the node
   */
  clear: function () {
    for (var i = 0; i < this.connections.in.length; i++) {
      var connection = this.connections.in[i];

      connection.elegibility = 0;
      connection.xtrace = {
        nodes: [],
        values: []
      };
    }

    for (i = 0; i < this.connections.gated.length; i++) {
      let conn = this.connections.gated[i];
      conn.gain = 0;
    }

    this.error.responsibility = this.error.projected = this.error.gated = 0;
    this.old = this.state = this.activation = 0;
  },

  /**
   * Mutates the node with the given method
   */
  mutate: function (method) {
    if (typeof method === 'undefined') {
      throw new Error('No mutate method given!');
    } else if (!(method.name in methods.mutation)) {
      throw new Error('This method does not exist!');
    }

    switch (method) {
      case methods.mutation.MOD_ACTIVATION:
        // Can't be the same squash
        var squash = method.allowed[(method.allowed.indexOf(this.squash) + Math.floor(Math.random() * (method.allowed.length - 1)) + 1) % method.allowed.length];
        this.squash = squash;
        break;
      case methods.mutation.MOD_BIAS:
        var modification = Math.random() * (method.max - method.min) + method.min;
        this.bias += modification;
        break;
    }
  },

  /**
   * Checks if this node is projecting to the given node
   */
  isProjectingTo: function (node) {
    if (node === this && this.connections.self.weight !== 0) return true;

    for (var i = 0; i < this.connections.out.length; i++) {
      var conn = this.connections.out[i];
      if (conn.to === node) {
        return true;
      }
    }
    return false;
  },

  /**
   * Checks if the given node is projecting to this node
   */
  isProjectedBy: function (node) {
    if (node === this && this.connections.self.weight !== 0) return true;

    for (var i = 0; i < this.connections.in.length; i++) {
      var conn = this.connections.in[i];
      if (conn.from === node) {
        return true;
      }
    }

    return false;
  },

  /**
   * Converts the node to a json object
   */
  toJSON: function () {
    var json = {
      bias: this.bias,
      type: this.type,
      squash: this.squash.name,
      mask: this.mask
    };

    return json;
  }
};

/**
 * Convert a json object to a node
 */
Node.fromJSON = function (json) {
  var node = new Node();
  node.bias = json.bias;
  node.type = json.type;
  node.mask = json.mask;
  node.squash = methods.activation[json.squash];

  return node;
};


/***/ }),
/* 3 */
/***/ (function(module, exports) {

/* Export */
module.exports = Connection;

/*******************************************************************************
                                      CONNECTION
*******************************************************************************/

function Connection (from, to, weight) {
  this.from = from;
  this.to = to;
  this.gain = 1;

  this.weight = (typeof weight === 'undefined') ? Math.random() * 0.2 - 0.1 : weight;

  this.gater = null;
  this.elegibility = 0;

  // For tracking momentum
  this.previousDeltaWeight = 0;

  // Batch training
  this.totalDeltaWeight = 0;

  this.xtrace = {
    nodes: [],
    values: []
  };
}

Connection.prototype = {
  /**
   * Converts the connection to a json object
   */
  toJSON: function () {
    var json = {
      weight: this.weight
    };

    return json;
  }
};

/**
 * Returns an innovation ID
 * https://en.wikipedia.org/wiki/Pairing_function (Cantor pairing function)
 */
Connection.innovationID = function (a, b) {
  return 1 / 2 * (a + b) * (a + b + 1) + b;
};


/***/ }),
/* 4 */
/***/ (function(module, exports) {

/*******************************************************************************
                                  ACTIVATION FUNCTIONS
*******************************************************************************/

// https://en.wikipedia.org/wiki/Activation_function
// https://stats.stackexchange.com/questions/115258/comprehensive-list-of-activation-functions-in-neural-networks-with-pros-cons
var activation = {
  LOGISTIC: function (x, derivate) {
    var fx = 1 / (1 + Math.exp(-x));
    if (!derivate) return fx;
    return fx * (1 - fx);
  },
  TANH: function (x, derivate) {
    if (derivate) return 1 - Math.pow(Math.tanh(x), 2);
    return Math.tanh(x);
  },
  IDENTITY: function (x, derivate) {
    return derivate ? 1 : x;
  },
  STEP: function (x, derivate) {
    return derivate ? 0 : x > 0 ? 1 : 0;
  },
  RELU: function (x, derivate) {
    if (derivate) return x > 0 ? 1 : 0;
    return x > 0 ? x : 0;
  },
  SOFTSIGN: function (x, derivate) {
    var d = 1 + Math.abs(x);
    if (derivate) return x / Math.pow(d, 2);
    return x / d;
  },
  SINUSOID: function (x, derivate) {
    if (derivate) return Math.cos(x);
    return Math.sin(x);
  },
  GAUSSIAN: function (x, derivate) {
    var d = Math.exp(-Math.pow(x, 2));
    if (derivate) return -2 * x * d;
    return d;
  },
  BENT_IDENTITY: function (x, derivate) {
    var d = Math.sqrt(Math.pow(x, 2) + 1);
    if (derivate) return x / (2 * d) + 1;
    return (d - 1) / 2 + x;
  },
  BIPOLAR: function (x, derivate) {
    return derivate ? 0 : x > 0 ? 1 : -1;
  },
  BIPOLAR_SIGMOID: function (x, derivate) {
    var d = 2 / (1 + Math.exp(-x)) - 1;
    if (derivate) return 1 / 2 * (1 + d) * (1 - d);
    return d;
  },
  HARD_TANH: function (x, derivate) {
    if (derivate) return x > -1 && x < 1 ? 1 : 0;
    return Math.max(-1, Math.min(1, x));
  },
  ABSOLUTE: function (x, derivate) {
    if (derivate) return x < 0 ? -1 : 1;
    return Math.abs(x);
  },
  INVERSE: function (x, derivate) {
    if (derivate) return -1;
    return 1 - x;
  },
  // https://arxiv.org/pdf/1706.02515.pdf
  SELU: function (x, derivate) {
    var alpha = 1.6732632423543772848170429916717;
    var scale = 1.0507009873554804934193349852946;
    var fx = x > 0 ? x : alpha * Math.exp(x) - alpha;
    if (derivate) { return x > 0 ? scale : (fx + alpha) * scale; }
    return fx * scale;
  }
};

/* Export */
module.exports = activation;


/***/ }),
/* 5 */,
/* 6 */,
/* 7 */,
/* 8 */,
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

/* Import */
var activation = __webpack_require__(4);

/*******************************************************************************
                                      MUTATION
*******************************************************************************/

// https://en.wikipedia.org/wiki/mutation_(genetic_algorithm)
var mutation = {
  ADD_NODE: {
    name: 'ADD_NODE'
  },
  SUB_NODE: {
    name: 'SUB_NODE',
    keep_gates: true
  },
  ADD_CONN: {
    name: 'ADD_CONN'
  },
  SUB_CONN: {
    name: 'REMOVE_CONN'
  },
  MOD_WEIGHT: {
    name: 'MOD_WEIGHT',
    min: -1,
    max: 1
  },
  MOD_BIAS: {
    name: 'MOD_BIAS',
    min: -1,
    max: 1
  },
  MOD_ACTIVATION: {
    name: 'MOD_ACTIVATION',
    mutateOutput: true,
    allowed: [
      activation.LOGISTIC,
      activation.TANH,
      activation.RELU,
      activation.IDENTITY,
      activation.STEP,
      activation.SOFTSIGN,
      activation.SINUSOID,
      activation.GAUSSIAN,
      activation.BENT_IDENTITY,
      activation.BIPOLAR,
      activation.BIPOLAR_SIGMOID,
      activation.HARD_TANH,
      activation.ABSOLUTE,
      activation.INVERSE,
      activation.SELU
    ]
  },
  ADD_SELF_CONN: {
    name: 'ADD_SELF_CONN'
  },
  SUB_SELF_CONN: {
    name: 'SUB_SELF_CONN'
  },
  ADD_GATE: {
    name: 'ADD_GATE'
  },
  SUB_GATE: {
    name: 'SUB_GATE'
  },
  ADD_BACK_CONN: {
    name: 'ADD_BACK_CONN'
  },
  SUB_BACK_CONN: {
    name: 'SUB_BACK_CONN'
  },
  SWAP_NODES: {
    name: 'SWAP_NODES',
    mutateOutput: true
  }
};

mutation.ALL = [
  mutation.ADD_NODE,
  mutation.SUB_NODE,
  mutation.ADD_CONN,
  mutation.SUB_CONN,
  mutation.MOD_WEIGHT,
  mutation.MOD_BIAS,
  mutation.MOD_ACTIVATION,
  mutation.ADD_GATE,
  mutation.SUB_GATE,
  mutation.ADD_SELF_CONN,
  mutation.SUB_SELF_CONN,
  mutation.ADD_BACK_CONN,
  mutation.SUB_BACK_CONN,
  mutation.SWAP_NODES
];

mutation.FFW = [
  mutation.ADD_NODE,
  mutation.SUB_NODE,
  mutation.ADD_CONN,
  mutation.SUB_CONN,
  mutation.MOD_WEIGHT,
  mutation.MOD_BIAS,
  mutation.MOD_ACTIVATION,
  mutation.SWAP_NODES
];

/* Export */
module.exports = mutation;


/***/ }),
/* 10 */
/***/ (function(module, exports) {

/*******************************************************************************
                                      SELECTION
*******************************************************************************/

// https://en.wikipedia.org/wiki/Selection_(genetic_algorithm)

var selection = {
  FITNESS_PROPORTIONATE: {
    name: 'FITNESS_PROPORTIONATE'
  },
  POWER: {
    name: 'POWER',
    power: 4
  },
  TOURNAMENT: {
    name: 'TOURNAMENT',
    size: 5,
    probability: 0.5
  }
};

/* Export */
module.exports = selection;


/***/ }),
/* 11 */
/***/ (function(module, exports) {

/*******************************************************************************
                                      CROSSOVER
*******************************************************************************/

// https://en.wikipedia.org/wiki/Crossover_(genetic_algorithm)
var crossover = {
  SINGLE_POINT: {
    name: 'SINGLE_POINT',
    config: [0.4]
  },
  TWO_POINT: {
    name: 'TWO_POINT',
    config: [0.4, 0.9]
  },
  UNIFORM: {
    name: 'UNIFORM'
  },
  AVERAGE: {
    name: 'AVERAGE'
  }
};

/* Export */
module.exports = crossover;


/***/ }),
/* 12 */
/***/ (function(module, exports) {

/*******************************************************************************
                                    COST FUNCTIONS
*******************************************************************************/

// https://en.wikipedia.org/wiki/Loss_function
var cost = {
  // Cross entropy error
  CROSS_ENTROPY: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      // Avoid negative and zero numbers, use 1e-15 http://bit.ly/2p5W29A
      error -= target[i] * Math.log(Math.max(output[i], 1e-15)) + (1 - target[i]) * Math.log(1 - Math.max(output[i], 1e-15));
    }
    return error / output.length;
  },
  // Mean Squared Error
  MSE: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      error += Math.pow(target[i] - output[i], 2);
    }

    return error / output.length;
  },
  // Binary error
  BINARY: function (target, output) {
    var misses = 0;
    for (var i = 0; i < output.length; i++) {
      misses += Math.round(target[i] * 2) !== Math.round(output[i] * 2);
    }

    return misses;
  },
  // Mean Absolute Error
  MAE: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      error += Math.abs(target[i] - output[i]);
    }

    return error / output.length;
  },
  // Mean Absolute Percentage Error
  MAPE: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      error += Math.abs((output[i] - target[i]) / Math.max(target[i], 1e-15));
    }

    return error / output.length;
  },
  // Mean Squared Logarithmic Error
  MSLE: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      error += Math.log(Math.max(target[i], 1e-15)) - Math.log(Math.max(output[i], 1e-15));
    }

    return error;
  },
  // Hinge loss, for classifiers
  HINGE: function (target, output) {
    var error = 0;
    for (var i = 0; i < output.length; i++) {
      error += Math.max(0, 1 - target[i] * output[i]);
    }

    return error;
  }
};

/* Export */
module.exports = cost;


/***/ }),
/* 13 */
/***/ (function(module, exports) {

/*******************************************************************************
                                    GATING
*******************************************************************************/

// Specifies how to gate a connection between two groups of multiple neurons
var gating = {
  OUTPUT: {
    name: 'OUTPUT'
  },
  INPUT: {
    name: 'INPUT'
  },
  SELF: {
    name: 'SELF'
  }
};

/* Export */
module.exports = gating;


/***/ }),
/* 14 */
/***/ (function(module, exports) {

/*******************************************************************************
                                    CONNECTION
*******************************************************************************/

// Specifies in what manner two groups are connected
var connection = {
  ALL_TO_ALL: {
    name: 'OUTPUT'
  },
  ALL_TO_ELSE: {
    name: 'INPUT'
  },
  ONE_TO_ONE: {
    name: 'SELF'
  }
};

/* Export */
module.exports = connection;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

/*******************************************************************************
                                      RATE
*******************************************************************************/

// https://stackoverflow.com/questions/30033096/what-is-lr-policy-in-caffe/30045244
var rate = {
  FIXED: function () {
    var func = function (baseRate, iteration) { return baseRate; };
    return func;
  },
  STEP: function (gamma, stepSize) {
    gamma = gamma || 0.9;
    stepSize = stepSize || 100;

    var func = function (baseRate, iteration) {
      return baseRate * Math.pow(gamma, Math.floor(iteration / stepSize));
    };

    return func;
  },
  EXP: function (gamma) {
    gamma = gamma || 0.999;

    var func = function (baseRate, iteration) {
      return baseRate * Math.pow(gamma, iteration);
    };

    return func;
  },
  INV: function (gamma, power) {
    gamma = gamma || 0.001;
    power = power || 2;

    var func = function (baseRate, iteration) {
      return baseRate * Math.pow(1 + gamma * iteration, -power);
    };

    return func;
  }
};

/* Export */
module.exports = rate;


/***/ }),
/* 16 */,
/* 17 */,
/* 18 */,
/* 19 */,
/* 20 */,
/* 21 */,
/* 22 */,
/* 23 */,
/* 24 */,
/* 25 */,
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

/* Export */
module.exports = Network

/* Import */
var methods = __webpack_require__(0)
var Connection = __webpack_require__(3)
var config = __webpack_require__(1)
var Node = __webpack_require__(2)

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


/***/ })
/******/ ]);
});