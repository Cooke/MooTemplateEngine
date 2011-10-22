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
- core/1.3: [Class, Class.Extras, Element, Elements, Array, Object]

...
*/

MTEBaseExpression = new Class({
    initialize: function(engine, property) {
        this.engine = engine;
        this.property = property;
    },

    listenForDataContextChanges: function (parent, updateFunc) {
        var currentDataContext = parent.dataContext;
        this._listenDataContextChanges(currentDataContext, updateFunc);        

        parent.dataContextEvents.addEvent('changed', function() {
            this._ignoreDataContextChanges(currentDataContext, updateFunc);
            updateFunc();
            currentDataContext = parent.dataContext;
            this._listenDataContextChanges(currentDataContext, updateFunc);                    
        }.bind(this));
    },

    getData : function (source) {
        if (!source) {
            return '';
        } else if (!this.property || this.property == '.') {
            return source;
        } else if (typeOf(this.property) == 'array') {
            return this.property.map(function (prop) { return source[prop]; });
        } else if (source.get && (source.get(this.property) || source.get(this.property) == 0)) {
            return source.get(this.property)
        } else if (source[this.property] || source[this.property] == 0) {
            return source[this.property];
        } else {
            return '';
        }
    },

    _listenDataContextChanges: function (dataContext, updateFunc) {
        if (this.property && dataContext.listenChange) {
            if (typeOf(this.property) == 'array') {
                this.property.each(function (prop) { dataContext.listenChange(prop, updateFunc); });
            } else {
                dataContext.listenChange(this.property, updateFunc);
            }
        }
    },

    _ignoreDataContextChanges: function (dataContext, updateFunc) {
        if (this.property && dataContext.listenChange) {
            if (typeOf(this.property) == 'array') {
                this.property.each(function (prop) { dataContext.ignoreChange(prop, updateFunc); });
            } else {
                dataContext.ignoreChange(this.property, updateFunc);
            }
        }
    },
});

MTEBindingExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (engine, property, formatter) {
        this.parent(engine, property);
        this.formatter = formatter;
    },

    apply: function (parent) {
        var node = this._createNode(parent);
        parent.adopt(node);

        var updateFunc = function() {
            var newNode = this._createNode(parent);
            parent.replaceChild(newNode, node);
            node = newNode;    
        }.bind(this);

        this.listenForDataContextChanges(parent, updateFunc);
    },

    applyToAttribute: function (parent, attributeProperty) {
        var formatter = this._getFormatter();

        var updateFunc = function() {
            var data = this.getData(parent.dataContext);
            parent.setProperty(attributeProperty, formatter(data, attributeProperty));
        }.bind(this);

        updateFunc();

        this.listenForDataContextChanges(parent, updateFunc);
    },

    _createNode: function (parent) {
        var formatter = this._getFormatter();
        var data = this.getData(parent.dataContext);
        var formattedData = formatter(data);

        var node = formattedData;
        if (!this.engine.adoptable(formattedData)) {
            node = getDocument().newTextNode(formattedData);
        }

        return node;
    },

    _getFormatter : function () {
        return function (x, y) { return this.formatter ? this.formatter(x, y) : x; }.bind(this);
    }
});

MTEDisplayExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (engine, property, template) {
        this.parent(engine, property);
    },

    apply: function(parent) {
        var updateFunc = function() {
            parent.setStyle('display', this.getData(parent.dataContext) ? null : 'none');
        }.bind(this);

        updateFunc();
        this.listenForDataContextChanges(parent, updateFunc);
    }
});

MTEContextExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (engine, property, template) {
        this.parent(engine, property);
    },

    apply: function (element, parent) {
        element.dataContext = this.getData(parent.dataContext);
        element.dataContextEvents = new Events();

        var updateFunc = function() {
            element.dataContext = this.getData(parent.dataContext);
            element.dataContextEvents.fireEvent('changed');
        }.bind(this);

        this.listenForDataContextChanges(parent, updateFunc);
    }
});

