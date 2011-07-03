/*
---
description: A template engine library used to write HTML-templates with JavaScript.

license: MIT-style

authors:
- Henrik Cooke (http://null-tech.com)

provides:
- MTEEngine
- MTEBindingExpression
- MTEMultiBindingExpression
- MTEContextExpression
- MTETemplate

requires:
- core/1.3:
  - Class
  - Class.Extras
  - Element
  - Elements
  - Array
  - Object

...
*/

MTEBindingExpression = new Class({
    initialize: function (property, formatter) {
        this.property = property;
        this.formatter = formatter;
    },

    apply: function (engine, element, bindingSource, key) {
        if (engine.observable(bindingSource)) {
            this._observableApply(engine, element, bindingSource, key);
        } else {
            this._regularApply(engine, element, bindingSource, key);
        }
    },

    _getData : function (source) {
        var data;
        if (!this.property || this.property == '.') {
            data = source;
        } else if (source.get) {
            data = source.get(this.property)
        } else {
            data = source[this.property];
        }
        
        if (data == undefined) {
            throw 'Binding error: the binding source property did not return any value (property: ' + this.property + ')';
        }

        return data;
    },

    _getFormatter : function () {
        return function (x) { return this.formatter ? this.formatter(x) : x; }.bind(this);
    },

    _createTextNode : function (bindingSource) {
        var formatter = this._getFormatter();
        var data = this._getData(bindingSource);
        return getDocument().newTextNode(formatter(data));
    },

    _throwIfNoProperty: function () {
        if (!this.property) {
            throw 'Binding error: a binding source property has to be specified when binding against an observable object';
        }
    },

    _observableApply: function (engine, element, bindingSource, key) {
        this._throwIfNoProperty();
        
        this.childElement = this._createTextNode(bindingSource);
        element.adopt(this.childElement);

        this._listenForChanges(bindingSource);        
    },

    _listenForChanges: function(bindingSource) {
        bindingSource.listenChange(this.property, function (source) {
            this._updateChildElement(source);
        }.bind(this));
    },

    _updateChildElement: function (source) {
        var newChildElement = this._createTextNode(source);
        this.childElement.parentNode.replaceChild(newChildElement, this.childElement);
        this.childElement = newChildElement;
    },

    _regularApply: function (engine, element, bindingSource, key) {
        // Throw guards
        if (typeOf(bindingSource) != 'object' && typeOf(bindingSource) != 'array' && this.property && this.property != '.') {
            throw 'Binding error: a binding source property may only be specified when the binding source is an object or an array';
        } else if ((typeOf(bindingSource) == 'object' || typeOf(bindingSource) == 'array') && !this.property) {
            throw 'Binding error: a binding source property must be specified when the binding source is an object or an array';
        } else if ((typeOf(bindingSource) == 'object' || typeOf(bindingSource) == 'array') && !bindingSource[this.property]) {
            throw 'Binding error: the binding source property did not return any value (property: ' + this.property + ')';
        }
        
        var formatter = this._getFormatter();
        var data = this._getData(bindingSource);
        var formattedData = formatter(data);

        if (!key) {
            if (engine.adoptable(formattedData)) {
                element.adopt(formattedData);
            } else {
                element.appendText(formattedData);
            }
        } else {
            element.set(key, formattedData);
        }
    }
});

MTEMultiBindingExpression = new Class({
    Implements: MTEBindingExpression,

    initialize: function (properties, formatter) {        
        this.properties = properties;
        this.formatter = formatter;
    },

    _getData: function (source) {
        var getFunction;
        if (source.get) {            
            getFunction = source.get.bind(source);
        } else {
            getFunction = function (x) { return source[x]; };
        }

        var data = this.properties.map(getFunction);        
        return data;
    },

    _listenForChanges: function(bindingSource) {
        this.properties.each(function (prop) {
            bindingSource.listenChange(prop, function (source) {
                this._updateChildElement(source);
            }.bind(this));
        }, this);        
    },

    _throwIfNoProperty: function () {
        if (!this.properties) {
            throw 'Binding error: a binding source property has to be specified when binding against an observable object';
        }
    },
});

MTEContextExpression = new Class({
    initialize: function (property) {
        this.property = property;
        if (!property) {
            throw 'Binding source error: property of name ' + property + ' but no complex source object';
        }        
    },

    apply: function (data) {
        if (typeOf(data) != 'object' && typeOf(data) != 'array') {
            throw 'Context source error: context must be an indexable type';
        } else if (data[this.property] == undefined) {
            throw 'Context source error: no property of name ' + this.property;
        } else {
            return data[this.property];
        }
    }
});

