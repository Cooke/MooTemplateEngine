/*
---
description: Observable data structures for use with the Moo Template Engine.

license: MIT-style

authors:
- Henrik Cooke (http://null-tech.com)

provides: 
- MTEObservableObject
- MTEObservableMap
- MTEObservableArray
- Class.Mutators.MTEObservableAutoProperties

requires:
- core/1.3: [Class, Class.Extras, Element, Elements, Array, Object]

...
*/
MTEObservableObject = new Class({
    Binds: ['listenChange', 'triggerChange', 'get', 'set', 'update', 'listenChanges', 'ignoreChanges'],

    bindings: new Events(),    

    listenChange: function (property, eventHandler, initTrigger) {
        if (initTrigger) {
            eventHandler(this, property, this.get(property), this.get(property));
        }

        this.bindings.addEvent(property, eventHandler);
    },

    listenChanges: function (eventHandler, initTrigger) {
        if (initTrigger) {
            eventHandler(this, '*');
        }

        this.bindings.addEvent('*', eventHandler);
    },

    ignoreChanges: function (eventHandler) {
        this.bindings.removeEvent(eventHandler);
    },

    ignoreChange: function (property, eventHandler) {
        this.bindings.removeEvent(property, eventHandler);
    },

    triggerChange: function (property, value, oldValue) {
        this.bindings.fireEvent(property, [this, property, value, oldValue]);
        this.bindings.fireEvent('*', [this, property, value, oldValue]);
    },

    get: function (property) {
        if (this['get' + property.capitalize()] != null) {
            return this['get' + property.capitalize()]();
        } else {
            return this[property];
        }
    },

    set: function (prop, value) {
        var oldValue = this[prop];
        this[prop] = value;
        this.triggerChange(prop, value, oldValue);
    },

    update: function (object) {
        Object.each(object, function (value, key) {
            key = key.lowerize();            
            
            if (this[key] == undefined && typeOf(value) == 'object') {
                var newModel = new MTEObservableObject();
                newModel.update(value);
                this.set(key, newModel);
            } else if (instanceOf(this[key], MTEObservableObject) && typeOf(value) == 'object') {
                this[key].update(value);                
                this.triggerChange(key, this[key], undefined);
            } else if (typeOf(value) == 'array') {
                var newArray = value.map(function(item) {
                    if (typeOf(item) == 'object') {
                        var newItem = new MTEObservableObject();
                        newItem.update(item);
                        return newItem;
                    } else {
                        return item;
                    }
                });

                this.set(key, newArray);
            } else {
                this.set(key, value);                
            }
        }, this);
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