MTEListExpression = new Class({
    Extends: MTEBaseExpression, 

    initialize: function(engine, property, itemTemplate) {
        this.engine = engine;
        this.property = property;
        this.itemTemplate = itemTemplate;
    },

    apply: function (parent) {
        var nodes = this._createNodes(parent);
        parent.adopt(nodes);

        var updateFunc = function() {
            var newNodes = this._createNodes(parent);
            parent.empty();
            parent.adopt(newNodes);
        }.bind(this);

        this.listenForDataContextChanges(parent, updateFunc);
    },

    _createNodes: function (parent) {                
        var source = (!parent.dataContext || this.property == '.') ? parent.dataContext : parent.dataContext[this.property];
        if (!source || !source.each) {
            return getDocument().newTextNode('');
        }

        var nodes = new Elements();
        source.each(function (item) {            
            nodes.push(this.itemTemplate.render(item));
        }.bind(this));

        return nodes;
    }
});

MTETemplate = new Class({
    Binds: ['createElement'],

	initialize: function(engine, tag, contextExpression, elementProperties, children) {
        this.engine = engine;
		this.tag = tag;
        this.contextExpression = contextExpression;
        this.elementProperties = elementProperties;
        this.children = children;
    },

    render: function(initialDataContext) {
        var fakeParent = { dataContext: initialDataContext, dataContextEvents: new Events() };
        return this.createElement(fakeParent);
    },

    createElement: function (parent) {
        var engine = this.engine;
        var element = new Element(this.tag);
        this.contextExpression.apply(element, parent);

        Object.each(this.elementProperties, function (item, key) {
            if (instanceOf(item, MTEBindingExpression)) {                
                item.applyToAttribute(element, key);
            } else {
                element.set(key, item);
            }
        });

        Array.each(this.children, function (child) {
            if (instanceOf(child, MTEBindingExpression) || instanceOf(child, MTEDisplayExpression)) {
                child.apply(element);
            } else if (instanceOf(child, MTEListExpression)) {
                child.apply(element);
            } else if (instanceOf(child, MTETemplate)) {
                var out = child.createElement(element);
                if (engine.adoptable(out)) {
                    element.adopt(out);
                } else {
                    element.appendText(out);
                }
            } else if (engine.adoptable(child)) {
                element.adopt(child);
            } else {
                element.appendText(child);
            }
        });

        return element;
    },
});

MTEEngine = new Class({
    Binds: ['tag', 'C', 'context'],

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
	// tag name, context expression, properties of corresponding element, content (templates, bindings, text etc)
    tag: function () {
        var engine = this;
        var args = Object.values(arguments);
        var tag = args.shift();

        var contextExpression = new MTEContextExpression(engine);
        if (instanceOf(args[0], MTEContextExpression)) {
            contextExpression = args.shift();            
        }

        var elementProperties = {};
        if (typeOf(args[0]) == 'object' && !instanceOf(args[0], MTEBaseExpression)) {
            elementProperties = args.shift();
        }

        return new MTETemplate(this, tag, contextExpression, elementProperties, args);
    },

    L: function (prop, itemTemplate) {
        return new MTEListExpression(this, prop, itemTemplate);
    },
    list: function (prop, itemTemplate) {
        return new MTEListExpression(this, prop, itemTemplate);
    },

    B: function (prop, formatter) {
        return new MTEBindingExpression(this, prop, formatter);
    },
    bind: function (prop, formatter) {
        return new MTEBindingExpression(this, prop, formatter);
    },

    display: function(prop, formatter) {
        return new MTEDisplayExpression(this, prop, formatter);
    },

    C: function (prop) {
        return new MTEContextExpression(this, prop);
    },
    context: function (prop) {
        return new MTEContextExpression(this, prop);
    },

    adoptable: function (obj) {
        return ['object', 'collection', 'element', 'elements', 'textnode', 'whitespace'].contains(typeOf(obj));
    }
});

