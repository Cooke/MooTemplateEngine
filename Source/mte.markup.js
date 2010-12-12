/*
---
description: An extension to the MTE library to use "HTML" markup to create templates.

license: MIT-style

authors:
  - Henrik Cooke (http://null-tech.com)

provides: 
  - MTEEngine.Markup

requires:
  MTEEngine/0.1: MTEEngine
  core/1.3: Request.HTML

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

        var tag = element.get('tag');
        if (tag == 'bind') {
            return this.bind(element.getProperty('property'), formatters ? formatters[element.getProperty('formatter')] : null);
        }

        var context = [];
        if (element.getProperty('context')) {
            context = [this.context(element.getProperty('context'))];
        }

        var childTemplates = [];
        if (element.getProperty('bind')) {
            childTemplates = [this.bind(element.getProperty('bind'), formatters ? formatters[element.getProperty('formatter')] : null)];
        } else if (element.childNodes) {
            var childElements = Array.from(element.childNodes);
            childTemplates = childElements.map(function (x) { return this.fromElement(x, formatters); }, this);
        }

        var attributes = Array.from(element.attributes).map(function (attr) { return attr.name }); ;
        var options = element.getProperties.apply(element, attributes);
        options = Object.filter(options, function (value, key) { return value && !['bind', 'formatter', 'context'].contains(key); });
        var args = [tag].append(context).append([options]).append(childTemplates);
        return this.tag.apply(this, args);
    }
});