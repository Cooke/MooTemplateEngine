/*
---
description: Observable data structures for use with Moo Template Engine.

license: MIT-style

authors:
- Henrik Cooke (http://null-tech.com)

provides: 
- MTEObservableObject
- MTEObservableMap
- MTEObservableArray
- Class.Mutators.MTEObservableAutoProperties

requires:
- core/1.3:
- Class
- Class.Extras
- Element
- Elements
- Array
- Object
- MTEEngine/0.3:

...
*/
MTEObservableObject = new Class({
    Binds: ['listenChange', 'triggerChange', 'get'],

    isObservable: true,

    bindings: new Events(),

    get: function (property) {
        if (this['get' + property.capitalize()] != null) {
            return this['get' + property.capitalize()]();
        } else {
            return this[property];
        }
    },

    listenChange: function (property, eventHandler, initTrigger) {
        if (initTrigger) {
            eventHandler(this, property, this.get(property));
        }

        this.bindings.addEvent(property, eventHandler);
    },

    triggerChange: function (property, value) {
        this.bindings.fireEvent(property, [this, property, value]);
    }
});

MTEObservableMap = new Class({
    Extends: Events,

    map: {},

    isObservableMap: true,

    set: function (key, item) {
        var oldItem = this.map[key];
        this.map[key] = item;
        if (oldItem) {
            this.fireEvent('change', [item, key, oldItem, this]);
        } else {
            this.fireEvent('set', [item, key, this]);
        }
    },

    clear: function (key) {
        var item = this.map[key];
        if (item) {
            delete this.map[key];
            this.fireEvent('clear', [item, key, this]);
        }
    }
});

MTEObservableArray = new Class({
    Extends: Events,

    items: [],

    isObservableArray: true,

    add: function (item) {
        this.items.push(item);
        this.fireEvent('add', [item, this.items.length - 1, this]);
    },

    remove: function (item) {
        for (var i = this.items.length - 1; i > -1; i--) {
            if (this.items[i] == item) {
                this.items.splice(i, 1);
                this.fireEvent('remove', [item, i, this]);
            }
        }
    }
});

// Can be used to auto implement getter and setter
Class.Mutators.MTEObservableAutoProperties = function (configuration) {
    var setFunction = function (item) {
        return function (value) {
            this[item] = value;
            this.triggerChange(item, value);
        };
    };

    var getFunction = function (item) {
        return function () { return this[item]; };
    };

    configuration.each(function (item) {
        var getName = ('get' + item.capitalize());
        var setName = ('set' + item.capitalize());
        var getterSetter = {};
        getterSetter[getName] = getFunction(item);
        getterSetter[setName] = setFunction(item);
        this.implement(getterSetter);
    }, this);

    this.implement({
        set: function (prop, value) {
            var setName = ('set' + prop.capitalize());
            this[setName](value);
        },
        get: function (prop) {
            var getName = ('get' + prop.capitalize());
            return this[getName]();
        },
        has: function (prop) {
            var getName = ('get' + prop.capitalize());
            return this[getName] != null;
        }
    });
};