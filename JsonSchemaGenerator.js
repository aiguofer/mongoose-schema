// This is a Controller mixin to add methods for generating Swagger data.

// __Dependencies__
var mongoose = require('mongoose');
var AbstractSchemaGenerator = require('./AbstractSchemaGenerator');

// __Private Members__

// __Module Definition__
var JsonSchemaGenerator = module.exports = function () {
};

JsonSchemaGenerator.prototype = new AbstractSchemaGenerator();

// A method used to generate a Swagger model definition for a Mongoose Schema
JsonSchemaGenerator.prototype.generate = function (schema) {
   var definition = {};
   definition.properties = this._generateProperties(schema);
   definition.required = this._generateRequired(schema);
   return definition;
}

JsonSchemaGenerator.prototype._generateProperty = function (path, schema) {
   var property = {};
   var method = "_generate" + this._swaggerTypeFor(path.options.type).type;
   if (typeof this[method] === "function") {
      property = this[method](path, schema);
   } else {
      // if no properties then it is Mixed or Buffered,
      property.type = "object";
      property.properties = {};
   }
   return property;
};

JsonSchemaGenerator.prototype._generateProperties = function (schema) {
   var properties = {};
   Object.keys(schema.paths).forEach(function (name) {
      if (!this._getEmbeddedName(name) && this._isIncluded(name, schema.paths[name].options)) {
         // ignore 'private' fields
         if (name.indexOf('_') != 0) {
            var property = this._generateProperty(schema.paths[name], schema);
            properties[name] = property;
         }
      }
   }, this);

   var embeddeds = this._findEmbeddeds(schema);
   for (var key in embeddeds) {
      var property = this._generateEmbedded(embeddeds[key]);
      if (property) {
         properties[key] = property;
      }
   }

   return properties;
};

JsonSchemaGenerator.prototype._generateRequired = function (schema) {
   var required = [];
   Object.keys(schema.paths).forEach(function (name) {
      // only add required for non-embedded paths
      if (!this._getEmbeddedName(name)) {
         if (schema.paths[name].isRequired === true) {
            required.push(schema.paths[name].path);
         }
      }
   }, this);
   return required.length == 0 ? undefined : required;
}

JsonSchemaGenerator.prototype._generateString = function (path, schema) {
   var property = {};
   property.type = "string";
   if (path.options.enum) {
      property.enum = path.options.enum;
   }
   return property;
}

JsonSchemaGenerator.prototype._generateDate = function (path, schema) {
   var property = {};
   property.type = "string";
   return property;
}

JsonSchemaGenerator.prototype._generateBoolean = function (path, schema) {
   var property = {};
   property.type = "boolean";
   return property;
}

JsonSchemaGenerator.prototype._generateNumber = function (path, schema) {
   var property = {};
   property.type = "number";
   if (path.options.min) {
      property.min = path.options.min;
   }
   if (path.options.max) {
      property.min = path.options.max;
   }
   return property;
}

JsonSchemaGenerator.prototype._generateArray = function (path, schema) {
   var property = {};
   property.type = "array";
   var method = "_generateType" + this._swaggerTypeFor(path.options.type[0]).type;
   if (typeof this[method] === "function") {
      property.items = this[method](path);
   }
   return property;
}

JsonSchemaGenerator.prototype._generateEmbedded = function (embedded) {
   var property = {};
   var schema = {paths: {}};
   if (Array.isArray(embedded)) {
      embedded.forEach(function (path) {
         schema.paths[path.path] = path;
      });
   }
   property.type = "object";
   property.required = this._generateRequired(schema);
   property.properties = this._generateProperties(schema);
   return property;
}

JsonSchemaGenerator.prototype._generateObjectId = function (path, schema) {
   var property = {};
   if (path.options && path.options.ref) {
      property.$ref = "#/definitions/" + path.options.ref;
   } else {
      // this is the _id field and can be ignored
   }
   return property;
}

JsonSchemaGenerator.prototype._generateTypeObjectId = function (path) {
   return {'$ref': "#/definitions/" + path.options.type[0].ref};
}

JsonSchemaGenerator.prototype._generateTypeString = function (path) {
   return {type: "string"};
}

JsonSchemaGenerator.prototype._generateTypeMixed = function (path) {
   return {type: "object"};
}

JsonSchemaGenerator.prototype._generateTypeEmbedded = function (path) {
   var schema = this.generate(path.schema);
   schema.type = "object";
   schema.required = this._generateRequired(path.schema);
   return schema;
}