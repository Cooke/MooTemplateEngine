/*
---
description: A template engine library used to write HTML-templates with JavaScript.

license: MIT-style

authors:
- Henrik Cooke (http://mte.null-tech.com)

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
    initialize: function(property) {
        this.property = property;
    },

    listenForDataContextChanges: function (parent, updateFunc) {
        var lastDataContext = parent.dataContext;
        this._listenDataContextChanges(parent.dataContext, updateFunc);        

        parent.dataContextEvents.addEvent('changed', function() {
            this._ignoreDataContextChanges(lastDataContext, updateFunc);
            updateFunc();
            lastDataContext = parent.dataContext;
            this._listenDataContextChanges(parent.dataContext, updateFunc);                    
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
    }
});

MTEBindingExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (property, formatter) {
        this.parent(property);
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
        if (!MTEUtil.isAdoptable(formattedData)) {
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

    initialize: function (property, formatter) {
        this.formatter = formatter;
        this.parent(property);
    },

    apply: function (parent) {
        var formatter = this._getFormatter();
        var updateFunc = function () {
            var val = formatter(this.getData(parent.dataContext)) ? null : 'none';
            parent.setStyle('display', val);
        } .bind(this);

        updateFunc();
        this.listenForDataContextChanges(parent, updateFunc);
    },

    _getFormatter: function () {
        return function (x, y) { return this.formatter ? this.formatter(x, y) : x; } .bind(this);
    }
});

MTECssStyleExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (property, style, formatter) {
        this.formatter = formatter;
        this.style = style;
        this.parent(property);
    },

    apply: function (parent) {
        var formatter = this._getFormatter();
        var updateFunc = function () {
            var val = formatter(this.getData(parent.dataContext));
            parent.setStyle(this.style, val);
        } .bind(this);

        updateFunc();
        this.listenForDataContextChanges(parent, updateFunc);
    },

    _getFormatter: function () {
        return function (x, y) { return this.formatter ? this.formatter(x, y) : x; } .bind(this);
    }
});

MTEContextExpression = new Class({
    Extends: MTEBaseExpression,

    initialize: function (property, template) {
        this.parent(property);
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

    initialize: function (property, itemTemplate, sortProperty) {
        this.parent(property);
        this.itemTemplate = itemTemplate;
        this.sortProperty = sortProperty;
    },

    apply: function (parent) {
        var keyElementMap = {};
        var lastSourceChangedHandler = null;
        var lastSource = null;

        var bindingSourceChangedHandlerFunc = function () {
            if (lastSource && lastSource.listenChanges && lastSourceChangedHandler) {
                lastSource.ignoreChanges(lastSourceChangedHandler);
            }

            var source = (!parent.dataContext || this.property == '.') ? parent.dataContext : parent.dataContext[this.property];
            keyElementMap = {};
            parent.empty();
            this._createNodes(parent, source, keyElementMap);

            if (source && source.listenChanges) {                
                var self = this;
                lastSourceChangedHandler = function(src, key, val) {
                    self.handleSourceChanged(self, parent, keyElementMap, src, key, val);
                };
                source.listenChanges(lastSourceChangedHandler, false);
            }

            lastSource = source;
        } .bind(this);

        bindingSourceChangedHandlerFunc();
        this.listenForDataContextChanges(parent, bindingSourceChangedHandlerFunc);
    },

    handleSourceChanged: function (self, parent, keyElementMap, source, key, val) {
        if (val) {
            var obj = {};
            obj[key] = val;
            self._createNodes(parent, obj, keyElementMap);
        } else if (keyElementMap[key]) {            
            var oldEl = keyElementMap[key];
            oldEl.destroy();
            delete keyElementMap[key];
        }
    },

    _createNodes: function (parent, source, keyElementMap) {
        if (!source) {
            parent.adopt(getDocument().newTextNode(''));
        } else if (source.each) {
            source.each(function (item, key) {
                this._createNode(parent, keyElementMap, item, key);
            } .bind(this));
        } else if (typeOf(source) == 'object') {
            Object.each(source, function (item, key) {
                this._createNode(parent, keyElementMap, item, key);
            }, this);
        }
    },

    _createNode: function (parent, keyElementMap, item, key) {
        var el = this.itemTemplate.render(item);
        if (this.sortProperty) {
            var otherNodes = parent.getChildren();
            var injectBefore = null;
            for (var i = 0; i < otherNodes.length; i++) {
                if (item.get(this.sortProperty) < otherNodes[i].dataContext.get(this.sortProperty)) {
                    injectBefore = otherNodes[i];
                    break;
                }
            }

            if (!injectBefore) {
                parent.adopt(el);
            } else {
                el.inject(injectBefore, 'before');
            }
        } else {
            parent.adopt(el);
        }

        keyElementMap[key] = el;
    }
});

MTETemplate = new Class({
    Binds: ['createElement'],

    initialize: function (tag, contextExpression, elementProperties, children) {
        this.tag = tag;
        this.contextExpression = contextExpression;
        this.elementProperties = elementProperties;
        this.children = children;
    },

    render: function (initialDataContext) {
        var fakeParent = { dataContext: initialDataContext, dataContextEvents: new Events() };
        return this.createElement(fakeParent);
    },

    createElement: function (parent) {
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
            if (instanceOf(child, MTEBindingExpression) || instanceOf(child, MTEDisplayExpression) || instanceOf(child, MTECssStyleExpression)) {
                child.apply(element);
            } else if (instanceOf(child, MTEListExpression)) {
                child.apply(element);
            } else if (instanceOf(child, MTETemplate) || instanceOf(child, MTETemplateReference)) {
                var out = child.createElement(element);
                if (MTEUtil.isAdoptable(out)) {
                    element.adopt(out);
                } else {
                    element.appendText(out);
                }
            } else if (MTEUtil.isAdoptable(child)) {
                element.adopt(child);
            } else {
                element.appendText(child);
            }
        });

        return element;
    }
});

MTETemplateReference = new Class({
    initialize: function (templatesSolver, template) {
        this.templatesSolver = templatesSolver;
        this.template = template;
    },

    createElement: function (parent) {
        return this.templatesSolver(this.template).createElement(parent);
    }
});

MTEEngine = new Class({
    Binds: ['tag', 'C', 'context'],

    tags: ['a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdo', 'big', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'datalist', 'dd', 'del', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', -'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'keygen', 'kbd', 'label', 'legend', 'li', 'link', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'tt', 'u', 'ul', 'var', 'video', 'wbr', 'xmp'],

    templates: {},

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
        var args = Object.values(arguments);
        var tag = args.shift();

        var contextExpression = new MTEContextExpression();
        if (instanceOf(args[0], MTEContextExpression)) {
            contextExpression = args.shift();
        }

        var elementProperties = {};
        if (typeOf(args[0]) == 'object' && !instanceOf(args[0], MTEBaseExpression)) {
            elementProperties = args.shift();
        }

        return new MTETemplate(tag, contextExpression, elementProperties, args);
    },

    L: function (prop, itemTemplate, sortProperty) {
        return new MTEListExpression(prop, itemTemplate, sortProperty);
    },
    list: function (prop, itemTemplate, sortProperty) {
        return new MTEListExpression(prop, itemTemplate, sortProperty);
    },

    B: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },
    bind: function (prop, formatter) {
        return new MTEBindingExpression(prop, formatter);
    },

    display: function (prop, formatter) {
        return new MTEDisplayExpression(prop, formatter);
    },

    cssStyle: function (prop, style, formatter) {
        return new MTECssStyleExpression(prop, style, formatter);
    },

    C: function (prop) {
        return new MTEContextExpression(prop);
    },
    context: function (prop) {
        return new MTEContextExpression(prop);
    },

    template: function (prop) {
        return new MTETemplateReference(function (x) { return this.templates[x]; }.bind(this), prop);
    }
});

MTEUtil = {
    isAdoptable: function (obj) {
        return ['object', 'collection', 'element', 'elements', 'textnode', 'whitespace'].contains(typeOf(obj));
    }
}