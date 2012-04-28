/*
---
description: Observable data structures for use with the Moo Template Engine.

license: MIT-style

authors:
- Henrik Cooke (http://mte.null-tech.com)

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

    initialize: function (initData) {
        this.update(initData);
    },

    isSpecialProperty: function (property) {
        return ['Binds', 'bindings', 'caller', '$caller', '$events'].contains(property);
    },

    each: function (func, bind) {
        var self = this;

        if (func && bind) {
            func = func.bind(bind);
        }

        Object.each(this, function (value, property) {
            if (!self.isSpecialProperty(property)) {
                func(value, property);
            }
        });
    },

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

        if (oldValue != value) {
            this[prop] = value;
            this.triggerChange(prop, value, oldValue);
        }
    },

    remove: function (prop) {
        var item = this[prop];
        if (item) {
            delete this[prop];
            this.triggerChange(prop, undefined, item);
        }
    },

    update: function (object, remove) {
        Object.each(object, function (value, key) {
            if (this[key] == undefined && typeOf(value) == 'object') {
                var newModel = new MTEObservableObject();
                newModel.update(value);
                this.set(key, newModel);
            } else if (instanceOf(this[key], MTEObservableObject) && typeOf(value) == 'object') {
                this[key].update(value, remove);
                //this.triggerChange(key, this[key], undefined);
            } else if (typeOf(value) == 'array') {
                var newArray = value.map(function (item) {
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

        if (remove) {
            this.each(function (val, key) {
                if (!(key in object)) {
                    this.remove(key);
                }
            }, this);
        }
    }
});