MTETemplate = new Class({
	initialize: function(renderFunc) {
		this.render = renderFunc;
	}
});

MTEEngine = new Class({
    Binds: ['tag', 'createElement'],

    tags: ['a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdo', 'big', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'datalist', 'dd', 'del', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', -'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'keygen', 'kbd', 'label', 'legend', 'li', 'link', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'tt', 'u', 'ul', 'var', 'video', 'wbr', 'xmp'],

    initialize: function () {
        // Create methods from tags array
        Array.each(this.tags, function (tag) {
            this[tag] = function (options, child) {
                var args = Object.values(arguments);
                args.unshift(tag);
                return this.tag.apply(this, args);
            };
        }, this);
    },

	// Arguments: 
	//tag name, content/child elements and binding expressions
    tag: function () {
        var engine = this;
        var argsin = Object.values(arguments);
        var tag = argsin.shift();

        return new MTETemplate(function (data, parent) {
            var args = argsin;

            // Decide data context
            if (instanceOf(args[0], MTEContextExpression)) {
                args = Array.clone(args);
                data = args.shift().apply(data);
            }

            // Create elements
            if (data && engine.isObservableMap(data)) {
                var itemmap = {};
                var elements = new Elements();

                Object.each(data.map, function (item, key) {
                    var element = engine.createElement(tag, args, item);
                    elements.push(element);
                    itemmap[key] = element;
                });

                data.addEvent('clear', function (item, key) {
                    itemmap[key].destroy();
                    delete itemmap[key];
                });

                data.addEvent('set', function (item, key) {
                    var element = engine.createElement(tag, args, item);
                    parent.adopt(element);
                    itemmap[key] = element;
                });

                return elements;
            } else if (data && engine.isObservableArray(data)) {
                var elements = new Elements();
                var items = new Array();

                Array.each(data.items, function (item) {
                    var element = engine.createElement(tag, args, item);
                    elements.push(element);
                    items.push([item, element]);
                });

                data.addEvent('remove', function (removedItem) {
                    for (var i = items.length - 1; i > -1; i--) {
                        if (items[i][0] == removedItem) {
                            items[i][1].destroy();
                            items.splice(i, 1);
                        }
                    }
                });

                data.addEvent('add', function (item) {
                    var element = engine.createElement(tag, args, item);
                    parent.adopt(element);
                    items.push([item, element]);
                });

                return elements;
            } else if (typeOf(data) == 'array') {
                return new Elements(data.map(function (item) { return engine.createElement(tag, args, item); }));
            } else {
                return engine.createElement(tag, args, data, engine);
            }
        });
    },

    B: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },
    bind: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },

    M: function (props, formatter) {
        return new MTEMultiBindingExpression(props, formatter);
    },
    multibind: function (props, formatter) {                
        return new MTEMultiBindingExpression(props, formatter);
    },

    C: function (prop) {
        return new MTEContextExpression(prop);
    },
    context: function (prop) {
        return new MTEContextExpression(prop);
    },

    createElement: function (tag, argsin, data) {
        var args = argsin;
        var engine = this;

        var element = new Element(tag);

        if (typeOf(args[0]) == 'object' && !instanceOf(args[0], MTEBindingExpression)) {
            args = Array.clone(args);
            var options = args.shift();
            Object.each(options, function (item, key) {
                if (instanceOf(item, MTEBindingExpression)) {
                    item.apply(engine, element, data, key);
                } else {
                    element.set(key, item);
                }
            });
        }

        Array.each(args, function (arg) {
            if (instanceOf(arg, MTEBindingExpression) || instanceOf(arg, MTEMultiBindingExpression)) {
                arg.apply(engine, element, data);
            } else if (instanceOf(arg, MTETemplate)) {
                var out = arg.render(data, element);
                if (engine.adoptable(out)) {
                    element.adopt(out);
                } else {
                    element.appendText(out);
                }
            } else if (engine.adoptable(arg)) {
                element.adopt(arg);
            } else {
                element.appendText(arg);
            }
        });

        return element;
    },

    adoptable: function (obj) {
        return ['object', 'collection', 'element', 'elements', 'textnode', 'whitespace'].contains(typeOf(obj));
    },

    observable: function (obj) {
        return obj && obj.isObservable;
    },

    isObservableMap: function (obj) {
        return obj && obj.isObservableMap;
    },

    isObservableArray: function (obj) {
        return obj && obj.isObservableArray;
    }
});

