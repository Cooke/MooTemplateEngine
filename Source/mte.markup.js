/*
---
description: An extension to the MTEEngine which helps to create templates from HTML.

license: MIT-style

authors:
- Henrik Cooke (http://null-tech.com)

provides: 
- MTEEngine.Markup

requires:
- MTEEngine/0.2
- core/1.3: [Request.HTML]

...
*/


MTEEngine.Markup = new Class({
    Extends: MTEEngine,

    load: function (url, formatters, callback) {
        var engine = this;

        new Request.HTML({
            url: url,
            onSuccess: function (nodeTree) {
                callback(engine.fromElements(nodeTree, formatters));
            }
        }).get();
    },

    fromMarkup: function (markup, formatters) {
        var temp = new Element('div').set('html', markup);
        return this.fromElements(temp.childNodes, formatters);
    },

    fromElements: function (nodeTree, formatters) {
        var engine = this;
        var elementTree = new Elements(nodeTree);
        var result = {};

        elementTree.each(function (el) {
            if (typeOf(el) == 'element' && el.get('id')) {
                result[el.id] = engine.fromElement(el, formatters);
            }
        });

        return result;
    },

    fromElement: function (element, formatters) {
        var type = typeOf(element);

        if (type == 'textnode' || type == 'whitespace') {
            return element.nodeValue;
        }

        var tagName = element.get('tag');

        var context = [];
        var contextProperty = element.getProperty('data-context');
        if (contextProperty) {
            context = [this.context(contextProperty)];
        }

        var formatter = formatters ? formatters[element.getProperty('data-formatter')] : null;

        var childTemplates = [];
        var bindProperty = element.getProperty('data-bind');
        if (bindProperty) {
            childTemplates = [this.bind(this._extractProperties(bindProperty), formatter)];
        } else if (element.childNodes) {
            var childElements = Array.from(element.childNodes);
            childTemplates = childElements.map(function (x) { return this.fromElement(x, formatters); }, this);
        }

        var listProperty = element.getProperty('data-list');
        if (listProperty) {
            var t = this.fromElement(element.getChildren()[0], formatters);
            childTemplates = [this.list(listProperty, t)];
        }

        var attributes = Array.from(element.attributes).map(function (attr) { return attr.name });
        var options = element.getProperties.apply(element, attributes);

        Object.each(options, function (item, key) {
            var match = key.match(/data-bind-(.*)/);
            if (match && match.length == 2) {
                options[match[1]] = this.bind(this._extractProperties(item), formatter);
            }
        }, this);

        var displayProperty = element.getProperty('data-display');
        if (displayProperty) {
            childTemplates.push(this.display(displayProperty, formatter));
        }

        options = Object.filter(options, function (value, key) { return value && !['data-formatter', 'data-context', 'id', 'data-list'].contains(key) && !key.contains('data-bind') });

        var args = [tagName].append(context).append([options]).append(childTemplates);
        return this.tag.apply(this, args);
    },

    _extractProperties: function (bindProperty) {
        if (bindProperty.contains(',')) {
            return Array.map(bindProperty.split(','), function (x) { return x.trim(); });
        } else {
            return bindProperty;
        }
    }
});